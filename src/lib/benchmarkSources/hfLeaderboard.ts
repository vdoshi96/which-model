import type { NormalizedBenchmarkRecord } from "./types";
import { normalizePercentageScore } from "./normalization";
import {
  fetchJson,
  getNumber,
  getString,
  inferProvider,
  logSourceError,
  type SourceRow,
} from "./sourceUtils";

const datasetRowsCandidates = [
  {
    dataset: "OpenEvals/leaderboard-data",
    config: "default",
    split: "train",
    maxRows: 250,
  },
  {
    dataset: "open-llm-leaderboard/contents",
    config: "default",
    split: "train",
    maxRows: 250,
  },
];

const datasetPageSize = 100;

interface HfRow {
  modelName: string;
  provider: string;
  average?: number;
  mmlu?: number;
  gsm8k?: number;
  contextWindow?: number | null;
}

export async function fetchHfLeaderboard(): Promise<
  NormalizedBenchmarkRecord[]
> {
  const rows = await fetchHfRows();

  if (rows.length === 0) {
    throw new Error("HF Open LLM Leaderboard returned no usable rows");
  }

  return rows.flatMap((row) => {
    const common = {
      modelName: row.modelName,
      provider: row.provider,
      source: "hf_leaderboard" as const,
      contextWindow: row.contextWindow,
    };
    const records: NormalizedBenchmarkRecord[] = [];

    if (row.average !== undefined) {
      records.push({
        ...common,
        dimension: "overall",
        score: normalizePercentageScore(row.average),
        rawLabel: "Average",
      });
    }

    if (row.mmlu !== undefined) {
      records.push({
        ...common,
        dimension: "reasoning",
        score: normalizePercentageScore(row.mmlu),
        rawLabel: "MMLU",
      });
    }

    if (row.gsm8k !== undefined) {
      records.push({
        ...common,
        dimension: "math",
        score: normalizePercentageScore(row.gsm8k),
        rawLabel: "GSM8K",
      });
    }

    return records;
  });
}

async function fetchHfRows(): Promise<HfRow[]> {
  for (const candidate of datasetRowsCandidates) {
    try {
      const rows = extractHfRows(
        await fetchDatasetRows(
          candidate.dataset,
          candidate.config,
          candidate.split,
          candidate.maxRows,
        ),
      );

      if (rows.length > 0) {
        return rows;
      }
    } catch (error) {
      logSourceError("hf_leaderboard", error);
    }
  }

  return [];
}

export function extractHfRows(rows: SourceRow[]): HfRow[] {
  return rows
    .map((row): HfRow | null => {
      const modelName = getString(row, [
        "model",
        "Model",
        "model_name",
        "modelName",
        "name",
        "fullname",
      ]);

      if (!modelName) {
        return null;
      }

      const average = getNumber(row, [
        "average",
        "Average",
        "Average ⬆️",
        "avg",
        "score",
        "Open LLM Score",
        "aggregate_score",
      ]);
      const mmlu = getNumber(row, [
        "mmlu",
        "MMLU",
        "MMLU (5-shot)",
        "mmluPro_score",
        "MMLU-PRO",
      ]);
      const gsm8k = getNumber(row, [
        "gsm8k",
        "GSM8K",
        "GSM8k",
        "GSM8k (5-shot)",
        "gsm8k_score",
        "MATH Lvl 5",
      ]);

      if (average === undefined && mmlu === undefined && gsm8k === undefined) {
        return null;
      }

      return {
        modelName,
        provider: inferProvider(modelName, getString(row, ["provider", "Provider"])),
        average,
        mmlu,
        gsm8k,
        contextWindow:
          getPositiveNumber(row, [
            "context_window",
            "contextWindow",
            "context_window_tokens",
            "Context Window",
          ]) ?? null,
      };
    })
    .filter((row): row is HfRow => row !== null);
}

async function fetchDatasetRows(
  dataset: string,
  config: string,
  split: string,
  maxRows: number,
): Promise<SourceRow[]> {
  const firstPage = await fetchDatasetRowsPage(dataset, config, split, 0);
  const totalRows = Math.min(firstPage.totalRows ?? firstPage.rows.length, maxRows);
  const offsets: number[] = [];

  for (
    let offset = datasetPageSize;
    offset < totalRows;
    offset += datasetPageSize
  ) {
    offsets.push(offset);
  }

  const remainingPages = await Promise.all(
    offsets.map((offset) => fetchDatasetRowsPage(dataset, config, split, offset)),
  );

  return [firstPage, ...remainingPages]
    .flatMap((page) => page.rows)
    .slice(0, maxRows);
}

async function fetchDatasetRowsPage(
  dataset: string,
  config: string,
  split: string,
  offset: number,
): Promise<{ rows: SourceRow[]; totalRows?: number }> {
  const params = new URLSearchParams({
    dataset,
    config,
    split,
    offset: String(offset),
    length: String(datasetPageSize),
  });
  const payload = await fetchJson(
    `https://datasets-server.huggingface.co/rows?${params.toString()}`,
  );
  const response = payload as {
    rows?: Array<{ row?: unknown }>;
    num_rows_total?: number;
  };

  return {
    rows: (response.rows ?? [])
      .map((entry) => entry.row)
      .filter(isSourceRow),
    totalRows: response.num_rows_total,
  };
}

function isSourceRow(value: unknown): value is SourceRow {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getPositiveNumber(row: SourceRow, keys: string[]): number | undefined {
  const value = getNumber(row, keys);

  if (value === undefined || value <= 0) {
    return undefined;
  }

  return value;
}
