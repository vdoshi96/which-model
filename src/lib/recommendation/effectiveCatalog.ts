import { loadCuratedCatalog } from "@/lib/curatedCatalog/loadCatalog";
import type {
  BenchmarkCategory,
  BenchmarkDefinition,
  CuratedCatalog,
  CuratedCatalogModel,
  ModelBenchmarkScore,
} from "@/lib/curatedCatalog/schema";
import { normalizePercentageScore } from "@/lib/benchmarkSources/normalization";

type LiveScoreRow = {
  source: string;
  dimension: string;
  score: number;
  rawLabel: string | null;
  fetchedAt?: Date | null;
};

type LiveModelRow = {
  name: string;
  provider: string;
  contextWindow: number | null;
  costInputPer1M: number | null;
  costOutputPer1M: number | null;
  scores?: LiveScoreRow[] | null;
};

type EffectiveCatalogPrisma = {
  model?: {
    findMany: (args: {
      include: { scores: boolean };
      orderBy: Array<{ provider: "asc" } | { name: "asc" }>;
    }) => Promise<LiveModelRow[]>;
  };
};

const SOURCE_URLS: Record<string, string> = {
  aider_polyglot: "https://aider.chat/docs/leaderboards/",
  artificial_analysis: "https://artificialanalysis.ai/models",
  bfcl: "https://gorilla.cs.berkeley.edu/leaderboard.html",
  hf_leaderboard: "https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard",
  livebench: "https://livebench.ai/",
  lmsys_arena: "https://lmarena.ai/",
  swe_bench: "https://www.swebench.com/",
};

const VALID_CATEGORIES = new Set<BenchmarkCategory>([
  "overall",
  "reasoning",
  "coding",
  "instruction_following",
  "math",
  "speed",
  "cost_efficiency",
]);

export async function loadEffectiveCatalog(
  prisma?: EffectiveCatalogPrisma,
): Promise<CuratedCatalog> {
  const catalog = loadCuratedCatalog();

  if (!prisma?.model?.findMany) {
    return catalog;
  }

  try {
    const liveModels = await prisma.model.findMany({
      include: { scores: true },
      orderBy: [{ provider: "asc" }, { name: "asc" }],
    });

    return mergeLiveModels(catalog, liveModels);
  } catch {
    return catalog;
  }
}

function mergeLiveModels(
  catalog: CuratedCatalog,
  liveModels: LiveModelRow[],
): CuratedCatalog {
  const models = [...catalog.models];
  const benchmarks = [...catalog.benchmarks];
  const scores = [...catalog.scores];
  const modelIndexesByName = new Map(
    models.map((model, index) => [normalizeLookup(model.name), index]),
  );
  const modelIds = new Set(models.map((model) => model.id));
  const benchmarkIds = new Set(benchmarks.map((benchmark) => benchmark.id));
  const scoreKeys = new Set(
    scores.map((score) => `${score.modelId}\u0000${score.benchmarkId}`),
  );
  const today = new Date().toISOString().slice(0, 10);

  for (const liveModel of liveModels) {
    if (!isUsableLiveModel(liveModel)) {
      continue;
    }

    const model = upsertLiveModel({
      liveModel,
      modelIndexesByName,
      modelIds,
      models,
      today,
    });

    for (const liveScore of liveModel.scores ?? []) {
      const category = toBenchmarkCategory(liveScore.dimension);

      if (!category) {
        continue;
      }

      const benchmark = ensureBenchmark({
        benchmarkIds,
        benchmarks,
        category,
        source: liveScore.source,
        today,
      });
      const scoreKey = `${model.id}\u0000${benchmark.id}`;

      if (scoreKeys.has(scoreKey)) {
        continue;
      }

      scores.push(toCatalogScore({ benchmark, liveScore, model, today }));
      scoreKeys.add(scoreKey);
    }
  }

  return {
    ...catalog,
    benchmarks,
    models,
    scores,
  };
}

function upsertLiveModel({
  liveModel,
  modelIndexesByName,
  modelIds,
  models,
  today,
}: {
  liveModel: LiveModelRow;
  modelIndexesByName: Map<string, number>;
  modelIds: Set<string>;
  models: CuratedCatalogModel[];
  today: string;
}) {
  const normalizedName = normalizeLookup(liveModel.name);
  const existingIndex = modelIndexesByName.get(normalizedName);

  if (existingIndex !== undefined) {
    const existing = models[existingIndex];
    const updated = {
      ...existing,
      contextWindow: liveModel.contextWindow ?? existing.contextWindow,
      costInputPer1M: liveModel.costInputPer1M ?? existing.costInputPer1M,
      costOutputPer1M: liveModel.costOutputPer1M ?? existing.costOutputPer1M,
      lastVerified: today,
    };

    models[existingIndex] = updated;
    return updated;
  }

  const model: CuratedCatalogModel = {
    id: uniqueModelId(
      `live-${slugify(`${liveModel.provider}-${liveModel.name}`)}`,
      modelIds,
    ),
    name: liveModel.name.trim(),
    provider: liveModel.provider.trim() || "Unknown",
    apiIds: [],
    aliases: [],
    status: "active",
    releaseDate: null,
    contextWindow: liveModel.contextWindow ?? null,
    costInputPer1M: liveModel.costInputPer1M ?? null,
    costOutputPer1M: liveModel.costOutputPer1M ?? null,
    modalities: ["text"],
    infrastructure: ["api"],
    strengthTags: [],
    sourceUrls: inferSourceUrls(liveModel.scores ?? []),
    lastVerified: today,
    notes: "Imported from the latest benchmark refresh cache.",
  };

  models.push(model);
  modelIds.add(model.id);
  modelIndexesByName.set(normalizedName, models.length - 1);

  return model;
}

function ensureBenchmark({
  benchmarkIds,
  benchmarks,
  category,
  source,
  today,
}: {
  benchmarkIds: Set<string>;
  benchmarks: BenchmarkDefinition[];
  category: BenchmarkCategory;
  source: string;
  today: string;
}) {
  const id = `${source}-${category}`;
  const existing = benchmarks.find((benchmark) => benchmark.id === id);

  if (existing) {
    return existing;
  }

  const benchmark: BenchmarkDefinition = {
    id,
    label: `${formatSourceLabel(source)} ${category.replaceAll("_", " ")}`,
    category,
    scale: category === "cost_efficiency" ? "price" : "0_100",
    higherIsBetter: true,
    description: `Imported ${category.replaceAll("_", " ")} signal from ${formatSourceLabel(source)}.`,
    limitations:
      "Refreshed benchmark cache row; source methodology and model availability can change between weekly updates.",
    sourceUrl: SOURCE_URLS[source] ?? "https://artificialanalysis.ai/models",
    lastVerified: today,
  };

  if (!benchmarkIds.has(id)) {
    benchmarks.push(benchmark);
    benchmarkIds.add(id);
  }

  return benchmark;
}

function toCatalogScore({
  benchmark,
  liveScore,
  model,
  today,
}: {
  benchmark: BenchmarkDefinition;
  liveScore: LiveScoreRow;
  model: CuratedCatalogModel;
  today: string;
}): ModelBenchmarkScore {
  return {
    modelId: model.id,
    benchmarkId: benchmark.id,
    score: liveScore.score,
    normalizedScore: normalizePercentageScore(liveScore.score),
    rawLabel: liveScore.rawLabel ?? benchmark.label,
    sourceUrl: benchmark.sourceUrl,
    lastVerified: liveScore.fetchedAt?.toISOString().slice(0, 10) ?? today,
    provenance: "measured",
    notes: "Imported from weekly benchmark refresh.",
  };
}

function isUsableLiveModel(model: LiveModelRow) {
  return (
    model.name.trim().length > 0 &&
    !/^https?:\/\//i.test(model.name.trim()) &&
    (model.scores?.length ?? 0) > 0
  );
}

function toBenchmarkCategory(value: string): BenchmarkCategory | null {
  return VALID_CATEGORIES.has(value as BenchmarkCategory)
    ? (value as BenchmarkCategory)
    : null;
}

function inferSourceUrls(scores: LiveScoreRow[]) {
  const urls = scores
    .map((score) => SOURCE_URLS[score.source])
    .filter((url): url is string => Boolean(url));

  return Array.from(new Set(urls));
}

function normalizeLookup(value: string) {
  return value.trim().toLowerCase();
}

function slugify(value: string) {
  return normalizeLookup(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function uniqueModelId(baseId: string, modelIds: Set<string>) {
  if (!modelIds.has(baseId)) {
    return baseId;
  }

  let suffix = 2;
  let candidate = `${baseId}-${suffix}`;

  while (modelIds.has(candidate)) {
    suffix += 1;
    candidate = `${baseId}-${suffix}`;
  }

  return candidate;
}

function formatSourceLabel(source: string) {
  return source
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
