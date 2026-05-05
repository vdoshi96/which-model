import { loadCuratedCatalog } from "@/lib/curatedCatalog/loadCatalog";

export const runtime = "nodejs";

export async function GET() {
  const catalog = loadCuratedCatalog();
  const scoreModelIds = new Set(catalog.scores.map((score) => score.modelId));

  return Response.json({
    models: catalog.models
      .map((model) => ({
        name: model.name,
        provider: model.provider,
        contextWindow: model.contextWindow,
        costInputPer1M: model.costInputPer1M,
        costOutputPer1M: model.costOutputPer1M,
        hasBenchmarks: scoreModelIds.has(model.id),
        status: model.status,
      }))
      .sort(
        (left, right) =>
          left.provider.localeCompare(right.provider) ||
          left.name.localeCompare(right.name),
      ),
  });
}
