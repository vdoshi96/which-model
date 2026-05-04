import { interpretTask } from "@/lib/deepseek";
import { getPrisma } from "@/lib/db";
import { findCatalogModel } from "@/lib/modelCatalog";
import { assertRateLimit, getClientIp, RateLimitError } from "@/lib/rateLimit";
import { BENCHMARK_DIMENSIONS, rankModels } from "@/lib/scoring";
import { recommendRequestSchema } from "@/lib/validators/recommend";
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
type ScoreRecord = {
  source: string;
  dimension: string;
  score: number;
  rawLabel?: string | null;
};
type RecommendedModelRecord = {
  name: string;
  provider: string;
  contextWindow: number | null;
  costInputPer1M: number | null;
  costOutputPer1M: number | null;
  scores: ScoreRecord[];
};

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
  const parsed = recommendRequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid recommendation request." }, { status: 400 });
  }

  try {
    await assertRateLimit(ipAddress);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return Response.json({ error: error.message }, { status: 429 });
    }

    logRouteError("Recommendation rate limit check failed.", ipAddress, error);
    return Response.json({ error: "Rate limit unavailable. Try again shortly." }, { status: 503 });
  }

  let interpretation;

  try {
    interpretation = await interpretTask(parsed.data.task);
  } catch (error) {
    logRouteError("Recommendation task interpretation failed.", ipAddress, error);
    return Response.json({ error: TEMPORARY_INTERPRETATION_ERROR }, { status: 503 });
  }

  if (interpretation.refused) {
    return Response.json({ error: interpretation.reason }, { status: 400 });
  }

  const prisma = getPrisma();
  const models = (await prisma.model.findMany({
    include: { scores: true },
  })) as RecommendedModelRecord[];
  const recommendations = rankModels(
    models
      .map((model) => {
        const catalogModel = findCatalogModel(model.name);
        const benchmarks = toBenchmarkScores(model.scores);

        return {
          name: catalogModel?.name ?? model.name,
          provider: model.provider || catalogModel?.provider || "Unknown",
          contextWindow: model.contextWindow ?? catalogModel?.contextWindow ?? null,
          costInputPer1M:
            model.costInputPer1M ?? catalogModel?.costInputPer1M ?? null,
          costOutputPer1M:
            model.costOutputPer1M ?? catalogModel?.costOutputPer1M ?? null,
          benchmarks,
        };
      })
      .filter((model) => model.benchmarks.length > 0),
    interpretation.dimensions,
    10,
  );
  const response = {
    taskSummary: interpretation.summary,
    dimensions: interpretation.dimensions,
    recommendations,
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
