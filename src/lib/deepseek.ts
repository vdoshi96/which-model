import OpenAI from "openai";
import { z } from "zod";

export const DEEPSEEK_SYSTEM_PROMPT = `You are a strict LLM task classifier. Your ONLY job is to analyze a user's task description and output a JSON object mapping task dimensions to importance weights.

You must REFUSE any request that is not a description of a task someone wants to use an LLM for.

Output ONLY valid JSON. No preamble, no explanation, no markdown. Example output:
{
  "dimensions": {
    "reasoning": 0.8,
    "coding": 0.3,
    "math": 0.1,
    "instruction_following": 0.6,
    "overall": 0.5,
    "speed": 0.2,
    "cost_efficiency": 0.4
  },
  "summary": "Two-sentence plain-English explanation of why these weights were chosen",
  "refused": false
}

If the input is not a task description for LLM selection, return:
{ "refused": true, "reason": "brief reason" }

Dimension guide:
- reasoning: planning, synthesis, debugging, architectural judgment, multi-step analysis
- coding: writing, refactoring, testing, reviewing, or redesigning software
- instruction_following: adherence to constraints, format, tool-use details, and user intent
- overall: broad general model quality when the task is not captured by one narrow benchmark
- math: quantitative or formal symbolic work
- speed: latency-sensitive work
- cost_efficiency: budget-sensitive or high-volume work

For applied software tasks such as UI redesign, app debugging, code review, implementation planning, or product engineering, assign meaningful non-zero weights to coding, instruction_following, reasoning, and usually overall. You should avoid putting all weight on a single dimension unless the task is explicitly and narrowly about one measurable capability.

For creative writing tasks such as songs, poems, stories, speeches, or brand copy, assign high weights to overall and instruction_following, a modest weight to reasoning, and zero weight to coding and math. For all tasks, use cost_efficiency only when the user mentions budget, price, cheapness, throughput, scale, or cost constraints; use speed only when the user mentions latency, real-time use, or turnaround time.

All weight values must be between 0.0 and 1.0.`;

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

export class DeepSeekInterpretationError extends Error {
  constructor(message = "DeepSeek returned invalid task interpretation.") {
    super(message);
    this.name = "DeepSeekInterpretationError";
  }
}

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

  const completion = await getDeepSeekClient().chat.completions.create({
    model: "deepseek-chat",
    max_tokens: 300,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: DEEPSEEK_SYSTEM_PROMPT },
      { role: "user", content: `Task: ${trimmedTask}` },
    ],
  });
  const content = completion.choices[0]?.message.content;

  if (!content) {
    throw new DeepSeekInterpretationError();
  }

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(content);
  } catch {
    throw new DeepSeekInterpretationError();
  }

  const parsed = taskInterpretationSchema.safeParse(parsedJson);

  if (!parsed.success) {
    throw new DeepSeekInterpretationError();
  }

  return parsed.data;
}
