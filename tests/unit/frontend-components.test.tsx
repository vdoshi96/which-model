/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { BenchmarkBadge } from "@/components/BenchmarkBadge";
import { ModelCard } from "@/components/ModelCard";
import { RankingList } from "@/components/RankingList";
import { SplashScreen } from "@/components/SplashScreen";
import { TaskInput } from "@/components/TaskInput";
import type { RankedModel } from "@/types/model";

const push = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

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
    expect(screen.getByText("4 scoring signals")).toBeInTheDocument();
    expect(screen.getByText("$3.00 / $15.00")).toBeInTheDocument();
    expect(screen.getByText("200,000 tokens")).toBeInTheDocument();
  });

  it("labels catalog prior signals clearly", () => {
    render(
      <ModelCard
        recommendation={{
          ...recommendation,
          benchmarksUsed: [
            {
              source: "catalog_prior",
              dimension: "overall",
              score: 97,
              rawLabel: "Curated catalog prior",
            },
          ],
        }}
      />,
    );

    expect(screen.getByText(/Catalog prior/)).toBeInTheDocument();
    expect(screen.getByText("1 scoring signal")).toBeInTheDocument();
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

describe("TaskInput", () => {
  beforeEach(() => {
    push.mockReset();
    window.localStorage.clear();
    window.sessionStorage.clear();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [
          {
            name: "Claude Sonnet 4.6",
            provider: "Anthropic",
            contextWindow: 1_000_000,
            costInputPer1M: 3,
            costOutputPer1M: 15,
            hasBenchmarks: false,
            status: "active",
          },
        ],
      }),
    }) as jest.Mock;
  });

  it("loads catalog models when opening the specific-model selector", async () => {
    render(<TaskInput />);

    fireEvent.click(screen.getByLabelText("Compare specific models"));

    await waitFor(() => {
      expect(screen.getByText("Claude Sonnet 4.6")).toBeInTheDocument();
    });
    expect(global.fetch).toHaveBeenCalledWith("/api/models");
    expect(
      screen.queryByText(/Run a recommendation once to populate model choices/),
    ).not.toBeInTheDocument();
  });

  it("loads model choices from the versioned recommendation cache", async () => {
    window.sessionStorage.setItem(
      "which-model:last-recommendation",
      JSON.stringify({
        version: 2,
        task: "write a song",
        payload: {
          taskSummary: "Creative writing needs broad quality.",
          dimensions: {
            reasoning: 0.2,
            coding: 0,
            math: 0,
            instruction_following: 0.7,
            overall: 0.9,
            speed: 0,
            cost_efficiency: 0,
          },
          recommendations: [
            {
              rank: 1,
              model: {
                name: "GPT-5.5",
                provider: "OpenAI",
                contextWindow: 1000000,
                costInputPer1M: 5,
                costOutputPer1M: 30,
              },
              score: 96,
              benchmarksUsed: [],
            },
          ],
        },
      }),
    );
    render(<TaskInput />);

    fireEvent.click(screen.getByLabelText("Compare specific models"));

    await waitFor(() => {
      expect(screen.getByText("GPT-5.5")).toBeInTheDocument();
    });
  });
});

describe("SplashScreen", () => {
  it("explains username/password signup and shows mock test-run artifacts", () => {
    render(<SplashScreen />);

    expect(screen.getByText(/No email required/i)).toBeInTheDocument();
    expect(screen.getByText(/username and password/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Mock test run/i)).toHaveLength(2);
    expect(screen.getByText(/Legal reasoning summary/i)).toBeInTheDocument();
    expect(screen.getByText(/Coding agent comparison/i)).toBeInTheDocument();
  });
});
