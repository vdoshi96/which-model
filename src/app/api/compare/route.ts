import { auth } from "@/lib/auth";
import { loadCuratedCatalog } from "@/lib/curatedCatalog/loadCatalog";
import type {
  BenchmarkCategory,
  CuratedCatalog,
  CuratedCatalogModel,
} from "@/lib/curatedCatalog/schema";
import { interpretTask } from "@/lib/deepseek";
import { getPrisma } from "@/lib/db";
import {
  assertRateLimit,
  buildRateLimitKey,
  getClientIp,
  RateLimitError,
} from "@/lib/rateLimit";
import {
  buildRecommendationIntent,
  defaultRecommendationPreferences,
} from "@/lib/recommendation/preferences";
import { rankCuratedModels } from "@/lib/recommendation/rankCuratedModels";
import { compareRequestSchema } from "@/lib/validators/compare";
import type {
  BenchmarkScore,
  ExtendedBenchmarkDimension,
} from "@/types/model";

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

const COMPARE_DIMENSIONS: ExtendedBenchmarkDimension[] = [
  "reasoning",
  "coding",
  "math",
  "instruction_following",
  "creative_writing",
  "overall",
  "tool_use",
  "speed",
  "cost_efficiency",
  "long_context",
];

function logRouteError(message: string, ipAddress: string, error: unknown) {
  console.error(message, {
    timestamp: new Date().toISOString(),
    ipAddress,
    error: error instanceof Error ? error.message : String(error),
  });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: "Sign in to ask questions." }, { status: 401 });
  }

  const ipAddress = getClientIp(request);
  const body = await request.json().catch(() => null);
  const parsed = compareRequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid comparison request." }, { status: 400 });
  }

  if (!session.user.isAdmin) {
    try {
      await assertRateLimit(buildRateLimitKey(session.user.id, ipAddress));
    } catch (error) {
      if (error instanceof RateLimitError) {
        return Response.json({ error: error.message }, { status: 429 });
      }

      logRouteError("Comparison rate limit check failed.", ipAddress, error);
      return Response.json({ error: "Rate limit unavailable. Try again shortly." }, { status: 503 });
    }
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

  const catalog = loadCuratedCatalog();
  const resolvedModels = parsed.data.modelNames.map((modelName) => ({
    catalogModel: findCuratedModel(catalog.models, modelName),
    requestedName: modelName,
  }));

  if (resolvedModels.some((model) => model.catalogModel === undefined)) {
    return Response.json(
      { error: "One or more requested models were not found." },
      { status: 404 },
    );
  }

  const selectedModels = resolvedModels
    .map((model) => model.catalogModel)
    .filter((model): model is CuratedCatalogModel => model !== undefined);
  const preferences = {
    ...defaultRecommendationPreferences,
    preferFrontier: false,
    preferredModels: selectedModels.map((model) => model.id),
  };
  const recommendationIntent = buildRecommendationIntent({
    dimensions: interpretation.dimensions,
    preferences,
    summary: interpretation.summary,
  });
  const rankedModels = rankCuratedModels({
    catalog,
    intent: recommendationIntent,
    preferences,
    limit: selectedModels.length,
  });
  const rankedByName = new Map(
    rankedModels.map((entry) => [normalizeModelName(entry.model.name), entry]),
  );
  const response = {
    taskSummary: recommendationIntent.summary,
    dimensions: recommendationIntent.weights,
    models: selectedModels.map((model) => {
      const ranked = rankedByName.get(normalizeModelName(model.name));
      const benchmarks =
        ranked?.benchmarksUsed ?? buildBenchmarksUsed(catalog, model);

      return {
        name: model.name,
        provider: model.provider,
        scores: buildCategoryScores(benchmarks),
        weightedScore: ranked?.score ?? 0,
        costInputPer1M: model.costInputPer1M,
        costOutputPer1M: model.costOutputPer1M,
        contextWindow: model.contextWindow,
        evidenceCount: benchmarks.length,
        missingEvidence: ranked?.missingEvidence ?? [],
        unavailableEvidence: ranked?.unavailableEvidence ?? [],
        provenanceSummary: ranked?.provenanceSummary ?? {},
        benchmarksUsed: benchmarks,
        contributions: ranked?.contributions ?? [],
        rationale: ranked?.rationale ?? null,
      };
    }),
  };

  await getPrisma().query.create({
    data: {
      taskText: parsed.data.task,
      ipAddress,
      userId: session.user.isAdmin ? undefined : session.user.id,
      resultJson: toJsonValue(response),
    },
  });

  return Response.json(response);
}

function toJsonValue(value: unknown): JsonObject {
  return JSON.parse(JSON.stringify(value)) as JsonObject;
}

function findCuratedModel(models: CuratedCatalogModel[], name: string) {
  const normalizedName = normalizeModelName(name);

  return models.find((model) =>
    [model.id, model.name, ...model.apiIds, ...model.aliases].some(
      (candidate) => normalizeModelName(candidate) === normalizedName,
    ),
  );
}

function buildBenchmarksUsed(
  catalog: CuratedCatalog,
  model: CuratedCatalogModel,
): BenchmarkScore[] {
  const benchmarksById = new Map(
    catalog.benchmarks.map((benchmark) => [benchmark.id, benchmark]),
  );

  return catalog.scores
    .filter((score) => score.modelId === model.id)
    .map((score) => {
      const benchmark = benchmarksById.get(score.benchmarkId);

      return {
        source: score.benchmarkId,
        dimension: benchmark?.category ?? "overall",
        score: score.normalizedScore,
        rawLabel: score.rawLabel,
        provenance: score.provenance,
        sourceUrl: score.sourceUrl,
      };
    });
}

function buildCategoryScores(benchmarks: BenchmarkScore[]) {
  const scores = Object.fromEntries(
    COMPARE_DIMENSIONS.map((dimension) => [dimension, null]),
  ) as Record<ExtendedBenchmarkDimension, number | null>;
  const counts = Object.fromEntries(
    COMPARE_DIMENSIONS.map((dimension) => [dimension, 0]),
  ) as Record<ExtendedBenchmarkDimension, number>;

  for (const benchmark of benchmarks) {
    const dimension = benchmark.dimension as BenchmarkCategory &
      ExtendedBenchmarkDimension;

    if (!(dimension in scores)) {
      continue;
    }

    scores[dimension] = (scores[dimension] ?? 0) + benchmark.score;
    counts[dimension] += 1;
  }

  for (const dimension of COMPARE_DIMENSIONS) {
    if (scores[dimension] !== null) {
      scores[dimension] = scores[dimension] / counts[dimension];
    }
  }

  return scores;
}

function normalizeModelName(name: string): string {
  return name.trim().toLowerCase();
}
