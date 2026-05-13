import { getPrisma } from "@/lib/db";
import { loadEffectiveCatalog } from "@/lib/recommendation/effectiveCatalog";

export const runtime = "nodejs";

export async function GET() {
  const catalog = await loadEffectiveCatalog(getPrisma());
  const scoreModelIds = new Set(catalog.scores.map((score) => score.modelId));
  const models = catalog.models
    .map((model) => ({
      id: model.id,
      name: model.name,
      provider: canonicalProviderName(model.provider),
      contextWindow: model.contextWindow,
      costInputPer1M: model.costInputPer1M,
      costOutputPer1M: model.costOutputPer1M,
      effortLevel: inferEffortLevel(model.name),
      hasBenchmarks: scoreModelIds.has(model.id),
      status: model.status,
    }))
    .sort(
      (left, right) =>
        left.provider.localeCompare(right.provider) ||
        left.name.localeCompare(right.name),
    );
  const providers = Array.from(
    models.reduce((groups, model) => {
      const providerKey = model.provider.toLowerCase();
      const current = groups.get(providerKey) ?? {
        name: model.provider,
        modelCount: 0,
        benchmarkedCount: 0,
      };

      current.modelCount += 1;
      current.benchmarkedCount += model.hasBenchmarks ? 1 : 0;
      groups.set(providerKey, current);

      return groups;
    }, new Map<string, { name: string; modelCount: number; benchmarkedCount: number }>()),
  )
    .map(([, provider]) => provider)
    .sort((left, right) => left.name.localeCompare(right.name));

  return Response.json({
    providers,
    models,
  });
}

function inferEffortLevel(modelName: string) {
  const effortMatch = modelName.match(/\(([^)]*(?:effort|reasoning|high|low|medium|xhigh|max)[^)]*)\)/i);

  return effortMatch?.[1] ?? null;
}

function canonicalProviderName(provider: string) {
  const knownProviders: Record<string, string> = {
    anthropic: "Anthropic",
    cohere: "Cohere",
    deepseek: "DeepSeek",
    google: "Google",
    meta: "Meta",
    "mistral ai": "Mistral AI",
    "moonshot ai": "Moonshot AI",
    openai: "OpenAI",
    xai: "xAI",
  };

  return knownProviders[provider.trim().toLowerCase()] ?? provider;
}
