import { z } from "zod";

export const compareRequestSchema = z.object({
  task: z.string().trim().min(1).max(500),
  modelNames: z.array(z.string().trim().min(1)).min(2).max(5),
});

export type CompareRequestInput = z.infer<typeof compareRequestSchema>;
