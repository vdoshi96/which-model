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

const SOURCE_DIMENSION_WEIGHTS: Record<
  string,
  Partial<Record<BenchmarkDimension, number>>
> = {
  aider_polyglot: { coding: 1.2 },
  bfcl: { instruction_following: 1.2 },
  catalog_prior: {
    coding: 0.75,
    cost_efficiency: 0.65,
    instruction_following: 0.85,
    overall: 0.85,
    reasoning: 0.8,
    speed: 0.65,
  },
  swe_bench: { coding: 1.2 },
};

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

    if (weight > 0) {
      totalWeight += weight;

      if (score !== null) {
        weightedScore += weight * score;
      }
    }
  }

  return totalWeight === 0 ? 0 : weightedScore / totalWeight;
}

export function isUsableBenchmarkScore(score: {
  source: string;
  dimension: string;
  score: number;
  rawLabel?: string | null;
}) {
  if (
    !BENCHMARK_DIMENSIONS.includes(score.dimension as BenchmarkDimension) ||
    !Number.isFinite(score.score)
  ) {
    return false;
  }

  const isBinaryLiveBenchArtifact =
    score.source === "livebench" &&
    score.rawLabel?.toLowerCase().startsWith("livebench ") &&
    (score.score === 0 || score.score === 100);

  return !isBinaryLiveBenchArtifact;
}

export function buildDimensionScores(
  benchmarks: BenchmarkScore[],
): Record<BenchmarkDimension, number | null> {
  const scores = Object.fromEntries(
    BENCHMARK_DIMENSIONS.map((dimension) => [dimension, null]),
  ) as Record<BenchmarkDimension, number | null>;
  const weights = Object.fromEntries(
    BENCHMARK_DIMENSIONS.map((dimension) => [dimension, 0]),
  ) as Record<BenchmarkDimension, number>;

  for (const benchmark of benchmarks) {
    if (!BENCHMARK_DIMENSIONS.includes(benchmark.dimension as BenchmarkDimension)) {
      continue;
    }

    const dimension = benchmark.dimension as BenchmarkDimension;
    const benchmarkWeight = getBenchmarkWeight(
      benchmark.source,
      dimension,
    );

    scores[dimension] =
      (scores[dimension] ?? 0) + benchmark.score * benchmarkWeight;
    weights[dimension] += benchmarkWeight;
  }

  for (const dimension of BENCHMARK_DIMENSIONS) {
    const score = scores[dimension];

    if (score !== null) {
      scores[dimension] = score / weights[dimension];
    }
  }

  return scores;
}

function getBenchmarkWeight(source: string, dimension: BenchmarkDimension) {
  return SOURCE_DIMENSION_WEIGHTS[source]?.[dimension] ?? 1;
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
