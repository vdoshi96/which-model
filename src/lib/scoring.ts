import type {
  BenchmarkDimension,
  BenchmarkScore,
  RankedModel,
  TaskDimensions,
} from "@/types/model";

export const BENCHMARK_DIMENSIONS: BenchmarkDimension[] = [
  "reasoning",
  "coding",
  "math",
  "instruction_following",
  "overall",
  "speed",
  "cost_efficiency",
];

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
  const dimensionScores = buildDimensionScores(benchmarks);

  for (const dimension of BENCHMARK_DIMENSIONS) {
    const score = dimensionScores[dimension];
    const weight = dimensions[dimension] ?? 0;

    if (score !== null && weight > 0) {
      weightedScore += weight * score;
      totalWeight += weight;
    }
  }

  return totalWeight === 0 ? 0 : weightedScore / totalWeight;
}

export function buildDimensionScores(
  benchmarks: BenchmarkScore[],
): Record<BenchmarkDimension, number | null> {
  const scores = Object.fromEntries(
    BENCHMARK_DIMENSIONS.map((dimension) => [dimension, null]),
  ) as Record<BenchmarkDimension, number | null>;
  const counts = Object.fromEntries(
    BENCHMARK_DIMENSIONS.map((dimension) => [dimension, 0]),
  ) as Record<BenchmarkDimension, number>;

  for (const benchmark of benchmarks) {
    scores[benchmark.dimension] =
      (scores[benchmark.dimension] ?? 0) + benchmark.score;
    counts[benchmark.dimension] += 1;
  }

  for (const dimension of BENCHMARK_DIMENSIONS) {
    const score = scores[dimension];

    if (score !== null) {
      scores[dimension] = score / counts[dimension];
    }
  }

  return scores;
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
