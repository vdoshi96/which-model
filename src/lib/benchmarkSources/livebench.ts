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

const MIN_JUDGMENT_ROWS_PER_MODEL_DIMENSION = 2;

const directJsonCandidates = [
  "https://raw.githubusercontent.com/LiveBench/LiveBench/main/livebench/data/results.json",
  "https://raw.githubusercontent.com/livebench-ai/livebench/main/livebench/data/results.json",
  "https://raw.githubusercontent.com/LiveBench/LiveBench/main/livebench/data/livebench_results.json",
  "https://raw.githubusercontent.com/livebench-ai/livebench/main/livebench/data/livebench_results.json",
];

const judgmentPageCandidates = [0, 10000, 20000, 30000, 40000, 50000].map(
  (offset) =>
    `https://datasets-server.huggingface.co/rows?dataset=livebench/model_judgment&config=default&split=leaderboard&offset=${offset}&length=100`,
);

const dimensionMappings = [
  {
    dimension: "reasoning" as const,
    rawLabel: "Reasoning",
    keys: ["reasoning", "Reasoning", "reasoning_score"],
  },
  {
    dimension: "math" as const,
    rawLabel: "Math",
    keys: ["math", "Math", "math_score"],
  },
  {
    dimension: "coding" as const,
    rawLabel: "Coding",
    keys: ["coding", "Coding", "code", "coding_score"],
  },
  {
    dimension: "instruction_following" as const,
    rawLabel: "Instruction Following",
    keys: [
      "instruction_following",
      "Instruction Following",
      "instruction",
      "instruction_score",
    ],
  },
];

const judgmentCategoryDimensions: Partial<
  Record<string, NormalizedBenchmarkRecord["dimension"]>
> = Object.fromEntries(
  dimensionMappings.map((mapping) => [mapping.dimension, mapping.dimension]),
);

export async function fetchLiveBench(): Promise<NormalizedBenchmarkRecord[]> {
  for (const url of directJsonCandidates) {
    try {
      const records = extractLiveBenchRecords(extractRows(await fetchJson(url)));

      if (records.length > 0) {
        return records;
      }
    } catch (error) {
      logSourceError("livebench", error);
    }
  }

  const judgmentRows: SourceRow[] = [];

  for (const url of judgmentPageCandidates) {
    try {
      judgmentRows.push(...extractRows(await fetchJson(url)));
    } catch (error) {
      logSourceError("livebench", error);
    }
  }

  const judgmentRecords = extractLiveBenchJudgmentRecords(judgmentRows);

  if (judgmentRecords.length > 0) {
    return judgmentRecords;
  }

  throw new Error("LiveBench returned no usable rows");
}

function extractLiveBenchRecords(rows: SourceRow[]): NormalizedBenchmarkRecord[] {
  return rows.flatMap((row) => {
    const modelName = getString(row, [
      "model",
      "Model",
      "model_name",
      "modelName",
      "name",
    ]);

    if (!modelName) {
      return [];
    }

    const common = {
      modelName,
      provider: inferProvider(modelName, getString(row, ["provider", "Provider"])),
      source: "livebench" as const,
    };

    return dimensionMappings.flatMap((mapping) => {
      const score = getNumber(row, mapping.keys);

      if (score === undefined) {
        return [];
      }

      return [
        {
          ...common,
          dimension: mapping.dimension,
          score: normalizePercentageScore(score),
          rawLabel: mapping.rawLabel,
        },
      ];
    });
  });
}

export function extractLiveBenchJudgmentRecords(
  rows: SourceRow[],
): NormalizedBenchmarkRecord[] {
  const groups = new Map<
    string,
    {
      category: string;
      modelName: string;
      scores: number[];
    }
  >();

  for (const row of rows) {
    const modelName = getString(row, ["model", "model_name", "Model"]);
    const category = getString(row, ["category", "Category"])?.toLowerCase();
    const score = getNumber(row, ["score", "Score"]);

    if (!modelName || !category || score === undefined) {
      continue;
    }

    if (!judgmentCategoryDimensions[category]) {
      continue;
    }

    const key = `${modelName}::${category}`;
    const existing = groups.get(key);

    if (existing) {
      existing.scores.push(score);
    } else {
      groups.set(key, {
        category: category as keyof typeof judgmentCategoryDimensions,
        modelName,
        scores: [score],
      });
    }
  }

  return Array.from(groups.values()).flatMap((group) => {
    if (group.scores.length < MIN_JUDGMENT_ROWS_PER_MODEL_DIMENSION) {
      return [];
    }

    const average =
      group.scores.reduce((sum, score) => sum + score, 0) / group.scores.length;
    const dimension = judgmentCategoryDimensions[group.category];

    if (!dimension) {
      return [];
    }

    return [
      {
        modelName: group.modelName,
        provider: inferProvider(group.modelName),
        source: "livebench" as const,
        dimension,
        score: normalizePercentageScore(average),
        rawLabel: `LiveBench ${group.category}`,
      },
    ];
  });
}
