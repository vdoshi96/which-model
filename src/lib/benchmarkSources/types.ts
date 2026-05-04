import type { BenchmarkDimension, BenchmarkSource } from "@/types/model";

export interface NormalizedBenchmarkRecord {
  modelName: string;
  provider: string;
  source: BenchmarkSource;
  dimension: BenchmarkDimension;
  score: number;
  rawLabel?: string;
  contextWindow?: number | null;
  costInputPer1M?: number | null;
  costOutputPer1M?: number | null;
}
