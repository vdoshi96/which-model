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

function extractLiveBenchJudgmentRecords(
  rows: SourceRow[],
): NormalizedBenchmarkRecord[] {
  const groupedScores = new Map<string, { total: number; count: number }>();

  for (const row of rows) {
    const modelName = getString(row, ["model", "model_id", "modelName"]);
    const category = getString(row, ["category", "Category"]);
    const score = getNumber(row, ["score", "Score"]);
    const dimension = mapCategoryToDimension(category);

    if (!modelName || !dimension || score === undefined) {
      continue;
    }

    const key = `${modelName}::${dimension}`;
    const existing = groupedScores.get(key) ?? { total: 0, count: 0 };

    existing.total += score;
    existing.count += 1;
    groupedScores.set(key, existing);
  }

  return Array.from(groupedScores.entries()).map(([key, value]) => {
    const [modelName, dimension] = key.split("::") as [
      string,
      NormalizedBenchmarkRecord["dimension"],
    ];

    return {
      modelName,
      provider: inferProvider(modelName),
      source: "livebench",
      dimension,
      score: normalizePercentageScore(value.total / value.count),
      rawLabel: `LiveBench ${dimension.replaceAll("_", " ")}`,
    };
  });
}

function mapCategoryToDimension(
  category: string | undefined,
): NormalizedBenchmarkRecord["dimension"] | undefined {
  switch (category?.toLowerCase()) {
    case "reasoning":
      return "reasoning";
    case "math":
      return "math";
    case "coding":
      return "coding";
    case "instruction_following":
    case "instruction following":
      return "instruction_following";
    default:
      return undefined;
  }
}
