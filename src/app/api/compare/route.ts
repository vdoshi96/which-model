import { interpretTask } from "@/lib/deepseek";
import { getPrisma } from "@/lib/db";
import { findCatalogModel, type CuratedModel } from "@/lib/modelCatalog";
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
type ScoreRecord = {
  source: string;
  dimension: string;
  score: number;
  rawLabel?: string | null;
};
type ComparedModelRecord = {
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
  const requestedCatalogModels = parsed.data.modelNames
    .map((modelName) => findCatalogModel(modelName))
    .filter((model): model is CuratedModel => model !== undefined);
  const lookupNames = Array.from(
    new Set([
      ...parsed.data.modelNames,
      ...requestedCatalogModels.map((model) => model.name),
      ...requestedCatalogModels.flatMap((model) => [
        ...(model.apiId ? [model.apiId] : []),
        ...model.aliases,
      ]),
    ]),
  );
  const models = (await prisma.model.findMany({
    where: { name: { in: lookupNames } },
    include: { scores: true },
  })) as ComparedModelRecord[];
  const modelsByNormalizedName = buildModelLookup(models);
  const resolvedModels = parsed.data.modelNames.map((modelName) => {
    const catalogModel = findCatalogModel(modelName);
    const model =
      modelsByNormalizedName.get(normalizeModelName(modelName)) ??
      (catalogModel
        ? modelsByNormalizedName.get(normalizeModelName(catalogModel.name))
        : undefined);

    return { catalogModel, model, requestedName: modelName };
  });

  if (
    resolvedModels.some(
      (resolved) => resolved.model === undefined && resolved.catalogModel === undefined,
    )
  ) {
    return Response.json(
      { error: "One or more requested models were not found." },
      { status: 404 },
    );
  }

  const response = {
    taskSummary: interpretation.summary,
    dimensions: interpretation.dimensions,
    models: resolvedModels.map(({ catalogModel, model, requestedName }) => {
      const benchmarks = toBenchmarkScores(model?.scores ?? []);
      const name = catalogModel?.name ?? model?.name ?? requestedName;

      return {
        name,
        provider: model?.provider || catalogModel?.provider || "Unknown",
        scores: buildDimensionScores(benchmarks),
        weightedScore: calculateWeightedScore(benchmarks, interpretation.dimensions),
        costInputPer1M:
          model?.costInputPer1M ?? catalogModel?.costInputPer1M ?? null,
        costOutputPer1M:
          model?.costOutputPer1M ?? catalogModel?.costOutputPer1M ?? null,
        contextWindow: model?.contextWindow ?? catalogModel?.contextWindow ?? null,
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

function normalizeModelName(name: string): string {
  return name.trim().toLowerCase();
}

function buildModelLookup(models: ComparedModelRecord[]) {
  const modelsByNormalizedName = new Map<string, ComparedModelRecord>();

  for (const model of models) {
    modelsByNormalizedName.set(normalizeModelName(model.name), model);

    const catalogModel = findCatalogModel(model.name);

    if (catalogModel) {
      modelsByNormalizedName.set(normalizeModelName(catalogModel.name), model);

      if (catalogModel.apiId) {
        modelsByNormalizedName.set(normalizeModelName(catalogModel.apiId), model);
      }

      for (const alias of catalogModel.aliases) {
        modelsByNormalizedName.set(normalizeModelName(alias), model);
      }
    }
  }

  return modelsByNormalizedName;
}
