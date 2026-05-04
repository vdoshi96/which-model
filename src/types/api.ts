import type { BenchmarkDimension, RankedModel, TaskDimensions } from "./model";

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
  scores: Partial<Record<BenchmarkDimension, number>>;
  weightedScore: number;
  costInputPer1M: number | null;
  contextWindow: number | null;
}

export interface CompareResponse {
  taskSummary: string;
  dimensions: TaskDimensions;
  models: ComparedModel[];
}
