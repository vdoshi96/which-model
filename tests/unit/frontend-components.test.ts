import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BenchmarkBadge } from "@/components/BenchmarkBadge";
import { ModelCard } from "@/components/ModelCard";
import { RankingList } from "@/components/RankingList";
import type { RankedModel } from "@/types/model";

const recommendation: RankedModel = {
  rank: 1,
  model: {
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    contextWindow: 200000,
    costInputPer1M: 3,
    costOutputPer1M: 15,
  },
  score: 0.912,
  benchmarksUsed: [
    {
      source: "livebench",
      dimension: "reasoning",
      score: 0.93,
      rawLabel: "Reasoning",
    },
    {
      source: "lmsys_arena",
      dimension: "overall",
      score: 0.88,
      rawLabel: "Arena",
    },
    {
      source: "artificial_analysis",
      dimension: "speed",
      score: 0.81,
      rawLabel: "Quality Index",
    },
    {
      source: "hf_leaderboard",
      dimension: "math",
      score: 0.79,
      rawLabel: "MATH",
    },
  ],
};

describe("BenchmarkBadge", () => {
  it("renders a readable source label, score, and source-specific color", () => {
    const html = renderToStaticMarkup(
      createElement(BenchmarkBadge, {
        score: 0.93,
        source: "livebench",
      }),
    );

    expect(html).toContain("LiveBench");
    expect(html).toContain("0.93");
    expect(html).toContain("border-success");
  });
});

describe("ModelCard", () => {
  it("shows rank, model identity, weighted score, benchmark badges, cost, and context", () => {
    const html = renderToStaticMarkup(
      createElement(ModelCard, {
        recommendation,
      }),
    );

    expect(html).toContain("#1");
    expect(html).toContain("Claude 3.5 Sonnet");
    expect(html).toContain("Anthropic");
    expect(html).toContain("0.91");
    expect(html).toContain("LiveBench");
    expect(html).toContain("LMSYS Arena");
    expect(html).toContain("Artificial Analysis");
    expect(html).not.toContain("HF Leaderboard");
    expect(html).toContain("$3.00 / $15.00");
    expect(html).toContain("200,000 tokens");
  });

  it("renders unknown cost and context without empty gaps", () => {
    const html = renderToStaticMarkup(
      createElement(ModelCard, {
        recommendation: {
          ...recommendation,
          model: {
            ...recommendation.model,
            contextWindow: null,
            costInputPer1M: null,
            costOutputPer1M: null,
          },
        },
      }),
    );

    expect(html).toContain("Cost unavailable");
    expect(html).toContain("Context unavailable");
  });
});

describe("RankingList", () => {
  it("limits the visible ranking to the top ten models", () => {
    const recommendations = Array.from({ length: 12 }, (_, index) => ({
      ...recommendation,
      rank: index + 1,
      model: {
        ...recommendation.model,
        name: `Model ${index + 1}`,
      },
    }));

    const html = renderToStaticMarkup(
      createElement(RankingList, {
        recommendations,
      }),
    );

    expect(html).toContain("Model 10");
    expect(html).not.toContain("Model 11");
  });
});
