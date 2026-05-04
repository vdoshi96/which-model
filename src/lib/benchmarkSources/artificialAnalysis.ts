import type { NormalizedBenchmarkRecord } from "./types";
import {
  normalizeCostScores,
  normalizePercentageScore,
  normalizeSpeedScores,
} from "./normalization";
import {
  extractRows,
  fetchJson,
  fetchText,
  getNumber,
  getString,
  inferProvider,
  logSourceError,
  type SourceRow,
} from "./sourceUtils";

const jsonCandidates = [
  "https://artificialanalysis.ai/api/models",
  "https://artificialanalysis.ai/api/leaderboards/models",
  "https://artificialanalysis.ai/api/v2/data/llm-leaderboard",
  "https://artificialanalysis.ai/leaderboards/models/_next/data.json",
];

const htmlCandidates = [
  "https://artificialanalysis.ai/models",
  "https://artificialanalysis.ai/leaderboards/models",
  "https://artificialanalysis.ai",
];

interface ArtificialAnalysisRow {
  modelName: string;
  provider: string;
  qualityScore?: number;
  speed?: number;
  cost?: number;
  contextWindow?: number | null;
  costInputPer1M?: number | null;
  costOutputPer1M?: number | null;
}

export async function fetchArtificialAnalysis(): Promise<
  NormalizedBenchmarkRecord[]
> {
  const rows = await fetchArtificialAnalysisRows();

  if (rows.length === 0) {
    throw new Error("Artificial Analysis returned no usable model rows");
  }

  const speedScores = normalizeSpeedScores(rows.map((row) => row.speed ?? 0));
  const costScores = normalizeCostScores(
    rows.map((row) => row.cost ?? Number.NaN),
  );

  return rows.flatMap((row, index) => {
    const common = {
      modelName: row.modelName,
      provider: row.provider,
      source: "artificial_analysis" as const,
      contextWindow: row.contextWindow,
      costInputPer1M: row.costInputPer1M,
      costOutputPer1M: row.costOutputPer1M,
    };
    const records: NormalizedBenchmarkRecord[] = [];

    if (row.qualityScore !== undefined) {
      records.push({
        ...common,
        dimension: "overall",
        score: normalizePercentageScore(row.qualityScore),
        rawLabel: "Quality Index",
      });
    }

    if (row.speed !== undefined) {
      records.push({
        ...common,
        dimension: "speed",
        score: speedScores[index],
        rawLabel: "Tokens/sec",
      });
    }

    if (row.cost !== undefined) {
      records.push({
        ...common,
        dimension: "cost_efficiency",
        score: costScores[index],
        rawLabel: "Cost per 1M tokens",
      });
    }

    return records;
  });
}

async function fetchArtificialAnalysisRows(): Promise<ArtificialAnalysisRow[]> {
  for (const url of jsonCandidates) {
    try {
      const rows = extractArtificialRows(extractRows(await fetchJson(url)));

      if (rows.length > 0) {
        return rows;
      }
    } catch (error) {
      logSourceError("artificial_analysis", error);
    }
  }

  for (const url of htmlCandidates) {
    try {
      const rows = extractArtificialRowsFromHtml(await fetchText(url));

      if (rows.length > 0) {
        return rows;
      }
    } catch (error) {
      logSourceError("artificial_analysis", error);
    }
  }

  return [];
}

function extractArtificialRows(rows: SourceRow[]): ArtificialAnalysisRow[] {
  return rows
    .map((row): ArtificialAnalysisRow | null => {
      const modelName = getString(row, [
        "model",
        "modelName",
        "model_name",
        "name",
        "displayName",
        "display_name",
      ]);

      if (!modelName) {
        return null;
      }

      const costInputPer1M = getNumber(row, [
        "inputCost",
        "input_cost",
        "inputPrice",
        "priceInput",
        "costInputPer1M",
      ]);
      const costOutputPer1M = getNumber(row, [
        "outputCost",
        "output_cost",
        "outputPrice",
        "priceOutput",
        "costOutputPer1M",
      ]);
      const blendedCost =
        getNumber(row, [
          "blendedCost",
          "cost",
          "price",
          "medianCost",
          "usdPerMillionTokens",
        ]) ?? averageDefined(costInputPer1M, costOutputPer1M);

      return {
        modelName,
        provider: inferProvider(
          modelName,
          getString(row, ["provider", "creator", "organization", "lab"]),
        ),
        qualityScore: getNumber(row, [
          "quality",
          "qualityScore",
          "quality_score",
          "intelligence",
          "overall",
          "score",
          "index",
        ]),
        speed: getNumber(row, [
          "tokensPerSecond",
          "tokens_per_second",
          "outputTokensPerSecond",
          "output_tokens_per_second",
          "speed",
          "tps",
        ]),
        cost: blendedCost,
        contextWindow:
          getNumber(row, [
            "contextWindow",
            "context_window",
            "context",
            "contextLength",
            "context_length",
          ]) ?? null,
        costInputPer1M,
        costOutputPer1M,
      };
    })
    .filter((row): row is ArtificialAnalysisRow => {
      return (
        row !== null &&
        (row.qualityScore !== undefined ||
          row.speed !== undefined ||
          row.cost !== undefined)
      );
    });
}

function extractArtificialRowsFromHtml(html: string): ArtificialAnalysisRow[] {
  const jsonPayloads = Array.from(
    html.matchAll(
      /<script[^>]+(?:id="__NEXT_DATA__"|type="application\/json")[^>]*>([\s\S]*?)<\/script>/gi,
    ),
  )
    .map((match) => match[1])
    .filter((payload): payload is string => Boolean(payload));

  for (const payload of jsonPayloads) {
    try {
      const rows = extractArtificialRows(extractRows(JSON.parse(payload)));

      if (rows.length > 0) {
        return rows;
      }
    } catch {
      continue;
    }
  }

  return [];
}

function averageDefined(...values: Array<number | undefined>): number | undefined {
  const defined = values.filter((value): value is number => value !== undefined);

  if (defined.length === 0) {
    return undefined;
  }

  return defined.reduce((total, value) => total + value, 0) / defined.length;
}
