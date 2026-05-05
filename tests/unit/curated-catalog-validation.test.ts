import {
  loadCuratedCatalog,
  validateCuratedCatalog,
} from "@/lib/curatedCatalog/loadCatalog";

describe("curated catalog validation", () => {
  it("loads valid curated model, benchmark, and score data", () => {
    const catalog = loadCuratedCatalog();
    const result = validateCuratedCatalog(catalog);

    expect(result.ok).toBe(true);
    expect(catalog.models.length).toBeGreaterThanOrEqual(20);
    expect(catalog.benchmarks.length).toBeGreaterThanOrEqual(8);
    expect(catalog.scores.length).toBeGreaterThanOrEqual(60);
    expect(result.warnings.length).toBeGreaterThanOrEqual(0);
  });

  it("requires source-backed cost and context metadata for frontier models", () => {
    const catalog = loadCuratedCatalog();
    const frontierModels = catalog.models.filter(
      (model) => model.status === "frontier",
    );

    expect(frontierModels.length).toBeGreaterThanOrEqual(5);
    expect(
      frontierModels.every(
        (model) =>
          model.contextWindow !== null &&
          model.costInputPer1M !== null &&
          model.costOutputPer1M !== null &&
          model.sourceUrls.length > 0 &&
          model.lastVerified.length > 0,
      ),
    ).toBe(true);
  });

  it("reports missing benchmark references", () => {
    const catalog = loadCuratedCatalog();
    const result = validateCuratedCatalog({
      ...catalog,
      scores: [
        ...catalog.scores,
        {
          modelId: catalog.models[0].id,
          benchmarkId: "missing-benchmark",
          score: 99,
          normalizedScore: 99,
          rawLabel: "bad fixture",
          sourceUrl: "https://example.com",
          lastVerified: "2026-05-04",
          provenance: "measured",
          notes: "fixture",
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      `Unknown benchmark id "missing-benchmark" in score row for ${catalog.models[0].id}`,
    );
  });

  it("requires explicit score provenance", () => {
    const catalog = loadCuratedCatalog();

    expect(
      catalog.scores.every((score) =>
        ["measured", "derived_metadata", "editorial_prior"].includes(
          score.provenance,
        ),
      ),
    ).toBe(true);
    expect(
      catalog.scores
        .filter((score) => score.provenance === "editorial_prior")
        .every((score) =>
          score.sourceUrl.includes(
            "docs/superpowers/plans/2026-05-04-curated-recommendation-catalog-implementation.md",
          ),
        ),
    ).toBe(true);
  });

  it("reports coverage gap warnings by model and benchmark category", () => {
    const catalog = loadCuratedCatalog();
    const result = validateCuratedCatalog({
      ...catalog,
      scores: catalog.scores.filter(
        (score) => score.benchmarkId !== "catalog-tool-use-prior",
      ),
    });

    expect(result.ok).toBe(true);
    expect(result.warnings).toContain(
      'No score rows cover benchmark "catalog-tool-use-prior" (tool_use)',
    );
    expect(result.warnings).toContain(
      'Model "gpt-5-4-mini" has no score rows for benchmark category "tool_use"',
    );
  });

  it("reports duplicate score rows by model and benchmark", () => {
    const catalog = loadCuratedCatalog();
    const duplicateScore = catalog.scores[0];
    const result = validateCuratedCatalog({
      ...catalog,
      scores: [...catalog.scores, duplicateScore],
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      `Duplicate score row for model "${duplicateScore.modelId}" and benchmark "${duplicateScore.benchmarkId}"`,
    );
  });

  it("returns schema errors for malformed catalog input", () => {
    const result = validateCuratedCatalog({ models: "bad fixture" });

    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
