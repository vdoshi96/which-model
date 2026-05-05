import { z } from "zod";

import type { TaskDimensions } from "@/types/model";

type InterpretedTaskDimensions = TaskDimensions & {
  creative_writing?: number;
};

export const recommendationPreferencesSchema = z.object({
  costSensitive: z.boolean().default(false),
  preferFrontier: z.boolean().default(true),
  latencySensitive: z.boolean().default(false),
  needsLongContext: z.boolean().default(false),
  localOnly: z.boolean().default(false),
  preferredProviders: z.array(z.string()).default([]),
  preferredModels: z.array(z.string()).default([]),
  infrastructure: z.array(z.string()).default([]),
});

export type RecommendationPreferences = z.infer<
  typeof recommendationPreferencesSchema
>;

export const defaultRecommendationPreferences: RecommendationPreferences = {
  costSensitive: false,
  preferFrontier: true,
  latencySensitive: false,
  needsLongContext: false,
  localOnly: false,
  preferredProviders: [],
  preferredModels: [],
  infrastructure: [],
};

export interface RecommendationIntent {
  summary: string;
  weights: TaskDimensions & {
    creative_writing: number;
    tool_use: number;
  long_context: number;
  };
}

export function buildRecommendationIntent({
  dimensions,
  preferences,
  summary,
}: {
  dimensions: InterpretedTaskDimensions;
  preferences: RecommendationPreferences;
  summary: string;
}): RecommendationIntent {
  return {
    summary,
    weights: {
      ...dimensions,
      creative_writing: dimensions.creative_writing ?? dimensions.overall,
      tool_use: dimensions.instruction_following,
      long_context: preferences.needsLongContext ? 1 : 0,
      cost_efficiency: preferences.costSensitive
        ? Math.max(dimensions.cost_efficiency, 0.75)
        : dimensions.cost_efficiency,
      speed: preferences.latencySensitive
        ? Math.max(dimensions.speed, 0.75)
        : dimensions.speed,
    },
  };
}
