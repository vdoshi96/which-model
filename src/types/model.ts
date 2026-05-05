export type BenchmarkDimension =
  | "reasoning"
  | "coding"
  | "math"
  | "instruction_following"
  | "overall"
  | "speed"
  | "cost_efficiency";

export type BenchmarkSource =
  | "catalog_prior"
  | "aider_polyglot"
  | "artificial_analysis"
  | "bfcl"
  | "lmsys_arena"
  | "hf_leaderboard"
  | "livebench"
  | "swe_bench";

export type TaskDimensions = Record<BenchmarkDimension, number>;

export interface BenchmarkScore {
  source: BenchmarkSource | string;
  dimension: BenchmarkDimension;
  score: number;
  rawLabel?: string | null;
}

export interface ModelSummary {
  name: string;
  provider: string;
  contextWindow: number | null;
  costInputPer1M: number | null;
  costOutputPer1M: number | null;
}

export interface RankedModel {
  rank: number;
  model: ModelSummary;
  score: number;
  benchmarksUsed: BenchmarkScore[];
}
