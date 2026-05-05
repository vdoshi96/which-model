import type {
  BenchmarkCategory,
  BenchmarkDefinition,
  CuratedCatalog,
  CuratedCatalogModel,
  ModelBenchmarkScore,
} from "@/lib/curatedCatalog/schema";
import { explainRanking } from "@/lib/recommendation/explainRanking";
import type {
  RecommendationIntent,
  RecommendationPreferences,
} from "@/lib/recommendation/preferences";
import type {
  BenchmarkScore,
  RankedModel,
  RankingContribution,
} from "@/types/model";

const HIGH_WEIGHT_MISSING_THRESHOLD = 0.5;
const LONG_CONTEXT_THRESHOLD = 1_000_000;
const FRONTIER_FILTER_MINIMUM = 2;
const STATUS_PRIORITY: Record<CuratedCatalogModel["status"], number> = {
  frontier: 0,
  preview: 1,
  active: 2,
  legacy: 3,
  deprecated: 4,
  retired: 5,
};
const PROVENANCE_WEIGHTS: Record<ModelBenchmarkScore["provenance"], number> = {
  measured: 1,
  editorial_prior: 0.9,
  derived_metadata: 0.8,
};

type CategoryScores = Partial<Record<BenchmarkCategory, ModelBenchmarkScore[]>>;

export function rankCuratedModels({
  catalog,
  intent,
  preferences,
  limit = 10,
}: {
  catalog: CuratedCatalog;
  intent: RecommendationIntent;
  preferences: RecommendationPreferences;
  limit?: number;
}): RankedModel[] {
  const benchmarksById = new Map(
    catalog.benchmarks.map((benchmark) => [benchmark.id, benchmark]),
  );
  const availableCategories = new Set(
    catalog.scores
      .map((score) => benchmarksById.get(score.benchmarkId)?.category)
      .filter((category): category is BenchmarkCategory => category !== undefined),
  );
  const scoresByModel = groupScoresByModel(catalog.scores, benchmarksById);
  const candidates = applyPreferenceFilters(catalog.models, preferences);

  return candidates
    .map((model) =>
      scoreModel({
        model,
        categoryScores: scoresByModel.get(model.id) ?? {},
        benchmarksById,
        availableCategories,
        intent,
        preferences,
      }),
    )
    .filter((entry) => (entry.evidenceCount ?? 0) > 0)
    .sort(compareRankedModels)
    .slice(0, limit)
    .map(({ status: _status, ...entry }, index) => ({ ...entry, rank: index + 1 }));
}

function groupScoresByModel(
  scores: ModelBenchmarkScore[],
  benchmarksById: Map<string, BenchmarkDefinition>,
) {
  const scoresByModel = new Map<string, CategoryScores>();

  for (const score of scores) {
    const benchmark = benchmarksById.get(score.benchmarkId);

    if (!benchmark) {
      continue;
    }

    const modelScores = scoresByModel.get(score.modelId) ?? {};
    const categoryScores = modelScores[benchmark.category] ?? [];

    categoryScores.push(score);
    modelScores[benchmark.category] = categoryScores;
    scoresByModel.set(score.modelId, modelScores);
  }

  return scoresByModel;
}

function scoreModel({
  model,
  categoryScores,
  benchmarksById,
  availableCategories,
  intent,
  preferences,
}: {
  model: CuratedCatalogModel;
  categoryScores: CategoryScores;
  benchmarksById: Map<string, BenchmarkDefinition>;
  availableCategories: Set<BenchmarkCategory>;
  intent: RecommendationIntent;
  preferences: RecommendationPreferences;
}): RankedModel & { status: CuratedCatalogModel["status"] } {
  const activeWeights = buildActiveWeights(intent, preferences);
  const contributions: RankingContribution[] = [];
  const missingEvidence: string[] = [];
  const unavailableEvidence: string[] = [];
  let weightedScore = 0;
  let totalWeight = 0;
  let missingPenalty = 0;

  for (const [category, weight] of Object.entries(activeWeights) as Array<
    [BenchmarkCategory, number]
  >) {
    if (weight <= 0) {
      continue;
    }

    totalWeight += weight;
    const value = averageCategoryScore(categoryScores[category]);

    if (value === null) {
      if (!availableCategories.has(category)) {
        if (weight >= HIGH_WEIGHT_MISSING_THRESHOLD) {
          unavailableEvidence.push(category);
        }

        totalWeight -= weight;
        continue;
      }

      if (weight >= HIGH_WEIGHT_MISSING_THRESHOLD) {
        missingEvidence.push(category);
      }

      missingPenalty += weight * 8;
      continue;
    }

    const contribution = value * weight;

    weightedScore += contribution;
    contributions.push({
      label: category,
      value,
      weight,
      contribution,
    });
  }

  const baseScore = totalWeight === 0 ? 0 : weightedScore / totalWeight;
  const benchmarksUsed = buildBenchmarksUsed(categoryScores, benchmarksById);
  const evidenceCount = benchmarksUsed.length;
  const provenanceSummary = summarizeProvenance(benchmarksUsed);
  const score = clampScore(
    baseScore - missingPenalty + modelBoost(model, preferences),
  );

  return {
    rank: 0,
    model: {
      name: model.name,
      provider: model.provider,
      contextWindow: model.contextWindow,
      costInputPer1M: model.costInputPer1M,
      costOutputPer1M: model.costOutputPer1M,
    },
    score,
    benchmarksUsed,
    evidenceCount,
    missingEvidence,
    unavailableEvidence,
    provenanceSummary,
    contributions,
    rationale: explainRanking({
      contributions,
      evidenceCount,
      missingEvidence,
      modelName: model.name,
      provenanceSummary,
      unavailableEvidence,
    }),
    status: model.status,
  };
}

function buildActiveWeights(
  intent: RecommendationIntent,
  preferences: RecommendationPreferences,
): Partial<Record<BenchmarkCategory, number>> {
  return {
    overall: intent.weights.overall,
    reasoning: intent.weights.reasoning,
    coding: intent.weights.coding,
    instruction_following: intent.weights.instruction_following,
    creative_writing: intent.weights.creative_writing,
    math: intent.weights.math,
    tool_use: intent.weights.tool_use,
    speed: preferences.latencySensitive ? intent.weights.speed : 0,
    cost_efficiency: preferences.costSensitive
      ? intent.weights.cost_efficiency
      : 0,
    long_context: preferences.needsLongContext
      ? Math.max(intent.weights.long_context, 0.75)
      : 0,
  };
}

function averageCategoryScore(scores: ModelBenchmarkScore[] | undefined) {
  if (!scores || scores.length === 0) {
    return null;
  }

  let weightedScore = 0;
  let totalWeight = 0;

  for (const score of scores) {
    const weight = PROVENANCE_WEIGHTS[score.provenance];

    weightedScore += score.normalizedScore * weight;
    totalWeight += weight;
  }

  return totalWeight === 0 ? null : weightedScore / totalWeight;
}

function modelBoost(
  model: CuratedCatalogModel,
  preferences: RecommendationPreferences,
) {
  let boost = 0;

  if (preferences.preferFrontier && model.status === "frontier") {
    boost += 2;
  }

  if (
    preferences.needsLongContext &&
    (model.contextWindow ?? 0) >= LONG_CONTEXT_THRESHOLD
  ) {
    boost += 1;
  }

  return boost;
}

function buildBenchmarksUsed(
  categoryScores: CategoryScores,
  benchmarksById: Map<string, BenchmarkDefinition>,
): BenchmarkScore[] {
  return Object.values(categoryScores)
    .flat()
    .map((score) => {
      const benchmark = benchmarksById.get(score.benchmarkId);

      return {
        source: score.benchmarkId,
        dimension: benchmark?.category ?? "overall",
        score: score.normalizedScore,
        rawLabel: score.rawLabel,
        provenance: score.provenance,
        sourceUrl: score.sourceUrl,
      };
    });
}

function summarizeProvenance(benchmarks: BenchmarkScore[]) {
  return benchmarks.reduce<Record<string, number>>((summary, benchmark) => {
    const provenance = benchmark.provenance ?? "unknown";

    summary[provenance] = (summary[provenance] ?? 0) + 1;

    return summary;
  }, {});
}

function clampScore(score: number) {
  return Math.min(100, Math.max(0, score));
}

function applyPreferenceFilters(
  models: CuratedCatalogModel[],
  preferences: RecommendationPreferences,
) {
  let filtered = models;
  const preferredProviders = new Set(
    preferences.preferredProviders.map(normalizePreferenceValue),
  );
  const preferredModels = new Set(
    preferences.preferredModels.map(normalizePreferenceValue),
  );
  const preferredInfrastructure = new Set(
    preferences.infrastructure.map(normalizePreferenceValue),
  );

  if (preferredProviders.size > 0) {
    filtered = filtered.filter((model) =>
      preferredProviders.has(normalizePreferenceValue(model.provider)),
    );
  }

  if (preferredModels.size > 0) {
    filtered = filtered.filter((model) =>
      getModelLookupValues(model).some((value) =>
        preferredModels.has(normalizePreferenceValue(value)),
      ),
    );
  }

  if (preferredInfrastructure.size > 0) {
    filtered = filtered.filter((model) =>
      model.infrastructure.some((entry) =>
        preferredInfrastructure.has(normalizePreferenceValue(entry)),
      ),
    );
  }

  if (preferences.localOnly) {
    filtered = filtered.filter((model) =>
      model.infrastructure.some(
        (entry) => normalizePreferenceValue(entry) === "local",
      ),
    );
  }

  if (preferences.needsLongContext) {
    filtered = filtered.filter(
      (model) => (model.contextWindow ?? 0) >= LONG_CONTEXT_THRESHOLD,
    );
  }

  if (preferences.preferFrontier) {
    const frontierModels = filtered.filter(
      (model) => model.status === "frontier",
    );

    if (frontierModels.length >= FRONTIER_FILTER_MINIMUM) {
      filtered = frontierModels;
    }
  }

  return filtered;
}

function getModelLookupValues(model: CuratedCatalogModel) {
  return [model.id, model.name, ...model.apiIds, ...model.aliases];
}

function compareRankedModels(
  left: RankedModel & { status: CuratedCatalogModel["status"] },
  right: RankedModel & { status: CuratedCatalogModel["status"] },
) {
  const scoreDifference = right.score - left.score;

  if (scoreDifference !== 0) {
    return scoreDifference;
  }

  const statusDifference = STATUS_PRIORITY[left.status] - STATUS_PRIORITY[right.status];

  if (statusDifference !== 0) {
    return statusDifference;
  }

  return left.model.name.localeCompare(right.model.name);
}

function normalizePreferenceValue(value: string): string {
  return value.trim().toLowerCase();
}
