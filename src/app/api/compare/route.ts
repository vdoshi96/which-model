import { z } from "zod";

const compareSchema = z.object({
  task: z.string().trim().min(1).max(500),
  modelNames: z.array(z.string().trim().min(1)).min(2).max(5),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = compareSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid comparison request." }, { status: 400 });
  }

  return Response.json({
    taskSummary: "Comparison engine is implemented by AGENT-004.",
    dimensions: {
      reasoning: 0,
      coding: 0,
      math: 0,
      instruction_following: 0,
      overall: 0,
      speed: 0,
      cost_efficiency: 0,
    },
    models: [],
  });
}
