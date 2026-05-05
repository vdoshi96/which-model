import {
  parseRecommendationCache,
  serializeRecommendationCache,
} from "@/lib/recommendationCache";
import type { RecommendResponse } from "@/types/api";

const response: RecommendResponse = {
  taskSummary: "Creative writing needs broad quality.",
  dimensions: {
    reasoning: 0.2,
    coding: 0,
    math: 0,
    instruction_following: 0.7,
    overall: 0.9,
    speed: 0,
    cost_efficiency: 0,
  },
  recommendations: [
    {
      rank: 1,
      model: {
        name: "GPT-5.5",
        provider: "OpenAI",
        contextWindow: 1_000_000,
        costInputPer1M: 5,
        costOutputPer1M: 30,
      },
      score: 96,
      benchmarksUsed: [
        {
          source: "catalog_prior",
          dimension: "overall",
          score: 97,
          rawLabel: "Curated catalog prior",
        },
      ],
    },
  ],
};

describe("recommendation cache", () => {
  it("round-trips recommendations only for the matching task", () => {
    const raw = serializeRecommendationCache("write a song", response);

    expect(parseRecommendationCache(raw, "write a song")).toEqual(response);
    expect(parseRecommendationCache(raw, "write code")).toBeNull();
  });

  it("ignores legacy unversioned cached payloads", () => {
    expect(parseRecommendationCache(JSON.stringify(response), "write a song")).toBeNull();
  });
});
