import type { NormalizedBenchmarkRecord } from "./types";
import { normalizePercentageScore } from "./normalization";
import {
  extractRows,
  fetchJson,
  getNumber,
  getString,
  inferProvider,
  logSourceError,
  type SourceRow,
} from "./sourceUtils";

const jsonCandidates = [
  "https://huggingface.co/api/spaces/open-llm-leaderboard/open_llm_leaderboard",
  "https://huggingface.co/datasets/open-llm-leaderboard/results/resolve/main/results.json",
  "https://huggingface.co/datasets/open-llm-leaderboard-old/results/resolve/main/results.json",
];

interface HfRow {
  modelName: string;
  provider: string;
  average?: number;
  mmlu?: number;
  gsm8k?: number;
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
  for (const url of jsonCandidates) {
    try {
      const rows = extractHfRows(extractRows(await fetchJson(url)));

      if (rows.length > 0) {
        return rows;
      }
    } catch (error) {
      logSourceError("hf_leaderboard", error);
    }
  }

  return [];
}

function extractHfRows(rows: SourceRow[]): HfRow[] {
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
        "avg",
        "score",
        "Open LLM Score",
      ]);
      const mmlu = getNumber(row, ["mmlu", "MMLU", "MMLU (5-shot)"]);
      const gsm8k = getNumber(row, ["gsm8k", "GSM8K", "GSM8k", "GSM8k (5-shot)"]);

      if (average === undefined && mmlu === undefined && gsm8k === undefined) {
        return null;
      }

      return {
        modelName,
        provider: inferProvider(modelName, getString(row, ["provider", "Provider"])),
        average,
        mmlu,
        gsm8k,
      };
    })
    .filter((row): row is HfRow => row !== null);
}
