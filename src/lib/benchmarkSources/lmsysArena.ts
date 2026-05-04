import type { NormalizedBenchmarkRecord } from "./types";
import { normalizeEloScores } from "./normalization";
import {
  extractRows,
  fetchJson,
  fetchText,
  getNumber,
  getString,
  inferProvider,
  logSourceError,
  parseCsvRows,
  type SourceRow,
} from "./sourceUtils";

const jsonCandidates = [
  "https://huggingface.co/datasets/lmsys/chatbot_arena_leaderboard/resolve/main/elo_results.json",
  "https://huggingface.co/spaces/lmarena-ai/arena-leaderboard/raw/main/elo_results.json",
];

const csvCandidates = [
  "https://huggingface.co/spaces/lmarena-ai/arena-leaderboard/resolve/main/arena_hard_auto_leaderboard_v0.1.csv",
];

interface ArenaRow {
  modelName: string;
  provider: string;
  elo: number;
  rawLabel: string;
}

export async function fetchLmsysArena(): Promise<NormalizedBenchmarkRecord[]> {
  const rows = await fetchArenaRows();

  if (rows.length === 0) {
    throw new Error("LMSYS Arena returned no usable leaderboard rows");
  }

  const scores = normalizeEloScores(rows.map((row) => row.elo));

  return rows.map((row, index) => ({
    modelName: row.modelName,
    provider: row.provider,
    source: "lmsys_arena",
    dimension: "overall",
    score: scores[index],
    rawLabel: row.rawLabel,
  }));
}

async function fetchArenaRows(): Promise<ArenaRow[]> {
  for (const url of jsonCandidates) {
    try {
      const rows = extractArenaRows(extractRows(await fetchJson(url)), "ELO");

      if (rows.length > 0) {
        return rows;
      }
    } catch (error) {
      logSourceError("lmsys_arena", error);
    }
  }

  for (const url of csvCandidates) {
    try {
      const rows = extractArenaRows(parseCsvRows(await fetchText(url)), "Arena Hard");

      if (rows.length > 0) {
        return rows;
      }
    } catch (error) {
      logSourceError("lmsys_arena", error);
    }
  }

  return [];
}

function extractArenaRows(rows: SourceRow[], rawLabel: string): ArenaRow[] {
  return rows
    .map((row) => {
      const modelName = getString(row, [
        "model",
        "Model",
        "model_name",
        "modelName",
        "name",
      ]);
      const elo = getNumber(row, [
        "elo",
        "ELO",
        "rating",
        "Rating",
        "arena_score",
        "score",
        "Score",
      ]);

      if (!modelName || elo === undefined) {
        return null;
      }

      return {
        modelName,
        provider: inferProvider(modelName, getString(row, ["provider", "Provider"])),
        elo,
        rawLabel,
      };
    })
    .filter((row): row is ArenaRow => row !== null);
}
