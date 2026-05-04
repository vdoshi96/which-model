import { getPrisma } from "@/lib/db";
import { mergeCatalogWithDbModels } from "@/lib/modelCatalog";

export const runtime = "nodejs";

type ModelCatalogRecord = {
  name: string;
  provider: string;
  contextWindow: number | null;
  costInputPer1M: number | null;
  costOutputPer1M: number | null;
  scores?: unknown[];
};

export async function GET() {
  const prisma = getPrisma();
  const dbModels = (await prisma.model.findMany({
    include: { scores: { select: { id: true } } },
  })) as ModelCatalogRecord[];

  return Response.json({
    models: mergeCatalogWithDbModels(dbModels),
  });
}
