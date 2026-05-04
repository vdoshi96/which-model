import { describe, expect, it } from "vitest";

import { buildDimensionScores, rankModels } from "@/lib/scoring";

describe("scoring", () => {
  it("ranks models by weighted benchmark average and returns benchmarks used", () => {
    const ranked = rankModels(
      [
        {
          name: "Fast Cheap",
          provider: "Acme",
          contextWindow: 8192,
          costInputPer1M: 0.1,
          costOutputPer1M: 0.2,
          benchmarks: [
            { source: "livebench", dimension: "reasoning", score: 0.4 },
            { source: "artificial_analysis", dimension: "speed", score: 1 },
          ],
        },
        {
          name: "Deep Thinker",
          provider: "Acme",
          contextWindow: 128000,
          costInputPer1M: 2,
          costOutputPer1M: 6,
          benchmarks: [
            { source: "livebench", dimension: "reasoning", score: 0.9 },
            { source: "artificial_analysis", dimension: "speed", score: 0.2 },
          ],
        },
      ],
      {
        reasoning: 0.8,
        speed: 0.2,
      },
      1,
    );

    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.model.name).toBe("Deep Thinker");
    expect(ranked[0]?.score).toBeCloseTo(0.76);
    expect(ranked[0]?.benchmarksUsed).toEqual([
      { source: "livebench", dimension: "reasoning", score: 0.9 },
      { source: "artificial_analysis", dimension: "speed", score: 0.2 },
    ]);
  });

  it("uses null for missing comparison dimension scores", () => {
    expect(
      buildDimensionScores([
        { source: "livebench", dimension: "reasoning", score: 0.9 },
      ]),
    ).toMatchObject({
      reasoning: 0.9,
      coding: null,
      math: null,
    });
  });

  it("averages multiple benchmark sources for a dimension before weighting", () => {
    expect(
      rankModels(
        [
          {
            name: "Blended",
            provider: "Acme",
            contextWindow: null,
            costInputPer1M: null,
            costOutputPer1M: null,
            benchmarks: [
              { source: "livebench", dimension: "reasoning", score: 0.6 },
              { source: "lmsys_arena", dimension: "reasoning", score: 1 },
              { source: "artificial_analysis", dimension: "speed", score: 0.2 },
            ],
          },
        ],
        { reasoning: 0.5, speed: 0.5 },
        1,
      )[0]?.score,
    ).toBeCloseTo(0.5);
  });
});
