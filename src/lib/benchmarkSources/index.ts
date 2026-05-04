import type { Prisma, PrismaClient } from "@prisma/client";

import { getPrisma } from "@/lib/db";

import { fetchArtificialAnalysis } from "./artificialAnalysis";
import { fetchHfLeaderboard } from "./hfLeaderboard";
import { fetchLiveBench } from "./livebench";
import { fetchLmsysArena } from "./lmsysArena";
import { clampScore } from "./normalization";
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
}

type BenchmarkPrisma = {
  model: {
    upsert: (args: {
      where: { name: string };
      create: Prisma.ModelCreateInput;
      update: Prisma.ModelUpdateInput;
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
      create: Prisma.BenchmarkScoreUncheckedCreateInput;
      update: Prisma.BenchmarkScoreUpdateInput;
    }) => Promise<unknown>;
  };
};

export async function refreshBenchmarkData(
  prisma: PrismaClient = getPrisma(),
): Promise<BenchmarkRefreshResult> {
  const records = await fetchAllBenchmarkSources();

  return upsertBenchmarkRecords(records, prisma);
}

export async function upsertBenchmarkRecords(
  records: NormalizedBenchmarkRecord[],
  prisma: BenchmarkPrisma,
): Promise<BenchmarkRefreshResult> {
  const touchedModels = new Set<string>();
  let scoresUpserted = 0;

  for (const record of records) {
    const model = await prisma.model.upsert({
      where: { name: record.modelName },
      create: {
        name: record.modelName,
        provider: record.provider,
        contextWindow: record.contextWindow ?? null,
        costInputPer1M: record.costInputPer1M ?? null,
        costOutputPer1M: record.costOutputPer1M ?? null,
      },
      update: buildModelUpdate(record),
    });

    touchedModels.add(model.id);

    await prisma.benchmarkScore.upsert({
      where: {
        modelId_source_dimension: {
          modelId: model.id,
          source: record.source,
          dimension: record.dimension,
        },
      },
      create: {
        modelId: model.id,
        source: record.source,
        dimension: record.dimension,
        score: clampScore(record.score),
        rawLabel: record.rawLabel ?? null,
      },
      update: {
        score: clampScore(record.score),
        rawLabel: record.rawLabel ?? null,
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
): Prisma.ModelUpdateInput {
  const update: Prisma.ModelUpdateInput = {
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
