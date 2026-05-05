export type BenchmarkDimension =
  | "reasoning"
  | "coding"
  | "math"
  | "instruction_following"
  | "overall"
  | "speed"
  | "cost_efficiency";

export type ExtendedBenchmarkDimension =
  | BenchmarkDimension
  | "creative_writing"
  | "tool_use"
  | "long_context";

export type BenchmarkSource =
  | "catalog_prior"
  | "aider_polyglot"
  | "artificial_analysis"
  | "bfcl"
  | "lmsys_arena"
  | "hf_leaderboard"
  | "livebench"
  | "swe_bench";

export type TaskDimensions = Record<BenchmarkDimension, number> &
  Partial<Record<Exclude<ExtendedBenchmarkDimension, BenchmarkDimension>, number>>;

export interface BenchmarkScore {
  source: BenchmarkSource | string;
  dimension: ExtendedBenchmarkDimension;
  score: number;
  rawLabel?: string | null;
  provenance?: string;
  sourceUrl?: string;
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
  evidenceCount?: number;
  missingEvidence?: string[];
  unavailableEvidence?: string[];
  provenanceSummary?: Record<string, number>;
  contributions?: RankingContribution[];
  rationale?: string;
}

export interface RankingContribution {
  label: ExtendedBenchmarkDimension;
  value: number;
  weight: number;
  contribution: number;
}
