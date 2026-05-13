/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { BenchmarkBadge } from "@/components/BenchmarkBadge";
import { ModelCard } from "@/components/ModelCard";
import { RankingList } from "@/components/RankingList";
import { SplashScreen } from "@/components/SplashScreen";
import { TaskInput } from "@/components/TaskInput";
import ResultsPage from "@/app/results/page";
import type { RankedModel } from "@/types/model";

const push = jest.fn();
let searchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => searchParams,
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

  it("shows transparent scoring evidence, top contributions, evidence gaps, and provenance", () => {
    render(
      <ModelCard
        recommendation={{
          ...recommendation,
          evidenceCount: 7,
          missingEvidence: ["tool_use"],
          unavailableEvidence: ["creative_writing"],
          provenanceSummary: {
            measured: 2,
            editorial_prior: 3,
            derived_metadata: 2,
          },
          contributions: [
            {
              label: "reasoning",
              value: 0.93,
              weight: 0.8,
              contribution: 0.744,
            },
            {
              label: "coding",
              value: 0.88,
              weight: 0.6,
              contribution: 0.528,
            },
            {
              label: "tool_use",
              value: 0.7,
              weight: 0.4,
              contribution: 0.28,
            },
            {
              label: "speed",
              value: 0.5,
              weight: 0.2,
              contribution: 0.1,
            },
          ],
          rationale:
            "Claude 3.5 Sonnet ranks from reasoning and coding signals across 7 curated score rows.",
        }}
      />,
    );

    expect(screen.getByText("7 scoring signals")).toBeInTheDocument();
    expect(screen.getByText("Top contributions")).toBeInTheDocument();
    expect(screen.getByText("Reasoning")).toBeInTheDocument();
    expect(screen.getByText("value 0.93")).toBeInTheDocument();
    expect(screen.getByText("weight 0.80")).toBeInTheDocument();
    expect(screen.getByText("Coding")).toBeInTheDocument();
    expect(screen.getByText("Tool use")).toBeInTheDocument();
    expect(screen.queryByText("Speed")).not.toBeInTheDocument();
    expect(screen.getByText("Missing: Tool use")).toBeInTheDocument();
    expect(
      screen.getByText("Unavailable: Creative writing"),
    ).toBeInTheDocument();
    expect(screen.getByText("Provenance")).toBeInTheDocument();
    expect(screen.getByText(/measured: 2/)).toBeInTheDocument();
    expect(screen.getByText(/editorial prior: 3/)).toBeInTheDocument();
    expect(screen.getByText(/derived metadata: 2/)).toBeInTheDocument();
    expect(
      screen.getByText(
        "Claude 3.5 Sonnet ranks from reasoning and coding signals across 7 curated score rows.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/measured editorial prior/i)).not.toBeInTheDocument();
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
    searchParams = new URLSearchParams();
    window.localStorage.clear();
    window.sessionStorage.clear();
    global.fetch = jest.fn((input) => {
      if (input === "/api/recommend") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            taskSummary: "Creative writing needs broad quality.",
            dimensions: {
              reasoning: 0.2,
              coding: 0,
              math: 0,
              instruction_following: 0.8,
              overall: 0.9,
              speed: 0,
              cost_efficiency: 0,
            },
            recommendations: [recommendation],
          }),
        });
      }

      return Promise.resolve({
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
      });
    }) as jest.Mock;
  });

  it("loads provider groups and catalog models for the recommendation scope", async () => {
    render(<TaskInput />);

    await waitFor(() => {
      expect(screen.getByLabelText("All Anthropic models")).toBeInTheDocument();
      expect(screen.getByText("Claude Sonnet 4.6")).toBeInTheDocument();
    });
    expect(global.fetch).toHaveBeenCalledWith("/api/models");
    expect(
      screen.queryByText(/Run a recommendation once to populate model choices/),
    ).not.toBeInTheDocument();
  });

  it("tracks individual model selections in the recommendation scope", async () => {
    render(<TaskInput />);

    await waitFor(() => {
      expect(screen.getByLabelText("Claude Sonnet 4.6")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText("Claude Sonnet 4.6"));

    expect(screen.getByText("1 model")).toBeInTheDocument();
  });

  it("submits checklist preferences in the recommendation request", async () => {
    render(<TaskInput />);

    await waitFor(() => {
      expect(screen.getByLabelText("All Anthropic models")).toBeInTheDocument();
    });
    fireEvent.change(
      screen.getByPlaceholderText("Describe what you need an LLM to do..."),
      { target: { value: "Write a launch poem for a product." } },
    );
    fireEvent.click(screen.getByLabelText("All Anthropic models"));
    fireEvent.click(screen.getByLabelText("Cost conscious"));
    fireEvent.click(screen.getByLabelText("Need long context"));
    fireEvent.click(screen.getByLabelText("Low latency"));
    fireEvent.click(screen.getByRole("button", { name: "Analyze Selected Models" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/recommend",
        expect.objectContaining({
          body: JSON.stringify({
            task: "Write a launch poem for a product.",
            preferences: {
              costSensitive: true,
              preferFrontier: true,
              latencySensitive: true,
              needsLongContext: true,
              localOnly: false,
              preferredProviders: ["Anthropic"],
              preferredModels: [],
              infrastructure: [],
            },
          }),
        }),
      );
    });
  });
});

describe("ResultsPage", () => {
  beforeEach(() => {
    push.mockReset();
    searchParams = new URLSearchParams({ task: "write a launch poem" });
    window.localStorage.clear();
    window.sessionStorage.clear();
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          taskSummary: "Creative writing needs broad quality.",
          dimensions: {
            reasoning: 0.2,
            coding: 0,
            math: 0,
            instruction_following: 0.8,
            creative_writing: 0.9,
            overall: 0.9,
            tool_use: 0,
            speed: 0,
            cost_efficiency: 0,
            long_context: 0,
          },
          recommendations: [recommendation],
        }),
      }),
    ) as jest.Mock;
  });

  it("explains that ranking uses available metadata and cost only when requested", async () => {
    render(<ResultsPage />);

    expect(
      await screen.findByText(
        "Ranked by task weights, curated benchmark signals, preferences, and available model metadata. Cost affects ranking only when cost sensitivity is requested.",
      ),
    ).toBeInTheDocument();
  });
});

describe("SplashScreen", () => {
  it("presents the redesigned product entry screen and signup path", () => {
    render(<SplashScreen />);

    expect(screen.getByText(/No email required/i)).toBeInTheDocument();
    expect(screen.getByText(/Choose the right LLM/i)).toBeInTheDocument();
    expect(screen.getByText("Evidence first")).toBeInTheDocument();
    expect(screen.getByText("Try it now")).toBeInTheDocument();
    expect(screen.getByText("Evidence preview")).toBeInTheDocument();
    expect(screen.getByText("Ranked shortlist")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Find Best Models/i }))
      .toHaveAttribute("href", "/auth/signup");
  });
});
