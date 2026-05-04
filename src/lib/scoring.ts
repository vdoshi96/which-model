import type { BenchmarkScore, RankedModel, TaskDimensions } from "@/types/model";

export interface ScoreableModel {
  name: string;
  provider: string;
  contextWindow: number | null;
  costInputPer1M: number | null;
  costOutputPer1M: number | null;
  benchmarks: BenchmarkScore[];
}

export function calculateWeightedScore(
  benchmarks: BenchmarkScore[],
  dimensions: Partial<TaskDimensions>,
): number {
  let weightedScore = 0;
  let totalWeight = 0;

  for (const benchmark of benchmarks) {
    const weight = dimensions[benchmark.dimension] ?? 0;

    if (weight > 0) {
      weightedScore += weight * benchmark.score;
      totalWeight += weight;
    }
  }

  return totalWeight === 0 ? 0 : weightedScore / totalWeight;
}

export function rankModels(
  models: ScoreableModel[],
  dimensions: Partial<TaskDimensions>,
  limit = 10,
): RankedModel[] {
  return models
    .map((model) => ({
      model,
      score: calculateWeightedScore(model.benchmarks, dimensions),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ model, score }, index) => ({
      rank: index + 1,
      model: {
        name: model.name,
        provider: model.provider,
        contextWindow: model.contextWindow,
        costInputPer1M: model.costInputPer1M,
        costOutputPer1M: model.costOutputPer1M,
      },
      score,
      benchmarksUsed: model.benchmarks,
    }));
}
