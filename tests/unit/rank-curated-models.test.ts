import { loadCuratedCatalog } from "@/lib/curatedCatalog/loadCatalog";
import type { CuratedCatalog } from "@/lib/curatedCatalog/schema";
import { rankCuratedModels } from "@/lib/recommendation/rankCuratedModels";
import {
  defaultRecommendationPreferences,
  type RecommendationIntent,
} from "@/lib/recommendation/preferences";

const creativeIntent: RecommendationIntent = {
  summary: "Song writing needs style and instruction following.",
  weights: {
    overall: 0.85,
    creative_writing: 0.7,
    instruction_following: 0.75,
    reasoning: 0.25,
    coding: 0,
    math: 0,
    tool_use: 0,
    speed: 0,
    cost_efficiency: 0,
    long_context: 0,
  },
};

function withSparseSingleBenchmarkRow(catalog: CuratedCatalog): CuratedCatalog {
  return {
    ...catalog,
    models: [
      ...catalog.models,
      {
        id: "sparse-single-benchmark",
        name: "Sparse Single Benchmark",
        provider: "Bench Lab",
        apiIds: [],
        aliases: [],
        status: "active",
        releaseDate: "2026-05-04",
        contextWindow: 128_000,
        costInputPer1M: 0.1,
        costOutputPer1M: 0.2,
        modalities: ["text"],
        infrastructure: ["api"],
        strengthTags: ["overall"],
        sourceUrls: ["https://example.com/sparse"],
        lastVerified: "2026-05-04",
        notes: "Sparse test fixture.",
      },
    ],
    scores: [
      ...catalog.scores,
      {
        modelId: "sparse-single-benchmark",
        benchmarkId: "catalog-overall-prior",
        score: 100,
        normalizedScore: 100,
        rawLabel: "single high score",
        sourceUrl: "https://example.com/sparse-score",
        lastVerified: "2026-05-04",
        provenance: "measured",
        notes: "Sparse test fixture.",
      },
    ],
  };
}

describe("rankCuratedModels", () => {
  it("puts frontier models above sparse single-benchmark rows for broad creative tasks", () => {
    const ranked = rankCuratedModels({
      catalog: withSparseSingleBenchmarkRow(loadCuratedCatalog()),
      intent: creativeIntent,
      preferences: defaultRecommendationPreferences,
      limit: 10,
    });

    const topFive = ranked.slice(0, 5).map((entry) => entry.model.name);

    expect(topFive).toContain("GPT-5.5");
    expect(topFive).toContain("Claude Opus 4.7");
    expect(topFive).not.toContain("Sparse Single Benchmark");
    expect(ranked[0].evidenceCount).toBeGreaterThanOrEqual(5);
    expect(ranked[0].score).toBeLessThanOrEqual(100);
    expect(ranked[0].provenanceSummary).toEqual(
      expect.objectContaining({ editorial_prior: expect.any(Number) }),
    );
    expect(ranked[0].rationale).toContain("editorial prior");
    expect(ranked[0].rationale).toContain(
      "Catalog has no dedicated rows yet for creative_writing",
    );
  });

  it("uses cost only when costSensitive is true", () => {
    const catalog = loadCuratedCatalog();
    const base = rankCuratedModels({
      catalog,
      intent: {
        summary: "Write polished marketing copy.",
        weights: {
          overall: 0.8,
          creative_writing: 0.8,
          instruction_following: 0.6,
          reasoning: 0.2,
          coding: 0,
          math: 0,
          tool_use: 0,
          speed: 0,
          cost_efficiency: 0,
          long_context: 0,
        },
      },
      preferences: { ...defaultRecommendationPreferences, costSensitive: false },
      limit: 10,
    });
    const costSensitive = rankCuratedModels({
      catalog,
      intent: {
        summary: "Write polished marketing copy cheaply.",
        weights: {
          overall: 0.8,
          creative_writing: 0.8,
          instruction_following: 0.6,
          reasoning: 0.2,
          coding: 0,
          math: 0,
          tool_use: 0,
          speed: 0,
          cost_efficiency: 0.8,
          long_context: 0,
        },
      },
      preferences: { ...defaultRecommendationPreferences, costSensitive: true },
      limit: 10,
    });

    expect(base[0].model.name).not.toBe(costSensitive[0].model.name);
    expect(
      base[0].contributions?.some(
        (contribution) => contribution.label === "cost_efficiency",
      ),
    ).toBe(false);
    expect(
      costSensitive[0].contributions?.some(
        (contribution) => contribution.label === "cost_efficiency",
      ),
    ).toBe(true);
  });

  it("filters by provider, model, infrastructure, local, and long-context preferences", () => {
    const catalog = loadCuratedCatalog();
    const codingIntent: RecommendationIntent = {
      summary: "Implementation quality matters.",
      weights: {
        overall: 0.1,
        creative_writing: 0,
        instruction_following: 0.2,
        reasoning: 0.2,
        coding: 1,
        math: 0,
        tool_use: 0,
        speed: 0,
        cost_efficiency: 0,
        long_context: 0,
      },
    };

    expect(
      rankCuratedModels({
        catalog,
        intent: codingIntent,
        preferences: {
          ...defaultRecommendationPreferences,
          preferFrontier: false,
          preferredProviders: ["Anthropic"],
        },
      }).every((entry) => entry.model.provider === "Anthropic"),
    ).toBe(true);

    expect(
      rankCuratedModels({
        catalog,
        intent: codingIntent,
        preferences: {
          ...defaultRecommendationPreferences,
          preferFrontier: false,
          preferredModels: ["gpt-5-5"],
        },
      }).map((entry) => entry.model.name),
    ).toEqual(["GPT-5.5"]);

    expect(
      rankCuratedModels({
        catalog,
        intent: codingIntent,
        preferences: {
          ...defaultRecommendationPreferences,
          preferFrontier: false,
          infrastructure: ["vertex_ai"],
        },
      }).every((entry) => entry.model.provider === "Google"),
    ).toBe(true);

    expect(
      rankCuratedModels({
        catalog,
        intent: codingIntent,
        preferences: {
          ...defaultRecommendationPreferences,
          preferFrontier: false,
          localOnly: true,
        },
      }),
    ).toEqual([]);

    expect(
      rankCuratedModels({
        catalog,
        intent: codingIntent,
        preferences: {
          ...defaultRecommendationPreferences,
          preferFrontier: false,
          needsLongContext: true,
        },
      }).every((entry) => (entry.model.contextWindow ?? 0) >= 1_000_000),
    ).toBe(true);
  });
});
