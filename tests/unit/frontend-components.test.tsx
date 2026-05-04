/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";

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
    const { container } = render(<BenchmarkBadge score={0.93} source="livebench" />);

    expect(screen.getByText(/LiveBench/)).toBeInTheDocument();
    expect(screen.getByText(/0.93/)).toBeInTheDocument();
    expect(container.innerHTML).toContain("border-success");
  });
});

describe("ModelCard", () => {
  it("shows rank, model identity, weighted score, benchmark badges, cost, and context", () => {
    render(<ModelCard recommendation={recommendation} />);

    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("Claude 3.5 Sonnet")).toBeInTheDocument();
    expect(screen.getByText("Anthropic")).toBeInTheDocument();
    expect(screen.getByText("0.91")).toBeInTheDocument();
    expect(screen.getByText(/LiveBench/)).toBeInTheDocument();
    expect(screen.getByText(/LMSYS Arena/)).toBeInTheDocument();
    expect(screen.getByText(/Artificial Analysis/)).toBeInTheDocument();
    expect(screen.queryByText(/HF Leaderboard/)).not.toBeInTheDocument();
    expect(screen.getByText("$3.00 / $15.00")).toBeInTheDocument();
    expect(screen.getByText("200,000 tokens")).toBeInTheDocument();
  });

  it("renders unknown cost and context without empty gaps", () => {
    render(
      <ModelCard
        recommendation={{
          ...recommendation,
          model: {
            ...recommendation.model,
            contextWindow: null,
            costInputPer1M: null,
            costOutputPer1M: null,
          },
        }}
      />,
    );

    expect(screen.getByText("Cost unavailable")).toBeInTheDocument();
    expect(screen.getByText("Context unavailable")).toBeInTheDocument();
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

    render(<RankingList recommendations={recommendations} />);

    expect(screen.getByText("Model 10")).toBeInTheDocument();
    expect(screen.queryByText("Model 11")).not.toBeInTheDocument();
  });
});
