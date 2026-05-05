import { auth } from "@/lib/auth";
import {
  buildCatalogPriorScores,
  shouldUseCatalogPriors,
} from "@/lib/catalogPriors";
import { loadCuratedCatalog } from "@/lib/curatedCatalog/loadCatalog";
import type { CuratedCatalogModel } from "@/lib/curatedCatalog/schema";
import { interpretTask } from "@/lib/deepseek";
import { getPrisma } from "@/lib/db";
import {
  findCatalogModel,
  isDisplayableModelName,
  listCatalogModels,
} from "@/lib/modelCatalog";
import {
  assertRateLimit,
  buildRateLimitKey,
  getClientIp,
  RateLimitError,
} from "@/lib/rateLimit";
import {
  buildRecommendationIntent,
  defaultRecommendationPreferences,
  type RecommendationPreferences,
} from "@/lib/recommendation/preferences";
import {
  isUsableBenchmarkScore,
  rankModels,
} from "@/lib/scoring";
import { recommendRequestSchema } from "@/lib/validators/recommend";
import type {
  BenchmarkDimension,
  BenchmarkScore,
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
type RecommendationCandidate = {
  name: string;
  provider: string;
  contextWindow: number | null;
  costInputPer1M: number | null;
  costOutputPer1M: number | null;
  benchmarks: BenchmarkScore[];
  curatedMetadata?: CuratedCatalogModel;
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
      isUsableBenchmarkScore(score),
    )
    .map((score) => ({
      source: score.source,
      dimension: score.dimension as BenchmarkDimension,
      score: score.score,
      rawLabel: score.rawLabel,
    }));
}

function normalizePreferenceValue(value: string): string {
  return value.trim().toLowerCase();
}

function buildCuratedModelLookup(models: CuratedCatalogModel[]) {
  const lookup = new Map<string, CuratedCatalogModel>();

  for (const model of models) {
    for (const key of [
      model.id,
      model.name,
      ...model.apiIds,
      ...model.aliases,
    ]) {
      lookup.set(normalizePreferenceValue(key), model);
    }
  }

  return lookup;
}

function findCuratedMetadata(
  lookup: Map<string, CuratedCatalogModel>,
  name: string,
) {
  return lookup.get(normalizePreferenceValue(name));
}

function matchesPreferredModel(
  candidate: RecommendationCandidate,
  preferredModels: Set<string>,
) {
  if (preferredModels.size === 0) {
    return true;
  }

  const metadata = candidate.curatedMetadata;
  const candidateNames = [
    candidate.name,
    ...(metadata
      ? [metadata.id, metadata.name, ...metadata.apiIds, ...metadata.aliases]
      : []),
  ];

  return candidateNames.some((name) =>
    preferredModels.has(normalizePreferenceValue(name)),
  );
}

function applyRecommendationPreferences(
  candidates: RecommendationCandidate[],
  preferences: RecommendationPreferences,
) {
  let filtered = candidates;
  const preferredProviders = new Set(
    preferences.preferredProviders.map(normalizePreferenceValue),
  );
  const preferredModels = new Set(
    preferences.preferredModels.map(normalizePreferenceValue),
  );
  const preferredInfrastructure = new Set(
    preferences.infrastructure.map(normalizePreferenceValue),
  );

  if (preferredProviders.size > 0) {
    filtered = filtered.filter((candidate) =>
      preferredProviders.has(normalizePreferenceValue(candidate.provider)),
    );
  }

  if (preferredModels.size > 0) {
    filtered = filtered.filter((candidate) =>
      matchesPreferredModel(candidate, preferredModels),
    );
  }

  if (preferredInfrastructure.size > 0) {
    filtered = filtered.filter((candidate) =>
      candidate.curatedMetadata?.infrastructure.some((entry) =>
        preferredInfrastructure.has(normalizePreferenceValue(entry)),
      ),
    );
  }

  if (preferences.localOnly) {
    filtered = filtered.filter((candidate) =>
      candidate.curatedMetadata?.infrastructure.some(
        (entry) => normalizePreferenceValue(entry) === "local",
      ),
    );
  }

  if (preferences.needsLongContext) {
    filtered = filtered.filter(
      (candidate) => (candidate.contextWindow ?? 0) >= 1_000_000,
    );
  }

  if (preferences.preferFrontier) {
    const frontier = filtered.filter(
      (candidate) => candidate.curatedMetadata?.status === "frontier",
    );

    if (frontier.length >= 2) {
      filtered = frontier;
    }
  }

  return filtered;
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: "Sign in to ask questions." }, { status: 401 });
  }

  const ipAddress = getClientIp(request);
  const body = await request.json().catch(() => null);
  const parsed = recommendRequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid recommendation request." }, { status: 400 });
  }

  if (!session.user.isAdmin) {
    try {
      await assertRateLimit(buildRateLimitKey(session.user.id, ipAddress));
    } catch (error) {
      if (error instanceof RateLimitError) {
        return Response.json({ error: error.message }, { status: 429 });
      }

      logRouteError("Recommendation rate limit check failed.", ipAddress, error);
      return Response.json({ error: "Rate limit unavailable. Try again shortly." }, { status: 503 });
    }
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

  const preferences = parsed.data.preferences ?? defaultRecommendationPreferences;
  const recommendationIntent = buildRecommendationIntent({
    dimensions: interpretation.dimensions,
    preferences,
    summary: interpretation.summary,
  });
  const scoringDimensions = recommendationIntent.weights;

  const prisma = getPrisma();
  const models = (await prisma.model.findMany({
    include: { scores: true },
  })) as RecommendedModelRecord[];
  const curatedModelLookup = buildCuratedModelLookup(loadCuratedCatalog().models);
  const useCatalogPriors = shouldUseCatalogPriors(scoringDimensions);
  const recommendationCandidates = new Map<string, RecommendationCandidate>();

  for (const model of models) {
    const catalogModel = findCatalogModel(model.name);

    if (!catalogModel && !isDisplayableModelName(model.name)) {
      continue;
    }

    const benchmarks = [
      ...toBenchmarkScores(model.scores),
      ...(useCatalogPriors && catalogModel
        ? buildCatalogPriorScores(catalogModel)
        : []),
    ];

    if (benchmarks.length === 0) {
      continue;
    }

    const name = catalogModel?.name ?? model.name;
    const curatedMetadata = findCuratedMetadata(curatedModelLookup, name);

    recommendationCandidates.set(name, {
      name,
      provider: model.provider || catalogModel?.provider || "Unknown",
      contextWindow: model.contextWindow ?? catalogModel?.contextWindow ?? null,
      costInputPer1M:
        model.costInputPer1M ?? catalogModel?.costInputPer1M ?? null,
      costOutputPer1M:
        model.costOutputPer1M ?? catalogModel?.costOutputPer1M ?? null,
      benchmarks,
      curatedMetadata,
    });
  }

  if (useCatalogPriors) {
    for (const catalogModel of listCatalogModels()) {
      if (recommendationCandidates.has(catalogModel.name)) {
        continue;
      }

      const benchmarks = buildCatalogPriorScores(catalogModel);

      if (benchmarks.length === 0) {
        continue;
      }

      const curatedMetadata = findCuratedMetadata(
        curatedModelLookup,
        catalogModel.name,
      );

      recommendationCandidates.set(catalogModel.name, {
        name: catalogModel.name,
        provider: catalogModel.provider,
        contextWindow: catalogModel.contextWindow,
        costInputPer1M: catalogModel.costInputPer1M,
        costOutputPer1M: catalogModel.costOutputPer1M,
        benchmarks,
        curatedMetadata,
      });
    }
  }

  const filteredCandidates = applyRecommendationPreferences(
    Array.from(recommendationCandidates.values()),
    preferences,
  );
  const recommendations = rankModels(
    filteredCandidates,
    scoringDimensions,
    10,
  );
  const response = {
    taskSummary: recommendationIntent.summary,
    dimensions: scoringDimensions,
    recommendations,
  };

  await prisma.query.create({
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
