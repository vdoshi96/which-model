import { getPrisma } from "@/lib/db";
import { applyCatalogMetadata } from "@/lib/modelCatalog";

import { fetchAiderPolyglot } from "./aider";
import { fetchArtificialAnalysis } from "./artificialAnalysis";
import { fetchBfcl } from "./bfcl";
import { fetchHfLeaderboard } from "./hfLeaderboard";
import { fetchLiveBench } from "./livebench";
import { fetchLmsysArena } from "./lmsysArena";
import { clampScore } from "./normalization";
import { fetchSweBench } from "./sweBench";
import type { NormalizedBenchmarkRecord } from "./types";

type Fetcher = {
  source: NormalizedBenchmarkRecord["source"];
  fetch: () => Promise<NormalizedBenchmarkRecord[]>;
};

const fetchers: Fetcher[] = [
  { source: "artificial_analysis", fetch: fetchArtificialAnalysis },
  { source: "lmsys_arena", fetch: fetchLmsysArena },
  { source: "hf_leaderboard", fetch: fetchHfLeaderboard },
  { source: "livebench", fetch: fetchLiveBench },
  { source: "aider_polyglot", fetch: fetchAiderPolyglot },
  { source: "swe_bench", fetch: fetchSweBench },
  { source: "bfcl", fetch: fetchBfcl },
];

export async function fetchAllBenchmarkSources(): Promise<
  NormalizedBenchmarkRecord[]
> {
  const results = await Promise.allSettled(
    fetchers.map(async (fetcher) => ({
      source: fetcher.source,
      records: await fetcher.fetch(),
    })),
  );

  const records = results.flatMap((result) => {
    if (result.status === "fulfilled") {
      return result.value.records;
    }

    console.error("[benchmark-source-error]", {
      message:
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason),
    });
    return [];
  });

  return dedupeRecords(records);
}

export interface BenchmarkRefreshResult {
  recordsFetched: number;
  modelsUpserted: number;
  scoresUpserted: number;
  scoresDeleted?: number;
}

type BenchmarkPrisma = {
  model: {
    upsert: (args: {
      where: { name: string };
      create: ModelCreateInput;
      update: ModelUpdateInput;
    }) => Promise<{ id: string }>;
  };
  benchmarkScore: {
    upsert: (args: {
      where: {
        modelId_source_dimension: {
          modelId: string;
          source: string;
          dimension: string;
        };
      };
      create: BenchmarkScoreCreateInput;
      update: BenchmarkScoreUpdateInput;
    }) => Promise<unknown>;
    deleteMany?: (args: {
      where: {
        source: string;
        rawLabel: { startsWith: string };
      };
    }) => Promise<{ count: number }>;
  };
};

type ModelCreateInput = {
  name: string;
  provider: string;
  contextWindow: number | null;
  costInputPer1M: number | null;
  costOutputPer1M: number | null;
};

type ModelUpdateInput = {
  provider: string;
  contextWindow?: number | null;
  costInputPer1M?: number | null;
  costOutputPer1M?: number | null;
};

type BenchmarkScoreCreateInput = {
  modelId: string;
  source: string;
  dimension: string;
  score: number;
  rawLabel: string | null;
};

type BenchmarkScoreUpdateInput = {
  score: number;
  rawLabel: string | null;
  fetchedAt: Date;
};

export async function refreshBenchmarkData(
  prisma: BenchmarkPrisma = getPrisma(),
): Promise<BenchmarkRefreshResult> {
  const records = await fetchAllBenchmarkSources();
  const result = await upsertBenchmarkRecords(records, prisma);
  const scoresDeleted = await deleteKnownInvalidBenchmarkArtifacts(prisma);

  return { ...result, scoresDeleted };
}

export async function upsertBenchmarkRecords(
  records: NormalizedBenchmarkRecord[],
  prisma: BenchmarkPrisma,
): Promise<BenchmarkRefreshResult> {
  const touchedModels = new Set<string>();
  let scoresUpserted = 0;

  for (const record of records) {
    const enrichedRecord = applyCatalogMetadata(record);
    const model = await prisma.model.upsert({
      where: { name: enrichedRecord.modelName },
      create: {
        name: enrichedRecord.modelName,
        provider: enrichedRecord.provider,
        contextWindow: enrichedRecord.contextWindow ?? null,
        costInputPer1M: enrichedRecord.costInputPer1M ?? null,
        costOutputPer1M: enrichedRecord.costOutputPer1M ?? null,
      },
      update: buildModelUpdate(enrichedRecord),
    });

    touchedModels.add(model.id);

    await prisma.benchmarkScore.upsert({
      where: {
        modelId_source_dimension: {
          modelId: model.id,
          source: enrichedRecord.source,
          dimension: enrichedRecord.dimension,
        },
      },
      create: {
        modelId: model.id,
        source: enrichedRecord.source,
        dimension: enrichedRecord.dimension,
        score: clampScore(enrichedRecord.score),
        rawLabel: enrichedRecord.rawLabel ?? null,
      },
      update: {
        score: clampScore(enrichedRecord.score),
        rawLabel: enrichedRecord.rawLabel ?? null,
        fetchedAt: new Date(),
      },
    });

    scoresUpserted += 1;
  }

  return {
    recordsFetched: records.length,
    modelsUpserted: touchedModels.size,
    scoresUpserted,
  };
}

function buildModelUpdate(
  record: NormalizedBenchmarkRecord,
): ModelUpdateInput {
  const update: ModelUpdateInput = {
    provider: record.provider,
  };

  if (record.contextWindow !== undefined) {
    update.contextWindow = record.contextWindow;
  }

  if (record.costInputPer1M !== undefined) {
    update.costInputPer1M = record.costInputPer1M;
  }

  if (record.costOutputPer1M !== undefined) {
    update.costOutputPer1M = record.costOutputPer1M;
  }

  return update;
}

async function deleteKnownInvalidBenchmarkArtifacts(prisma: BenchmarkPrisma) {
  if (!prisma.benchmarkScore.deleteMany) {
    return 0;
  }

  const result = await prisma.benchmarkScore.deleteMany({
    where: {
      source: "livebench",
      rawLabel: { startsWith: "LiveBench " },
    },
  });

  return result.count;
}

function dedupeRecords(
  records: NormalizedBenchmarkRecord[],
): NormalizedBenchmarkRecord[] {
  const byUniqueScore = new Map<string, NormalizedBenchmarkRecord>();

  for (const record of records) {
    if (!record.modelName.trim()) {
      continue;
    }

    byUniqueScore.set(
      `${record.modelName}::${record.source}::${record.dimension}`,
      {
        ...record,
        modelName: record.modelName.trim(),
        provider: record.provider.trim() || "Unknown",
        score: clampScore(record.score),
      },
    );
  }

  return Array.from(byUniqueScore.values());
}
