/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";

import { ComparisonTable } from "@/components/ComparisonTable";
import { ModelSelector } from "@/components/ModelSelector";
import type { ComparedModel } from "@/types/api";
import type { TaskDimensions } from "@/types/model";

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
});

describe("ComparisonTable", () => {
  it("highlights the weighted-score winner and renders missing data as N/A", () => {
    render(<ComparisonTable dimensions={taskDimensions} models={comparedModels} />);

    expect(screen.getByText("Winner")).toBeInTheDocument();
    expect(screen.getByText("91.2")).toBeInTheDocument();
    expect(screen.getAllByText("N/A")).toHaveLength(3);
    expect(screen.getByText("Reasoning")).toBeInTheDocument();
    expect(screen.getByText("Cost / 1M input")).toBeInTheDocument();
    expect(screen.getByText("Context window")).toBeInTheDocument();
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
