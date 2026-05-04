import { interpretTask } from "@/lib/deepseek";
import { getPrisma } from "@/lib/db";
import { assertRateLimit, getClientIp, RateLimitError } from "@/lib/rateLimit";
import {
  BENCHMARK_DIMENSIONS,
  buildDimensionScores,
  calculateWeightedScore,
} from "@/lib/scoring";
import { compareRequestSchema } from "@/lib/validators/compare";
import type { BenchmarkDimension, BenchmarkScore } from "@/types/model";

const TEMPORARY_INTERPRETATION_ERROR =
  "Task interpretation is temporarily unavailable. Try again shortly.";

export const runtime = "nodejs";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

function logRouteError(message: string, ipAddress: string, error: unknown) {
  console.error(message, {
    timestamp: new Date().toISOString(),
    ipAddress,
    error: error instanceof Error ? error.message : String(error),
  });
}

function toBenchmarkScores(
  scores: Array<{
    source: string;
    dimension: string;
    score: number;
    rawLabel?: string | null;
  }>,
): BenchmarkScore[] {
  return scores
    .filter((score) =>
      BENCHMARK_DIMENSIONS.includes(score.dimension as BenchmarkDimension),
    )
    .map((score) => ({
      source: score.source,
      dimension: score.dimension as BenchmarkDimension,
      score: score.score,
      rawLabel: score.rawLabel,
    }));
}

export async function POST(request: Request) {
  const ipAddress = getClientIp(request);
  const body = await request.json().catch(() => null);
  const parsed = compareRequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid comparison request." }, { status: 400 });
  }

  try {
    await assertRateLimit(ipAddress);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return Response.json({ error: error.message }, { status: 429 });
    }

    logRouteError("Comparison rate limit check failed.", ipAddress, error);
    return Response.json({ error: "Rate limit unavailable. Try again shortly." }, { status: 503 });
  }

  let interpretation;

  try {
    interpretation = await interpretTask(parsed.data.task);
  } catch (error) {
    logRouteError("Comparison task interpretation failed.", ipAddress, error);
    return Response.json({ error: TEMPORARY_INTERPRETATION_ERROR }, { status: 503 });
  }

  if (interpretation.refused) {
    return Response.json({ error: interpretation.reason }, { status: 400 });
  }

  const prisma = getPrisma();
  const models = await prisma.model.findMany({
    where: { name: { in: parsed.data.modelNames } },
    include: { scores: true },
  });

  if (models.length !== parsed.data.modelNames.length) {
    return Response.json(
      { error: "One or more requested models were not found." },
      { status: 404 },
    );
  }

  const response = {
    taskSummary: interpretation.summary,
    dimensions: interpretation.dimensions,
    models: models.map((model) => {
      const benchmarks = toBenchmarkScores(model.scores);

      return {
        name: model.name,
        provider: model.provider,
        scores: buildDimensionScores(benchmarks),
        weightedScore: calculateWeightedScore(benchmarks, interpretation.dimensions),
        costInputPer1M: model.costInputPer1M,
        contextWindow: model.contextWindow,
      };
    }),
  };

  await prisma.query.create({
    data: {
      taskText: parsed.data.task,
      ipAddress,
      resultJson: toJsonValue(response),
    },
  });

  return Response.json(response);
}

function toJsonValue(value: unknown): JsonObject {
  return JSON.parse(JSON.stringify(value)) as JsonObject;
}
