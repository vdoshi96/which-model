
import { upsertBenchmarkRecords } from "@/lib/benchmarkSources";
import type { NormalizedBenchmarkRecord } from "@/lib/benchmarkSources/types";

describe("benchmark upserts", () => {
  it("does not create duplicate models or scores when run twice", async () => {
    const prisma = createInMemoryPrisma();
    const records: NormalizedBenchmarkRecord[] = [
      {
        modelName: "Example Model",
        provider: "Example Provider",
        source: "livebench",
        dimension: "coding",
        score: 88,
        rawLabel: "Coding",
      },
    ];

    await upsertBenchmarkRecords(records, prisma);
    await upsertBenchmarkRecords(records, prisma);

    expect(prisma.models.size).toBe(1);
    expect(prisma.scores.size).toBe(1);
  });

  it("enriches benchmark model metadata from the curated catalog", async () => {
    const prisma = createInMemoryPrisma();
    const records: NormalizedBenchmarkRecord[] = [
      {
        modelName: "claude-sonnet-4-6",
        provider: "Unknown",
        source: "livebench",
        dimension: "coding",
        score: 93,
        rawLabel: "Coding",
      },
    ];

    await upsertBenchmarkRecords(records, prisma);

    expect(prisma.models.get("Claude Sonnet 4.6")).toMatchObject({
      name: "Claude Sonnet 4.6",
      provider: "Anthropic",
      contextWindow: 1_000_000,
      costInputPer1M: 3,
      costOutputPer1M: 15,
    });
  });
});

function createInMemoryPrisma() {
  const models = new Map<
    string,
    {
      id: string;
      name: string;
      provider?: string;
      contextWindow?: number | null;
      costInputPer1M?: number | null;
      costOutputPer1M?: number | null;
    }
  >();
  const scores = new Map<string, unknown>();

  return {
    models,
    scores,
    model: {
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: { name: string };
        create: {
          name: string;
          provider?: string;
          contextWindow?: number | null;
          costInputPer1M?: number | null;
          costOutputPer1M?: number | null;
        };
        update?: {
          provider?: string;
          contextWindow?: number | null;
          costInputPer1M?: number | null;
          costOutputPer1M?: number | null;
        };
      }) => {
        const existing = models.get(where.name);

        if (existing) {
          Object.assign(existing, update);
          return existing;
        }

        const model = { id: `model-${models.size + 1}`, ...create };
        models.set(where.name, model);
        return model;
      },
    },
    benchmarkScore: {
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: {
          modelId_source_dimension: {
            modelId: string;
            source: string;
            dimension: string;
          };
        };
        create: unknown;
        update: unknown;
      }) => {
        const unique = where.modelId_source_dimension;
        const key = `${unique.modelId}:${unique.source}:${unique.dimension}`;
        scores.set(key, scores.has(key) ? update : create);
        return scores.get(key);
      },
    },
  };
}
