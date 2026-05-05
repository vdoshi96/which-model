import {
  buildInitialCompareSelection,
  mergeSelectedWithRecommendations,
} from "@/lib/compareSelection";

describe("compare selection helpers", () => {
  it("prefers URL-selected models over stale stored recommendation selections", () => {
    expect(
      buildInitialCompareSelection({
        selectedFromUrl: ["Claude Sonnet 4.6", "GPT-5.3 Codex (xhigh)"],
        storedRecommendations: ["Old A", "Old B", "Old C", "Old D", "Old E"],
      }),
    ).toEqual(["Claude Sonnet 4.6", "GPT-5.3 Codex (xhigh)"]);
  });

  it("fills open comparison slots with task recommendations without replacing selected models", () => {
    expect(
      mergeSelectedWithRecommendations({
        recommendedNames: [
          "GPT-5.3 Codex (xhigh)",
          "Gemini 3 Pro",
          "Claude Sonnet 4.6",
          "GPT-5.4",
          "DeepSeek V4 Pro",
        ],
        selectedModels: ["Claude Sonnet 4.6", "GPT-5.3 Codex (xhigh)"],
      }),
    ).toEqual([
      "Claude Sonnet 4.6",
      "GPT-5.3 Codex (xhigh)",
      "Gemini 3 Pro",
      "GPT-5.4",
      "DeepSeek V4 Pro",
    ]);
  });
});
