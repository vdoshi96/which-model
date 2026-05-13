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

export interface RecommendationTier {
  id: "no_holds_barred" | "balanced" | "budget";
  label: string;
  description: string;
  recommendation: RankedModel | null;
  taskScore: number | null;
  selectionScore: number | null;
}

export interface RecommendationCatalogScope {
  selectedProviders: string[];
  selectedModels: string[];
  candidateCount: number;
}

export interface RecommendResponse {
  taskSummary: string;
  dimensions: TaskDimensions;
  recommendationTiers?: RecommendationTier[];
  catalogScope?: RecommendationCatalogScope;
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
  id: string;
  name: string;
  provider: string;
  contextWindow: number | null;
  costInputPer1M: number | null;
  costOutputPer1M: number | null;
  effortLevel?: string | null;
  hasBenchmarks: boolean;
  status: string;
}

export interface ModelProviderGroup {
  name: string;
  modelCount: number;
  benchmarkedCount: number;
}

export interface ModelsResponse {
  providers: ModelProviderGroup[];
  models: ModelCatalogItem[];
}
