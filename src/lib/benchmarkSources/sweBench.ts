import type { NormalizedBenchmarkRecord } from "./types";
import { normalizePercentageScore } from "./normalization";
import { fetchText, inferProvider } from "./sourceUtils";

const leaderboardUrl = "https://www.swebench.com/";

interface SweBenchRow {
  modelName: string;
  provider: string;
  resolved: number;
}

type LeaderboardGroup = {
  name?: unknown;
  results?: unknown;
};

type LeaderboardResult = {
  name?: unknown;
  resolved?: unknown;
  tags?: unknown;
};

export async function fetchSweBench(): Promise<NormalizedBenchmarkRecord[]> {
  const rows = extractSweBenchRowsFromHtml(await fetchText(leaderboardUrl));

  if (rows.length === 0) {
    throw new Error("SWE-bench returned no usable model rows");
  }

  return rows.map((row) => ({
    modelName: row.modelName,
    provider: row.provider,
    source: "swe_bench",
    dimension: "coding",
    score: normalizePercentageScore(row.resolved),
    rawLabel: "SWE-bench best resolved",
  }));
}

export function extractSweBenchRowsFromHtml(html: string): SweBenchRow[] {
  const payload = extractLeaderboardPayload(html);

  if (!payload) {
    return [];
  }

  try {
    return extractSweBenchRows(JSON.parse(payload) as unknown);
  } catch {
    return [];
  }
}

function extractLeaderboardPayload(html: string): string | undefined {
  const match = html.match(
    /<script[^>]+id=["']leaderboard-data["'][^>]*>([\s\S]*?)<\/script>/i,
  );

  return match?.[1]?.trim();
}

function extractSweBenchRows(payload: unknown): SweBenchRow[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  const bestByModel = new Map<string, SweBenchRow>();

  for (const group of payload as LeaderboardGroup[]) {
    if (!Array.isArray(group.results)) {
      continue;
    }

    for (const result of group.results as LeaderboardResult[]) {
      const modelName = getModelName(result);
      const resolved = getNumber(result.resolved);

      if (!modelName || resolved === undefined) {
        continue;
      }

      const existing = bestByModel.get(modelName);

      if (!existing || resolved > existing.resolved) {
        bestByModel.set(modelName, {
          modelName,
          provider: inferProvider(modelName),
          resolved,
        });
      }
    }
  }

  return Array.from(bestByModel.values());
}

function getModelName(result: LeaderboardResult): string | undefined {
  if (!Array.isArray(result.tags)) {
    return undefined;
  }

  const modelTag = result.tags.find(
    (tag): tag is string =>
      typeof tag === "string" && tag.trim().toLowerCase().startsWith("model:"),
  );

  const rawModelName = modelTag?.replace(/^model:\s*/i, "").trim();

  return rawModelName ? normalizeSweBenchModelName(rawModelName) : undefined;
}

function normalizeSweBenchModelName(modelName: string): string {
  try {
    const url = new URL(modelName);
    const pathParts = url.pathname.split("/").filter(Boolean);

    return decodeURIComponent(pathParts.at(-1) ?? modelName).trim();
  } catch {
    return modelName.trim();
  }
}

function getNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/[$,%\s,]/g, ""));
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}
