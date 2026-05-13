import { loadCuratedCatalog } from "@/lib/curatedCatalog/loadCatalog";
import {
  defaultRecommendationPreferences,
  type RecommendationIntent,
} from "@/lib/recommendation/preferences";
import { rankRecommendationTiers } from "@/lib/recommendation/recommendationTiers";

const codingIntent: RecommendationIntent = {
  summary: "A production coding task with moderate reasoning.",
  weights: {
    overall: 0.3,
    creative_writing: 0,
    instruction_following: 0.4,
    reasoning: 0.55,
    coding: 1,
    math: 0,
    tool_use: 0.4,
    speed: 0,
    cost_efficiency: 0,
    long_context: 0,
  },
};

describe("rankRecommendationTiers", () => {
  it("returns quality, balanced, and budget picks only from the selected model/provider scope", () => {
    const tiers = rankRecommendationTiers({
      catalog: loadCuratedCatalog(),
      intent: codingIntent,
      preferences: {
        ...defaultRecommendationPreferences,
        preferFrontier: false,
        preferredProviders: ["OpenAI"],
        preferredModels: ["deepseek-v4-pro"],
      },
    });

    expect(tiers.map((tier) => tier.id)).toEqual([
      "no_holds_barred",
      "balanced",
      "budget",
    ]);

    expect(tiers.every((tier) => tier.recommendation !== null)).toBe(true);
    expect(
      tiers.every((tier) => {
        const recommendation = tier.recommendation!;

        return (
          recommendation.model.provider === "OpenAI" ||
          recommendation.model.name === "DeepSeek V4 Pro"
        );
      }),
    ).toBe(true);
    expect(tiers.find((tier) => tier.id === "budget")?.recommendation?.model.name)
      .toBe("DeepSeek V4 Pro");
  });
});
