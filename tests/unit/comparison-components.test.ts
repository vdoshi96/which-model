import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

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
    const html = renderToStaticMarkup(
      createElement(ModelSelector, {
        models: ["Claude 3.5 Sonnet", "GPT-4o", "Gemini 1.5 Pro"],
        onChange: () => undefined,
        selectedModels: [
          "Claude 3.5 Sonnet",
          "GPT-4o",
          "DeepSeek V3",
          "Llama 3.1 405B",
          "Mistral Large",
        ],
      }),
    );

    expect(html).toContain("5 of 5 selected");
    expect(html).toContain("Maximum reached");
    expect(html).toContain("disabled");
  });

  it("shows guidance when fewer than two models are selected", () => {
    const html = renderToStaticMarkup(
      createElement(ModelSelector, {
        models: ["Claude 3.5 Sonnet", "GPT-4o"],
        onChange: () => undefined,
        selectedModels: ["Claude 3.5 Sonnet"],
      }),
    );

    expect(html).toContain("Select at least 2 models");
  });
});

describe("ComparisonTable", () => {
  it("highlights the weighted-score winner and renders missing data as N/A", () => {
    const html = renderToStaticMarkup(
      createElement(ComparisonTable, {
        dimensions: taskDimensions,
        models: comparedModels,
      }),
    );

    expect(html).toContain("Winner");
    expect(html).toContain("91.2");
    expect(html).toContain("N/A");
    expect(html).toContain("Reasoning");
    expect(html).toContain("Cost / 1M input");
    expect(html).toContain("Context window");
  });

  it("uses mobile horizontal scrolling and score color classes", () => {
    const html = renderToStaticMarkup(
      createElement(ComparisonTable, {
        dimensions: taskDimensions,
        models: comparedModels,
      }),
    );

    expect(html).toContain("overflow-x-auto");
    expect(html).toContain("text-success");
    expect(html).toContain("text-warning");
    expect(html).toContain("text-danger");
    expect(html).toContain("min-w-[640px]");
  });
});
