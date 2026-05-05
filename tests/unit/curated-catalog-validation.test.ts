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
    expect(catalog.sources.length).toBeGreaterThanOrEqual(1);
    expect(catalog.scores.length).toBeGreaterThanOrEqual(60);
    expect(result.warnings.length).toBeGreaterThanOrEqual(0);
  });

  it("registers Arena.ai leaderboard pages, options, and filter ranges", () => {
    const catalog = loadCuratedCatalog();
    const arena = catalog.sources.find((source) => source.id === "arena-ai");

    expect(arena).toBeDefined();
    expect(arena?.homepage).toBe("https://arena.ai/leaderboard");
    expect(arena?.pages.map((page) => page.id)).toEqual(
      expect.arrayContaining([
        "arena-ai-overview",
        "arena-ai-text",
        "arena-ai-code",
        "arena-ai-vision",
        "arena-ai-document",
        "arena-ai-search",
        "arena-ai-text-to-image",
        "arena-ai-image-edit",
        "arena-ai-text-to-video",
        "arena-ai-image-to-video",
        "arena-ai-video-edit",
      ]),
    );

    const overviewPages = arena?.pages
      .find((page) => page.id === "arena-ai-overview")
      ?.filters.find((filter) => filter.id === "arena-ai-leaderboard-pages");
    expect(overviewPages?.optionCount).toBe(10);
    expect(overviewPages?.options?.map((option) => option.value)).toEqual(
      expect.arrayContaining([
        "text",
        "code",
        "vision",
        "document",
        "search",
        "text-to-image",
        "image-edit",
        "text-to-video",
        "image-to-video",
        "video-edit",
      ]),
    );

    const textCategories = arena?.pages
      .find((page) => page.id === "arena-ai-text")
      ?.filters.find((filter) => filter.id === "arena-ai-text-categories");
    expect(textCategories?.optionCount).toBe(29);
    expect(textCategories?.options?.map((option) => option.value)).toEqual(
      expect.arrayContaining([
        "overall",
        "math",
        "instruction-following",
        "creative-writing",
        "coding",
        "hard-prompts",
      ]),
    );

    const codeInputPrice = arena?.pages
      .find((page) => page.id === "arena-ai-code")
      ?.filters.find((filter) => filter.id === "arena-ai-code-input-price");
    expect(codeInputPrice?.range).toEqual({
      min: 0.09,
      max: 15,
      unit: "usd_per_million_tokens",
    });

    const textToImage = arena?.pages.find(
      (page) => page.id === "arena-ai-text-to-image",
    );
    expect(textToImage?.sourceCategoryLabels).toEqual(
      expect.arrayContaining(["Text Rendering"]),
    );
    expect(textToImage?.benchmarkCategories).toEqual([]);
  });

  it("reports malformed source registry entries", () => {
    const catalog = loadCuratedCatalog();
    const malformedCatalog = JSON.parse(JSON.stringify(catalog));
    const arena = malformedCatalog.sources.find(
      (source: { id: string }) => source.id === "arena-ai",
    );
    const overview = arena.pages.find(
      (page: { id: string }) => page.id === "arena-ai-overview",
    );
    const leaderboardPages = overview.filters.find(
      (filter: { id: string }) => filter.id === "arena-ai-leaderboard-pages",
    );
    const text = arena.pages.find(
      (page: { id: string }) => page.id === "arena-ai-text",
    );
    const textScoreRange = text.filters.find(
      (filter: { id: string }) => filter.id === "arena-ai-text-score-range",
    );

    arena.lastVerified = "05/05/2026";
    overview.stats.asOf = "May 5, 2026";
    overview.sourceCategoryLabels = [];
    leaderboardPages.range = { min: 0, max: 1, unit: "bad" };
    leaderboardPages.options[0].url =
      "https://arena.ai/leaderboard/not-registered";
    textScoreRange.range = { min: 1503, max: 951, unit: "elo" };
    textScoreRange.options = [
      {
        id: "arena-ai-text-score-range-bad-option",
        label: "Bad option",
        value: "bad",
      },
    ];

    const result = validateCuratedCatalog(malformedCatalog);

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'Source "arena-ai" has invalid lastVerified date "05/05/2026"',
        'Source page "arena-ai-overview" has no source category labels',
        'Source page "arena-ai-overview" has invalid stats.asOf date "May 5, 2026"',
        'Source page "arena-ai-overview" filter "arena-ai-leaderboard-pages" is not a range filter but has a range',
        'Source page "arena-ai-overview" leaderboard option "arena-ai-page-text" points to unregistered page URL "https://arena.ai/leaderboard/not-registered"',
        'Source page "arena-ai-text" filter "arena-ai-text-score-range" is a range filter but also has options',
        'Source page "arena-ai-text" filter "arena-ai-text-score-range" has min greater than max',
      ]),
    );
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
