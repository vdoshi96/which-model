import { z } from "zod";

import { recommendationPreferencesSchema } from "@/lib/recommendation/preferences";

export const recommendRequestSchema = z.object({
  task: z.string().trim().min(1).max(500),
  preferences: recommendationPreferencesSchema.optional(),
});

export type RecommendRequestInput = z.infer<typeof recommendRequestSchema>;
