import type { NormalizedBenchmarkRecord } from "./types";
import { normalizePercentageScore } from "./normalization";
import { fetchText, inferProvider } from "./sourceUtils";

const leaderboardUrl = "https://aider.chat/docs/leaderboards/";

interface AiderRow {
  modelName: string;
  provider: string;
  percentCorrect: number;
  cost?: number;
}

export async function fetchAiderPolyglot(): Promise<
  NormalizedBenchmarkRecord[]
> {
  const rows = extractAiderRowsFromHtml(await fetchText(leaderboardUrl));

  if (rows.length === 0) {
    throw new Error("Aider leaderboard returned no usable model rows");
  }

  return rows.map((row) => ({
    modelName: row.modelName,
    provider: row.provider,
    source: "aider_polyglot",
    dimension: "coding",
    score: normalizePercentageScore(row.percentCorrect),
    rawLabel: "Aider polyglot percent correct",
  }));
}

export function extractAiderRowsFromHtml(html: string): AiderRow[] {
  const rows = Array.from(
    html.matchAll(/<tr\b[^>]*id=["']main-row-\d+["'][^>]*>([\s\S]*?)<\/tr>/gi),
  );
  const bestByModel = new Map<string, AiderRow>();

  for (const match of rows) {
    const cells = extractTableCells(match[1]);

    if (cells.length < 5) {
      continue;
    }

    const displayName = stripTags(cells[1]);
    const command = stripTags(cells[4]);
    const modelName = normalizeAiderModelName(
      extractModelFromCommand(command) ?? displayName,
    );
    const percentCorrect = parseNumber(stripTags(cells[2]));

    if (!modelName || percentCorrect === undefined) {
      continue;
    }

    const row = {
      modelName,
      provider: inferProvider(modelName),
      percentCorrect,
      cost: parseNumber(stripTags(cells[3])),
    };
    const existing = bestByModel.get(modelName);

    if (!existing || row.percentCorrect > existing.percentCorrect) {
      bestByModel.set(modelName, row);
    }
  }

  return Array.from(bestByModel.values());
}

function extractTableCells(rowHtml: string): string[] {
  return Array.from(rowHtml.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)).map(
    (match) => match[1],
  );
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractModelFromCommand(command: string): string | undefined {
  const match = command.match(/--model\s+([^\s]+)/);
  return match?.[1];
}

function normalizeAiderModelName(name: string): string {
  const withoutProviderPrefix = name.includes("/")
    ? name.split("/").filter(Boolean).at(-1) ?? name
    : name;

  return withoutProviderPrefix.replace(/\s*\([^)]*\)\s*$/g, "").trim();
}

function parseNumber(value: string): number | undefined {
  const number = Number.parseFloat(value.replace(/[$,%\s,]/g, ""));
  return Number.isFinite(number) ? number : undefined;
}
