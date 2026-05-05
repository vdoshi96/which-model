import type {
  BenchmarkDimension,
  BenchmarkScore,
  ExtendedBenchmarkDimension,
  RankedModel,
  RankingContribution,
  TaskDimensions,
} from "./model";

export interface ApiError {
  error: string;
}

export interface RecommendRequest {
  task: string;
}

export interface RecommendResponse {
  taskSummary: string;
  dimensions: TaskDimensions;
  recommendations: RankedModel[];
}

export interface CompareRequest {
  task: string;
  modelNames: string[];
}

export interface ComparedModel {
  name: string;
  provider: string;
  scores: Record<BenchmarkDimension, number | null> &
    Partial<Record<ExtendedBenchmarkDimension, number | null>>;
  weightedScore: number;
  costInputPer1M: number | null;
  costOutputPer1M?: number | null;
  contextWindow: number | null;
  evidenceCount?: number;
  missingEvidence?: string[];
  unavailableEvidence?: string[];
  provenanceSummary?: Record<string, number>;
  benchmarksUsed?: BenchmarkScore[];
  contributions?: RankingContribution[];
  rationale?: string | null;
}

export interface CompareResponse {
  taskSummary: string;
  dimensions: TaskDimensions;
  models: ComparedModel[];
}

export interface ModelCatalogItem {
  name: string;
  provider: string;
  contextWindow: number | null;
  costInputPer1M: number | null;
  costOutputPer1M: number | null;
  hasBenchmarks: boolean;
  status: string;
}

export interface ModelsResponse {
  models: ModelCatalogItem[];
}
