import OpenAI from "openai";
import { z } from "zod";

const taskDimensionsSchema = z.object({
  reasoning: z.number().min(0).max(1),
  coding: z.number().min(0).max(1),
  math: z.number().min(0).max(1),
  instruction_following: z.number().min(0).max(1),
  overall: z.number().min(0).max(1),
  speed: z.number().min(0).max(1),
  cost_efficiency: z.number().min(0).max(1),
});

export const taskInterpretationSchema = z.union([
  z.object({
    refused: z.literal(false),
    dimensions: taskDimensionsSchema,
    summary: z.string(),
  }),
  z.object({
    refused: z.literal(true),
    reason: z.string(),
  }),
]);

export type TaskInterpretation = z.infer<typeof taskInterpretationSchema>;

let client: OpenAI | null = null;

export function getDeepSeekClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
    });
  }

  return client;
}

export async function interpretTask(task: string): Promise<TaskInterpretation> {
  const trimmedTask = task.slice(0, 500);

  if (!trimmedTask.trim()) {
    return { refused: true, reason: "Task description is required." };
  }

  throw new Error(
    "DeepSeek task interpretation is implemented by AGENT-004.",
  );
}
