import type { NormalizedBenchmarkRecord } from "./types";
import { normalizePercentageScore } from "./normalization";
import { fetchText, inferProvider, parseCsvRows } from "./sourceUtils";

const csvUrl = "https://gorilla.cs.berkeley.edu/data_overall.csv";

interface BfclRow {
  modelName: string;
  provider: string;
  accuracy: number;
}

export async function fetchBfcl(): Promise<NormalizedBenchmarkRecord[]> {
  const rows = extractBfclRowsFromCsv(await fetchText(csvUrl));

  if (rows.length === 0) {
    throw new Error("BFCL returned no usable leaderboard rows");
  }

  return rows.map((row) => ({
    modelName: row.modelName,
    provider: row.provider,
    source: "bfcl",
    dimension: "instruction_following",
    score: normalizePercentageScore(row.accuracy),
    rawLabel: "BFCL V4 Overall Accuracy",
  }));
}

export function extractBfclRowsFromCsv(csv: string): BfclRow[] {
  const bestByModel = new Map<string, BfclRow>();

  for (const row of parseCsvRows(csv)) {
    const rawModelName = getString(row.Model);
    const accuracy = getNumber(row["Overall Acc"]);

    if (!rawModelName || accuracy === undefined) {
      continue;
    }

    const modelName = normalizeBfclModelName(rawModelName);
    const provider = inferProvider(modelName, getString(row.Organization));
    const existing = bestByModel.get(modelName);

    if (!existing || accuracy > existing.accuracy) {
      bestByModel.set(modelName, { modelName, provider, accuracy });
    }
  }

  return Array.from(bestByModel.values());
}

function normalizeBfclModelName(modelName: string): string {
  return modelName
    .replace(/\s*\([^)]*(?:fc|prompt|thinking)[^)]*\)\s*$/i, "")
    .trim();
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
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
