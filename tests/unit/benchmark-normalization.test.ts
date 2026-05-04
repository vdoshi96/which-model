import { describe, expect, it } from "vitest";

import {
  normalizeCostScores,
  normalizeEloScores,
  normalizePercentageScore,
  normalizeSpeedScores,
} from "@/lib/benchmarkSources/normalization";

describe("benchmark normalization", () => {
  it("normalizes ELO values against the dataset minimum and maximum", () => {
    expect(normalizeEloScores([900, 1000, 1100])).toEqual([0, 50, 100]);
  });

  it("keeps percentage scores on a 0-100 scale", () => {
    expect(normalizePercentageScore(88.4)).toBe(88.4);
    expect(normalizePercentageScore(0.721)).toBe(72.1);
    expect(normalizePercentageScore(120)).toBe(100);
  });

  it("normalizes speed with fastest model as 100", () => {
    expect(normalizeSpeedScores([20, 40, 80])).toEqual([25, 50, 100]);
  });

  it("normalizes cost with cheapest model as 100", () => {
    expect(normalizeCostScores([0.5, 1, 2])).toEqual([100, 50, 25]);
  });
});
