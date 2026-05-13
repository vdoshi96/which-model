import type { CuratedCatalog } from "@/lib/curatedCatalog/schema";
import type {
  RecommendationIntent,
  RecommendationPreferences,
} from "@/lib/recommendation/preferences";
import { rankCuratedModels } from "@/lib/recommendation/rankCuratedModels";
import type { RankedModel } from "@/types/model";

export type RecommendationTierId =
  | "no_holds_barred"
  | "balanced"
  | "budget";

export interface RecommendationTier {
  id: RecommendationTierId;
  label: string;
  description: string;
  recommendation: RankedModel | null;
  taskScore: number | null;
  selectionScore: number | null;
}

const MIN_BUDGET_QUALITY_SCORE = 55;
const BUDGET_QUALITY_RATIO = 0.65;

export function rankRecommendationTiers({
  catalog,
  intent,
  preferences,
}: {
  catalog: CuratedCatalog;
  intent: RecommendationIntent;
  preferences: RecommendationPreferences;
}): RecommendationTier[] {
  const qualityIntent = withCostWeight(intent, 0);
  const qualityPreferences = {
    ...preferences,
    costSensitive: false,
  };
  const qualityRanking = rankCuratedModels({
    catalog,
    intent: qualityIntent,
    preferences: qualityPreferences,
    limit: catalog.models.length,
  });

  const balancedRanking = rankCuratedModels({
    catalog,
    intent: withCostWeight(intent, Math.max(intent.weights.cost_efficiency, 0.55)),
    preferences: {
      ...preferences,
      costSensitive: true,
    },
    limit: catalog.models.length,
  });

  const budgetRanking = rankCuratedModels({
    catalog,
    intent: withCostWeight(intent, Math.max(intent.weights.cost_efficiency, 1)),
    preferences: {
      ...preferences,
      costSensitive: true,
      preferFrontier: false,
    },
    limit: catalog.models.length,
  });

  const taskScoresByName = new Map(
    qualityRanking.map((entry) => [entry.model.name, entry.score]),
  );

  return [
    buildTier({
      id: "no_holds_barred",
      label: "Best model, no holds barred",
      description: "Highest task-fit score from the selected models, ignoring token price.",
      recommendation: qualityRanking[0] ?? null,
      taskScoresByName,
    }),
    buildTier({
      id: "balanced",
      label: "Best balance",
      description: "Strong task fit with cost efficiency included in the scoring.",
      recommendation: balancedRanking[0] ?? qualityRanking[0] ?? null,
      taskScoresByName,
    }),
    buildTier({
      id: "budget",
      label: "Cheap and decent",
      description: "Lowest practical API cost among models that clear a quality floor.",
      recommendation: chooseBudgetRecommendation({
        budgetRanking,
        qualityRanking,
      }),
      taskScoresByName,
    }),
  ];
}

function buildTier({
  id,
  label,
  description,
  recommendation,
  taskScoresByName,
}: {
  id: RecommendationTierId;
  label: string;
  description: string;
  recommendation: RankedModel | null;
  taskScoresByName: Map<string, number>;
}): RecommendationTier {
  return {
    id,
    label,
    description,
    recommendation,
    taskScore: recommendation
      ? (taskScoresByName.get(recommendation.model.name) ?? null)
      : null,
    selectionScore: recommendation?.score ?? null,
  };
}

function withCostWeight(
  intent: RecommendationIntent,
  costWeight: number,
): RecommendationIntent {
  return {
    ...intent,
    weights: {
      ...intent.weights,
      cost_efficiency: costWeight,
    },
  };
}

function chooseBudgetRecommendation({
  budgetRanking,
  qualityRanking,
}: {
  budgetRanking: RankedModel[];
  qualityRanking: RankedModel[];
}) {
  if (budgetRanking.length === 0) {
    return null;
  }

  const qualityByName = new Map(
    qualityRanking.map((entry) => [entry.model.name, entry.score]),
  );
  const topQualityScore = qualityRanking[0]?.score ?? 0;
  const qualityFloor = Math.max(
    MIN_BUDGET_QUALITY_SCORE,
    topQualityScore * BUDGET_QUALITY_RATIO,
  );
  const qualified = budgetRanking.filter(
    (entry) => (qualityByName.get(entry.model.name) ?? entry.score) >= qualityFloor,
  );
  const candidates = qualified.length > 0 ? qualified : budgetRanking;

  return [...candidates].sort((left, right) => {
    const costDifference = blendedCost(left) - blendedCost(right);

    if (costDifference !== 0) {
      return costDifference;
    }

    return (
      (qualityByName.get(right.model.name) ?? right.score) -
      (qualityByName.get(left.model.name) ?? left.score)
    );
  })[0];
}

function blendedCost(model: RankedModel) {
  const input = model.model.costInputPer1M;
  const output = model.model.costOutputPer1M;

  if (input === null && output === null) {
    return Number.POSITIVE_INFINITY;
  }

  const safeInput = input ?? output ?? 0;
  const safeOutput = output ?? input ?? 0;

  return (safeInput * 3 + safeOutput) / 4;
}
