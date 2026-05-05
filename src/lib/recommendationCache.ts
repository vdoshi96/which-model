import type { RecommendResponse } from "@/types/api";

const RECOMMENDATION_CACHE_VERSION = 2;

type RecommendationCacheEnvelope = {
  payload: RecommendResponse;
  task: string;
  version: number;
};

export function serializeRecommendationCache(
  task: string,
  payload: RecommendResponse,
) {
  return JSON.stringify({
    payload,
    task,
    version: RECOMMENDATION_CACHE_VERSION,
  } satisfies RecommendationCacheEnvelope);
}

export function parseRecommendationCache(
  raw: string | null,
  task: string,
): RecommendResponse | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<RecommendationCacheEnvelope>;

    if (
      parsed.version !== RECOMMENDATION_CACHE_VERSION ||
      parsed.task !== task ||
      !parsed.payload?.recommendations?.length
    ) {
      return null;
    }

    return parsed.payload;
  } catch {
    return null;
  }
}

export function parseRecommendationModelNames(raw: string | null): string[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (Array.isArray(parsed)) {
      return parsed.filter(
        (modelName): modelName is string =>
          typeof modelName === "string" && modelName.trim().length > 0,
      );
    }

    const response = getCachedResponsePayload(parsed);

    return (
      response?.recommendations
        ?.map((recommendation) => recommendation.model.name)
        .filter(Boolean) ?? []
    );
  } catch {
    return [];
  }
}

function getCachedResponsePayload(value: unknown): RecommendResponse | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const maybeEnvelope = value as Partial<RecommendationCacheEnvelope>;

  if (maybeEnvelope.payload?.recommendations) {
    return maybeEnvelope.payload;
  }

  const maybeResponse = value as Partial<RecommendResponse>;

  if (maybeResponse.recommendations) {
    return maybeResponse as RecommendResponse;
  }

  return null;
}
