import { auth } from "@/lib/auth";
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
  type RecommendationPreferences,
} from "@/lib/recommendation/preferences";
import { rankCuratedModels } from "@/lib/recommendation/rankCuratedModels";
import { rankRecommendationTiers } from "@/lib/recommendation/recommendationTiers";
import { recommendRequestSchema } from "@/lib/validators/recommend";

const TEMPORARY_INTERPRETATION_ERROR =
  "Task interpretation is temporarily unavailable. Try again shortly.";

export const runtime = "nodejs";

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
  const prisma = getPrisma();
  const catalog = await loadEffectiveCatalog(prisma);
  const recommendationIntent = buildRecommendationIntent({
    dimensions: interpretation.dimensions,
    preferences,
    summary: interpretation.summary,
  });
  const recommendationTiers = rankRecommendationTiers({
    catalog,
    intent: recommendationIntent,
    preferences,
  });
  const recommendations = rankCuratedModels({
    catalog,
    intent: recommendationIntent,
    preferences,
    limit: 10,
  });
  const response = {
    taskSummary: recommendationIntent.summary,
    dimensions: recommendationIntent.weights,
    recommendationTiers,
    catalogScope: {
      selectedProviders: preferences.preferredProviders,
      selectedModels: preferences.preferredModels,
      candidateCount: countScopedCandidates(catalog.models, preferences),
    },
    recommendations,
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
    logRouteError("Recommendation query audit logging failed.", ipAddress, error);
  }

  return Response.json(response);
}

function countScopedCandidates(
  models: Awaited<ReturnType<typeof loadEffectiveCatalog>>["models"],
  preferences: RecommendationPreferences,
) {
  const preferredProviders = new Set(
    preferences.preferredProviders.map(normalizeScopeValue),
  );
  const preferredModels = new Set(
    preferences.preferredModels.map(normalizeScopeValue),
  );

  if (preferredProviders.size === 0 && preferredModels.size === 0) {
    return models.length;
  }

  return models.filter((model) => {
    const providerMatches = preferredProviders.has(
      normalizeScopeValue(model.provider),
    );
    const modelMatches = [model.id, model.name, ...model.apiIds, ...model.aliases]
      .map(normalizeScopeValue)
      .some((value) => preferredModels.has(value));

    return providerMatches || modelMatches;
  }).length;
}

function normalizeScopeValue(value: string) {
  return value.trim().toLowerCase();
}
