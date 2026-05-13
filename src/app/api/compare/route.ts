import { auth } from "@/lib/auth";
import type {
  BenchmarkCategory,
  CuratedCatalog,
  CuratedCatalogModel,
} from "@/lib/curatedCatalog/schema";
import { interpretTask } from "@/lib/deepseek";
import { getPrisma } from "@/lib/db";
import { buildQueryLogData } from "@/lib/queryAudit";
import { loadEffectiveCatalog } from "@/lib/recommendation/effectiveCatalog";
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
  RankedModel,
} from "@/types/model";

const TEMPORARY_INTERPRETATION_ERROR =
  "Task interpretation is temporarily unavailable. Try again shortly.";
const MAX_COMPARE_MODELS = 5;

export const runtime = "nodejs";

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

  const prisma = getPrisma();
  const catalog = await loadEffectiveCatalog(prisma);
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
  const selectedModelIds = selectedModels.map((model) => model.id);
  const preferences = defaultRecommendationPreferences;
  const recommendationIntent = buildRecommendationIntent({
    dimensions: interpretation.dimensions,
    preferences,
    summary: interpretation.summary,
  });
  const rankedModels = rankCuratedModels({
    catalog,
    intent: recommendationIntent,
    preferences,
    limit: catalog.models.length,
    requiredModelIds: selectedModelIds,
  });
  const comparisonModels = buildComparisonModels({
    catalog,
    rankedModels,
    selectedModels,
  });
  const response = {
    taskSummary: recommendationIntent.summary,
    dimensions: recommendationIntent.weights,
    models: comparisonModels,
  };

  try {
    await prisma.query.create({
      data: buildQueryLogData({
        task: parsed.data.task,
        ipAddress,
        userId: session.user.isAdmin ? undefined : session.user.id,
        result: response,
      }),
    });
  } catch (error) {
    logRouteError("Comparison query audit logging failed.", ipAddress, error);
  }

  return Response.json(response);
}

function buildComparisonModels({
  catalog,
  rankedModels,
  selectedModels,
}: {
  catalog: CuratedCatalog;
  rankedModels: RankedModel[];
  selectedModels: CuratedCatalogModel[];
}) {
  const rankedByName = new Map(
    rankedModels.map((entry) => [normalizeModelName(entry.model.name), entry]),
  );
  const selectedEntries = selectedModels.map(
    (model) =>
      rankedByName.get(normalizeModelName(model.name)) ??
      buildFallbackRankedModel(catalog, model),
  );
  const includedNames = new Set(
    selectedEntries.map((entry) => normalizeModelName(entry.model.name)),
  );
  const filledEntries = [...selectedEntries];

  for (const rankedModel of rankedModels) {
    const normalizedName = normalizeModelName(rankedModel.model.name);

    if (filledEntries.length >= MAX_COMPARE_MODELS) {
      break;
    }

    if (includedNames.has(normalizedName)) {
      continue;
    }

    filledEntries.push(rankedModel);
    includedNames.add(normalizedName);
  }

  return filledEntries
    .sort(compareRankedModelsForDisplay)
    .slice(0, MAX_COMPARE_MODELS)
    .map(toComparedModel);
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

function buildFallbackRankedModel(
  catalog: CuratedCatalog,
  model: CuratedCatalogModel,
): RankedModel {
  const benchmarks = buildBenchmarksUsed(catalog, model);

  return {
    rank: 0,
    model: {
      name: model.name,
      provider: model.provider,
      contextWindow: model.contextWindow,
      costInputPer1M: model.costInputPer1M,
      costOutputPer1M: model.costOutputPer1M,
    },
    score: 0,
    benchmarksUsed: benchmarks,
    evidenceCount: benchmarks.length,
    missingEvidence: [],
    unavailableEvidence: [],
    provenanceSummary: summarizeProvenance(benchmarks),
    contributions: [],
    rationale: null,
  };
}

function toComparedModel(ranked: RankedModel) {
  const benchmarks = ranked.benchmarksUsed;

  return {
    name: ranked.model.name,
    provider: ranked.model.provider,
    scores: buildCategoryScores(benchmarks),
    weightedScore: ranked.score,
    costInputPer1M: ranked.model.costInputPer1M,
    costOutputPer1M: ranked.model.costOutputPer1M,
    contextWindow: ranked.model.contextWindow,
    evidenceCount: ranked.evidenceCount ?? benchmarks.length,
    missingEvidence: ranked.missingEvidence ?? [],
    unavailableEvidence: ranked.unavailableEvidence ?? [],
    provenanceSummary: ranked.provenanceSummary ?? summarizeProvenance(benchmarks),
    benchmarksUsed: benchmarks,
    contributions: ranked.contributions ?? [],
    rationale: ranked.rationale ?? null,
  };
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

function summarizeProvenance(benchmarks: BenchmarkScore[]) {
  return benchmarks.reduce<Record<string, number>>((summary, benchmark) => {
    const provenance = benchmark.provenance ?? "unknown";

    summary[provenance] = (summary[provenance] ?? 0) + 1;

    return summary;
  }, {});
}

function compareRankedModelsForDisplay(left: RankedModel, right: RankedModel) {
  const scoreDifference = right.score - left.score;

  if (scoreDifference !== 0) {
    return scoreDifference;
  }

  return left.model.name.localeCompare(right.model.name);
}

function normalizeModelName(name: string): string {
  return name.trim().toLowerCase();
}
