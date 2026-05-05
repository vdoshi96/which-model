import { curatedCatalogSchema, type CuratedCatalog } from "./schema";

export type CatalogValidationResult =
  | { ok: true; errors: []; warnings: string[] }
  | { ok: false; errors: string[]; warnings: string[] };

export function validateCuratedCatalog(
  catalog: unknown,
): CatalogValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const schemaResult = curatedCatalogSchema.safeParse(catalog);

  if (!schemaResult.success) {
    errors.push(...schemaResult.error.issues.map((issue) => issue.message));
    return { ok: false, errors, warnings };
  }

  const parsedCatalog = schemaResult.data;
  const benchmarkIds = new Set(
    parsedCatalog.benchmarks.map((benchmark) => benchmark.id),
  );
  const modelIds = new Set(parsedCatalog.models.map((model) => model.id));

  addDuplicateErrors(
    errors,
    parsedCatalog.benchmarks.map((benchmark) => benchmark.id),
    "benchmark id",
  );
  addDuplicateErrors(
    errors,
    parsedCatalog.models.map((model) => model.id),
    "model id",
  );
  addDuplicateErrors(
    errors,
    parsedCatalog.sources.map((source) => source.id),
    "source id",
  );

  addDuplicateScoreErrors(errors, parsedCatalog);
  addSourceRegistryErrors(errors, parsedCatalog);

  for (const score of parsedCatalog.scores) {
    if (!modelIds.has(score.modelId)) {
      errors.push(`Unknown model id "${score.modelId}" in score row`);
    }

    if (!benchmarkIds.has(score.benchmarkId)) {
      errors.push(
        `Unknown benchmark id "${score.benchmarkId}" in score row for ${score.modelId}`,
      );
    }
  }

  for (const model of parsedCatalog.models.filter(
    (entry) => entry.status === "frontier",
  )) {
    if (
      model.contextWindow === null ||
      model.costInputPer1M === null ||
      model.costOutputPer1M === null
    ) {
      errors.push(`Frontier model "${model.id}" is missing cost/context metadata`);
    }

    if (model.sourceUrls.length === 0) {
      errors.push(`Frontier model "${model.id}" is missing source URLs`);
    }

    if (model.lastVerified.length === 0) {
      errors.push(`Frontier model "${model.id}" is missing verification date`);
    }
  }

  addCoverageWarnings(warnings, parsedCatalog);

  return errors.length === 0
    ? { ok: true, errors: [], warnings }
    : { ok: false, errors, warnings };
}

function addDuplicateErrors(
  errors: string[],
  values: string[],
  label: string,
) {
  const seen = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      errors.push(`Duplicate ${label} "${value}"`);
      continue;
    }

    seen.add(value);
  }
}

function addDuplicateScoreErrors(
  errors: string[],
  catalog: CuratedCatalog,
) {
  const seen = new Set<string>();

  for (const score of catalog.scores) {
    const key = `${score.modelId}\u0000${score.benchmarkId}`;

    if (seen.has(key)) {
      errors.push(
        `Duplicate score row for model "${score.modelId}" and benchmark "${score.benchmarkId}"`,
      );
      continue;
    }

    seen.add(key);
  }
}

function addSourceRegistryErrors(
  errors: string[],
  catalog: CuratedCatalog,
) {
  const sourcePageIds: string[] = [];
  const sourcePageUrls: string[] = [];
  const sourceOptionIds: string[] = [];
  const registeredPageUrls = new Set(
    catalog.sources.flatMap((source) => source.pages.map((page) => page.url)),
  );

  for (const source of catalog.sources) {
    if (!isDateOnly(source.lastVerified)) {
      errors.push(
        `Source "${source.id}" has invalid lastVerified date "${source.lastVerified}"`,
      );
    }

    if (source.pages.length === 0) {
      errors.push(`Source "${source.id}" has no registered pages`);
    }

    for (const page of source.pages) {
      sourcePageIds.push(page.id);
      sourcePageUrls.push(page.url);

      if (page.sourceCategoryLabels.length === 0) {
        errors.push(`Source page "${page.id}" has no source category labels`);
      }

      if (page.stats && !isDateOnly(page.stats.asOf)) {
        errors.push(
          `Source page "${page.id}" has invalid stats.asOf date "${page.stats.asOf}"`,
        );
      }

      if (page.filters.length === 0) {
        errors.push(`Source page "${page.id}" has no registered filters`);
      }

      for (const filter of page.filters) {
        const optionCount = filter.options?.length ?? 0;

        for (const option of filter.options ?? []) {
          sourceOptionIds.push(`${page.id}:${option.id}`);
        }

        if (filter.kind === "range" && !filter.range) {
          errors.push(
            `Source page "${page.id}" filter "${filter.id}" is missing a range`,
          );
        }

        if (filter.kind === "range" && optionCount > 0) {
          errors.push(
            `Source page "${page.id}" filter "${filter.id}" is a range filter but also has options`,
          );
        }

        if (filter.kind === "range" && filter.range) {
          if (filter.range.min > filter.range.max) {
            errors.push(
              `Source page "${page.id}" filter "${filter.id}" has min greater than max`,
            );
          }
        }

        if (filter.kind !== "range" && optionCount === 0) {
          errors.push(
            `Source page "${page.id}" filter "${filter.id}" is missing options`,
          );
        }

        if (filter.kind !== "range" && filter.range) {
          errors.push(
            `Source page "${page.id}" filter "${filter.id}" is not a range filter but has a range`,
          );
        }

        if (filter.optionCount !== undefined && optionCount > filter.optionCount) {
          errors.push(
            `Source page "${page.id}" filter "${filter.id}" has more options than its declared optionCount`,
          );
        }

        if (filter.kind === "leaderboard_page") {
          for (const option of filter.options ?? []) {
            if (option.url && !registeredPageUrls.has(option.url)) {
              errors.push(
                `Source page "${page.id}" leaderboard option "${option.id}" points to unregistered page URL "${option.url}"`,
              );
            }
          }
        }
      }
    }
  }

  addDuplicateErrors(errors, sourcePageIds, "source page id");
  addDuplicateErrors(errors, sourcePageUrls, "source page URL");
  addDuplicateErrors(errors, sourceOptionIds, "source option id");
}

function isDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function addCoverageWarnings(
  warnings: string[],
  catalog: CuratedCatalog,
) {
  const coveredBenchmarkIds = new Set(
    catalog.scores.map((score) => score.benchmarkId),
  );
  const categoriesByModel = new Map<string, Set<string>>();

  for (const score of catalog.scores) {
    const benchmark = catalog.benchmarks.find(
      (entry) => entry.id === score.benchmarkId,
    );

    if (!benchmark) {
      continue;
    }

    const categories =
      categoriesByModel.get(score.modelId) ?? new Set<string>();
    categories.add(benchmark.category);
    categoriesByModel.set(score.modelId, categories);
  }

  for (const benchmark of catalog.benchmarks) {
    if (!coveredBenchmarkIds.has(benchmark.id)) {
      warnings.push(
        `No score rows cover benchmark "${benchmark.id}" (${benchmark.category})`,
      );
    }
  }

  const benchmarkCategories = [
    ...new Set(catalog.benchmarks.map((benchmark) => benchmark.category)),
  ];

  for (const model of catalog.models) {
    const categories = categoriesByModel.get(model.id) ?? new Set<string>();

    for (const category of benchmarkCategories) {
      if (!categories.has(category)) {
        warnings.push(
          `Model "${model.id}" has no score rows for benchmark category "${category}"`,
        );
      }
    }
  }
}
