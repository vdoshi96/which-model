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

const jsonCandidates: Array<{ url: string; requiresApiKey?: boolean }> = [
  {
    url: "https://artificialanalysis.ai/api/v2/data/llms/models",
    requiresApiKey: true,
  },
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
  categoryScores?: Partial<Record<NormalizedBenchmarkRecord["dimension"], number[]>>;
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
        rawLabel: "Artificial Analysis Intelligence Index",
      });
    }

    for (const [dimension, values] of Object.entries(row.categoryScores ?? {}) as Array<
      [NormalizedBenchmarkRecord["dimension"], number[]]
    >) {
      if (dimension === "overall" && row.qualityScore !== undefined) {
        continue;
      }

      if (values.length === 0) {
        continue;
      }

      records.push({
        ...common,
        dimension,
        score: averageScores(values),
        rawLabel: `Artificial Analysis ${dimension.replaceAll("_", " ")}`,
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
  for (const candidate of jsonCandidates) {
    try {
      const apiKey = process.env.ARTIFICIAL_ANALYSIS_API_KEY;

      if (candidate.requiresApiKey && !apiKey) {
        continue;
      }

      const rows = extractArtificialRows(
        extractRows(
          await fetchJson(
            candidate.url,
            apiKey ? { "x-api-key": apiKey } : undefined,
          ),
        ),
      );

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
      if (row.deprecated === true) {
        return null;
      }

      const creator = getObject(row, ["model_creator", "creator"]);
      const evaluations = getObject(row, ["evaluations"]);
      const pricing = getObject(row, ["pricing"]);
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

      const costInputPer1M = getNumberFromRecords([row, pricing], [
        "inputCost",
        "input_cost",
        "inputPrice",
        "priceInput",
        "costInputPer1M",
        "price_1m_input_tokens",
        "price1mInputTokens",
      ]);
      const costOutputPer1M = getNumberFromRecords([row, pricing], [
        "outputCost",
        "output_cost",
        "outputPrice",
        "priceOutput",
        "costOutputPer1M",
        "price_1m_output_tokens",
        "price1mOutputTokens",
      ]);
      const blendedCost =
        getNumberFromRecords([row, pricing], [
          "blendedCost",
          "cost",
          "price",
          "medianCost",
          "usdPerMillionTokens",
          "price_1m_blended_3_to_1",
          "price1mBlended0To3To1",
          "price1mBlended7To2To1",
          "price1mBlended0To1To1",
        ]) ?? averageDefined(costInputPer1M, costOutputPer1M);

      return {
        modelName,
        provider: inferProvider(
          modelName,
          getStringFromRecords([row, creator], [
            "provider",
            "creator",
            "organization",
            "lab",
            "modelCreatorName",
            "name",
          ]),
        ),
        qualityScore: getNumberFromRecords([row, evaluations], [
          "quality",
          "qualityScore",
          "quality_score",
          "intelligence",
          "intelligenceIndex",
          "artificial_analysis_intelligence_index",
          "overall",
          "score",
          "index",
        ]),
        categoryScores: extractEvaluationCategoryScores(evaluations),
        speed: getNumberFromRecords([row], [
          "tokensPerSecond",
          "tokens_per_second",
          "outputTokensPerSecond",
          "output_tokens_per_second",
          "median_output_tokens_per_second",
          "medianOutputTokensPerSecond",
          "speed",
          "tps",
        ]),
        cost: blendedCost,
        contextWindow:
          getNumberFromRecords([row], [
            "contextWindow",
            "context_window",
            "context_window_tokens",
            "contextWindowTokens",
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

function extractEvaluationCategoryScores(
  evaluations: SourceRow | undefined,
): Partial<Record<NormalizedBenchmarkRecord["dimension"], number[]>> | undefined {
  if (!evaluations) {
    return undefined;
  }

  const scores: Partial<Record<NormalizedBenchmarkRecord["dimension"], number[]>> = {};

  addEvaluationScores(scores, "overall", evaluations, [
    "artificial_analysis_intelligence_index",
    "intelligence_index",
  ]);
  addEvaluationScores(scores, "coding", evaluations, [
    "artificial_analysis_coding_index",
    "livecodebench",
    "live_code_bench",
    "scicode",
    "terminal_bench",
    "terminal_bench_hard",
  ]);
  addEvaluationScores(scores, "math", evaluations, [
    "artificial_analysis_math_index",
    "math_500",
    "aime",
  ]);
  addEvaluationScores(scores, "reasoning", evaluations, [
    "gpqa",
    "gpqa_diamond",
    "hle",
    "humanitys_last_exam",
    "humanity_last_exam",
    "critpt",
    "aa_lcr",
  ]);
  addEvaluationScores(scores, "instruction_following", evaluations, [
    "ifbench",
    "if_bench",
  ]);

  return Object.keys(scores).length > 0 ? scores : undefined;
}

function addEvaluationScores(
  scores: Partial<Record<NormalizedBenchmarkRecord["dimension"], number[]>>,
  dimension: NormalizedBenchmarkRecord["dimension"],
  row: SourceRow,
  keys: string[],
) {
  const values = keys
    .map((key) => getNumber(row, [key]))
    .filter((value): value is number => value !== undefined)
    .map(normalizePercentageScore);

  if (values.length > 0) {
    scores[dimension] = [...(scores[dimension] ?? []), ...values];
  }
}

function averageScores(values: number[]) {
  return normalizePercentageScore(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

export function extractArtificialRowsFromHtml(
  html: string,
): ArtificialAnalysisRow[] {
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

  return extractArtificialRowsFromNextFlight(html);
}

function extractArtificialRowsFromNextFlight(
  html: string,
): ArtificialAnalysisRow[] {
  const rows: ArtificialAnalysisRow[] = [];
  const scripts = Array.from(
    html.matchAll(/<script[^>]*>(self\.__next_f\.push\([\s\S]*?\))<\/script>/g),
  ).map((match) => match[1]);

  for (const script of scripts) {
    const start = script.indexOf("(");
    const end = script.lastIndexOf(")");

    if (start === -1 || end === -1 || end <= start) {
      continue;
    }

    try {
      const payload = JSON.parse(script.slice(start + 1, end)) as unknown[];
      const text = payload
        .filter((value): value is string => typeof value === "string")
        .join("");
      const modelArrays = extractJsonArraysAfterKey(text, "\"models\":");

      for (const modelArray of modelArrays) {
        rows.push(...extractArtificialRows(extractRows(JSON.parse(modelArray))));
      }
    } catch {
      continue;
    }
  }

  return dedupeArtificialRows(rows);
}

function averageDefined(...values: Array<number | undefined>): number | undefined {
  const defined = values.filter((value): value is number => value !== undefined);

  if (defined.length === 0) {
    return undefined;
  }

  return defined.reduce((total, value) => total + value, 0) / defined.length;
}

function getObject(row: SourceRow, keys: string[]): SourceRow | undefined {
  for (const key of keys) {
    const value = row[key];

    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as SourceRow;
    }
  }

  return undefined;
}

function getNumberFromRecords(
  records: Array<SourceRow | undefined>,
  keys: string[],
): number | undefined {
  for (const record of records) {
    if (!record) {
      continue;
    }

    const value = getNumber(record, keys);

    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function getStringFromRecords(
  records: Array<SourceRow | undefined>,
  keys: string[],
): string | undefined {
  for (const record of records) {
    if (!record) {
      continue;
    }

    const value = getString(record, keys);

    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function extractJsonArraysAfterKey(text: string, key: string): string[] {
  const arrays: string[] = [];
  let searchIndex = 0;

  while (searchIndex < text.length) {
    const keyIndex = text.indexOf(key, searchIndex);

    if (keyIndex === -1) {
      break;
    }

    const arrayStart = text.indexOf("[", keyIndex + key.length);

    if (arrayStart === -1) {
      break;
    }

    const arrayJson = extractJsonArrayAt(text, arrayStart);

    if (arrayJson) {
      arrays.push(arrayJson);
      searchIndex = arrayStart + arrayJson.length;
    } else {
      searchIndex = arrayStart + 1;
    }
  }

  return arrays;
}

function extractJsonArrayAt(text: string, start: number): string | null {
  let depth = 0;
  let quoted = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === "\"") {
        quoted = false;
      }

      continue;
    }

    if (character === "\"") {
      quoted = true;
      continue;
    }

    if (character === "[") {
      depth += 1;
    } else if (character === "]") {
      depth -= 1;

      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }

  return null;
}

function dedupeArtificialRows(
  rows: ArtificialAnalysisRow[],
): ArtificialAnalysisRow[] {
  const byModel = new Map<string, ArtificialAnalysisRow>();

  for (const row of rows) {
    byModel.set(`${row.provider}:${row.modelName}`, row);
  }

  return Array.from(byModel.values());
}
