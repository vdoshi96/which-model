/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen, within } from "@testing-library/react";

import ComparePage from "@/app/compare/page";
import { ComparisonTable } from "@/components/ComparisonTable";
import { ModelSelector } from "@/components/ModelSelector";
import type { ComparedModel } from "@/types/api";
import type { TaskDimensions } from "@/types/model";

const mockSearchParams = {
  get: jest.fn(),
  getAll: jest.fn(),
};

jest.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

const comparedModels: ComparedModel[] = [
  {
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    scores: {
      reasoning: 92,
      coding: 88,
      math: null,
      instruction_following: 81,
      overall: 90,
      speed: 63,
      cost_efficiency: 54,
    },
    weightedScore: 91.2,
    costInputPer1M: 3,
    contextWindow: 200000,
  },
  {
    name: "GPT-4o",
    provider: "OpenAI",
    scores: {
      reasoning: 78,
      coding: 72,
      math: 70,
      instruction_following: 80,
      overall: 76,
      speed: 45,
      cost_efficiency: 24,
    },
    weightedScore: 75.8,
      costInputPer1M: null,
      contextWindow: null,
      unavailableEvidence: ["creative_writing"],
    },
  ];
const taskDimensions: TaskDimensions = {
  reasoning: 0.9,
  coding: 0.8,
  math: 0.2,
  instruction_following: 0.7,
  overall: 0.6,
  speed: 0.3,
  cost_efficiency: 0.4,
};

describe("ModelSelector", () => {
  it("communicates min/max selection state and disables unselected options at the limit", () => {
    render(
      <ModelSelector
        models={["Claude 3.5 Sonnet", "GPT-4o", "Gemini 1.5 Pro"]}
        onChange={() => undefined}
        selectedModels={[
          "Claude 3.5 Sonnet",
          "GPT-4o",
          "DeepSeek V3",
          "Llama 3.1 405B",
          "Mistral Large",
        ]}
      />,
    );

    expect(screen.getByText("5 of 5 selected")).toBeInTheDocument();
    expect(screen.getByText(/Maximum reached/)).toBeInTheDocument();
    expect(screen.getByLabelText("Gemini 1.5 Pro")).toBeDisabled();
  });

  it("shows guidance when fewer than two models are selected", () => {
    render(
      <ModelSelector
        models={["Claude 3.5 Sonnet", "GPT-4o"]}
        onChange={() => undefined}
        selectedModels={["Claude 3.5 Sonnet"]}
      />,
    );

    expect(screen.getByText(/Select at least 2 models/)).toBeInTheDocument();
  });

  it("filters options by model name", () => {
    render(
      <ModelSelector
        models={["Claude 3.5 Sonnet", "GPT-4o", "Gemini 1.5 Pro"]}
        onChange={() => undefined}
        selectedModels={[]}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Search by model name..."), {
      target: { value: "gemini" },
    });

    expect(screen.getByText("Gemini 1.5 Pro")).toBeInTheDocument();
    expect(screen.queryByText("Claude 3.5 Sonnet")).not.toBeInTheDocument();
  });

  it("shows selected models as compact removable chips instead of oversized tiles", () => {
    const { container } = render(
      <ModelSelector
        models={["Claude 3.5 Sonnet", "GPT-4o", "Gemini 1.5 Pro"]}
        onChange={() => undefined}
        selectedModels={["Claude 3.5 Sonnet", "GPT-4o"]}
      />,
    );

    expect(screen.getByTestId("selected-models-strip")).toHaveTextContent(
      "Claude 3.5 Sonnet",
    );
    expect(screen.getByTestId("selected-models-strip")).toHaveTextContent("GPT-4o");
    expect(screen.getByTestId("selected-models-strip")).toHaveClass("min-h-10");
    expect(screen.getByTestId("selected-models-strip")).not.toHaveClass(
      "grid",
    );
    expect(screen.getByLabelText("Remove Claude 3.5 Sonnet")).toHaveClass(
      "max-w-48",
      "truncate",
    );
    expect(container.querySelectorAll('[data-testid="selected-model-chip"]')).toHaveLength(2);
  });

  it("renders a dense scan-friendly option list with clear selected state", () => {
    render(
      <ModelSelector
        models={["Claude 3.5 Sonnet", "GPT-4o", "Gemini 1.5 Pro"]}
        onChange={() => undefined}
        selectedModels={["Claude 3.5 Sonnet"]}
      />,
    );

    const list = screen.getByTestId("model-options-list");
    expect(list).toHaveClass("max-h-72", "divide-y");
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    const selectedOption = screen.getByLabelText("Claude 3.5 Sonnet");
    expect(selectedOption).toHaveAttribute("aria-checked", "true");
    expect(selectedOption.closest("label")).toHaveClass(
      "min-h-10",
      "bg-surface",
      "text-accent",
    );
  });
});

describe("ComparePage", () => {
  beforeEach(() => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === "models") {
        return "Claude 3.5 Sonnet,GPT-4o";
      }

      return null;
    });
    mockSearchParams.getAll.mockReturnValue([]);
    window.localStorage.clear();
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        models: [
          { name: "Claude 3.5 Sonnet" },
          { name: "GPT-4o" },
          { name: "Gemini 1.5 Pro" },
        ],
      }),
    })) as jest.Mock;
  });

  it("keeps the compare action in a sticky command bar above available models", async () => {
    const { container } = render(<ComparePage />);

    const commandBar = await screen.findByTestId("compare-command-bar");
    const selector = await screen.findByTestId("model-selector");

    expect(commandBar).toHaveClass("sticky", "top-16");
    expect(within(commandBar).getByRole("button", { name: /compare models/i }))
      .toBeInTheDocument();
    expect(commandBar.compareDocumentPosition(selector)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(container.querySelector("[data-testid='compare-command-bar'] + [data-testid='model-selector']"))
      .toBe(selector);
  });
});

describe("ComparisonTable", () => {
  it("highlights the weighted-score winner and explains unavailable evidence", () => {
    render(<ComparisonTable dimensions={taskDimensions} models={comparedModels} />);

    expect(screen.getByText("Winner")).toBeInTheDocument();
    expect(screen.getByText("91.2")).toBeInTheDocument();
    expect(screen.getAllByText("N/A")).toHaveLength(3);
    expect(screen.getByText("Reasoning")).toBeInTheDocument();
    expect(screen.getByText("Cost / 1M input")).toBeInTheDocument();
    expect(screen.getByText("Context window")).toBeInTheDocument();
    expect(screen.getByText("Evidence gaps")).toBeInTheDocument();
    expect(
      screen.getByText("Creative writing: curated evidence unavailable"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Not an N\/A placeholder/)).toBeInTheDocument();
  });

  it("uses mobile horizontal scrolling and score color classes", () => {
    const { container } = render(
      <ComparisonTable dimensions={taskDimensions} models={comparedModels} />,
    );
    const html = container.innerHTML;

    expect(html).toContain("overflow-x-auto");
    expect(html).toContain("text-success");
    expect(html).toContain("text-warning");
    expect(html).toContain("text-danger");
    expect(html).toContain("min-w-[640px]");
  });
});
