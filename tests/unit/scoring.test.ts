
import {
  buildDimensionScores,
  isUsableBenchmarkScore,
  rankModels,
} from "@/lib/scoring";

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

  it("gives specialized benchmark sources more influence in their strongest dimensions", () => {
    const scores = buildDimensionScores([
      { source: "livebench", dimension: "coding", score: 60 },
      { source: "swe_bench", dimension: "coding", score: 90 },
    ]);

    expect(scores.coding).toBeCloseTo(76.36, 2);
  });

  it("penalizes models that are missing dimensions the task asks for", () => {
    const ranked = rankModels(
      [
        {
          name: "Narrow Coding Spike",
          provider: "Acme",
          contextWindow: null,
          costInputPer1M: null,
          costOutputPer1M: null,
          benchmarks: [
            { source: "livebench", dimension: "coding", score: 100 },
          ],
        },
        {
          name: "Balanced Model",
          provider: "Acme",
          contextWindow: null,
          costInputPer1M: null,
          costOutputPer1M: null,
          benchmarks: [
            { source: "livebench", dimension: "coding", score: 80 },
            { source: "livebench", dimension: "reasoning", score: 80 },
          ],
        },
      ],
      { coding: 1, reasoning: 1 },
      2,
    );

    expect(ranked.map((model) => model.model.name)).toEqual([
      "Balanced Model",
      "Narrow Coding Spike",
    ]);
    expect(ranked[1]?.score).toBe(50);
  });

  it("rejects stale binary LiveBench artifacts for every LiveBench dimension", () => {
    for (const dimension of ["reasoning", "coding", "math", "instruction_following"]) {
      expect(
        isUsableBenchmarkScore({
          source: "livebench",
          dimension,
          score: 100,
          rawLabel: `LiveBench ${dimension}`,
        }),
      ).toBe(false);
      expect(
        isUsableBenchmarkScore({
          source: "livebench",
          dimension,
          score: 0,
          rawLabel: `LiveBench ${dimension}`,
        }),
      ).toBe(false);
    }
  });
});
