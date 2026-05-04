import { fetchArtificialAnalysis } from "./artificialAnalysis";
import { fetchHfLeaderboard } from "./hfLeaderboard";
import { fetchLiveBench } from "./livebench";
import { fetchLmsysArena } from "./lmsysArena";
import type { NormalizedBenchmarkRecord } from "./types";

type Fetcher = () => Promise<NormalizedBenchmarkRecord[]>;

const fetchers: Fetcher[] = [
  fetchArtificialAnalysis,
  fetchLmsysArena,
  fetchHfLeaderboard,
  fetchLiveBench,
];

export async function fetchAllBenchmarkSources(): Promise<
  NormalizedBenchmarkRecord[]
> {
  const results = await Promise.allSettled(fetchers.map((fetcher) => fetcher()));

  return results.flatMap((result) => {
    if (result.status === "fulfilled") {
      return result.value;
    }

    console.error("[benchmark-source-error]", result.reason);
    return [];
  });
}
