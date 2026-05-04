import { z } from "zod";

export const recommendRequestSchema = z.object({
  task: z.string().trim().min(1).max(500),
});

export type RecommendRequestInput = z.infer<typeof recommendRequestSchema>;
