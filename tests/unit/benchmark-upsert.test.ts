import { describe, expect, it } from "vitest";

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
});

function createInMemoryPrisma() {
  const models = new Map<string, { id: string; name: string }>();
  const scores = new Map<string, unknown>();

  return {
    models,
    scores,
    model: {
      upsert: async ({
        where,
        create,
      }: {
        where: { name: string };
        create: { name: string };
      }) => {
        const existing = models.get(where.name);

        if (existing) {
          return existing;
        }

        const model = { id: `model-${models.size + 1}`, name: create.name };
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
