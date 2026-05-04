import type { ComparedModel } from "@/types/api";
import type { BenchmarkDimension, TaskDimensions } from "@/types/model";

import { Badge } from "./ui/Badge";

interface ComparisonTableProps {
  dimensions?: Partial<TaskDimensions>;
  models: ComparedModel[];
}

const DIMENSION_LABELS: Record<BenchmarkDimension, string> = {
  reasoning: "Reasoning",
  coding: "Coding",
  math: "Math",
  instruction_following: "Instruction following",
  overall: "Overall benchmark",
  speed: "Speed",
  cost_efficiency: "Cost efficiency",
};

const DIMENSION_ORDER = Object.keys(DIMENSION_LABELS) as BenchmarkDimension[];

function formatScore(score: number | null) {
  return score === null ? "N/A" : score.toFixed(1);
}

function formatCost(cost: number | null) {
  return cost === null ? "N/A" : `$${cost.toFixed(2)}`;
}

function formatContext(contextWindow: number | null) {
  return contextWindow === null ? "N/A" : contextWindow.toLocaleString();
}

function scoreColor(score: number | null) {
  if (score === null) {
    return "text-secondary";
  }

  if (score >= 80) {
    return "text-success";
  }

  if (score >= 60) {
    return "text-warning";
  }

  return "text-danger";
}

function relevantDimensions(
  models: ComparedModel[],
  dimensions?: Partial<TaskDimensions>,
) {
  return DIMENSION_ORDER.filter((dimension) => {
    const isTaskRelevant =
      dimensions?.[dimension] === undefined || dimensions[dimension] > 0;
    const hasModelData = models.some((model) => model.scores[dimension] !== null);

    return isTaskRelevant || hasModelData;
  });
}

export function ComparisonTable({ dimensions, models }: ComparisonTableProps) {
  if (models.length === 0) {
    return (
      <div className="border border-border bg-surface p-6 text-secondary">
        Comparison results will appear here after you compare two or more models.
      </div>
    );
  }

  const winnerScore = Math.max(...models.map((model) => model.weightedScore));
  const rows = relevantDimensions(models, dimensions);

  return (
    <div className="overflow-x-auto border border-border">
      <table className="w-full min-w-[640px] border-collapse bg-surface text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-40 border-b border-border bg-surface p-3 text-left sm:w-52">
              Metric
            </th>
            {models.map((model) => (
              <th
                className="min-w-36 border-b border-border p-3 text-left align-top"
                key={model.name}
              >
                <div className="space-y-1">
                  <div className="break-words font-mono text-primary">
                    {model.name}
                  </div>
                  <div className="text-xs text-secondary">{model.provider}</div>
                  {model.weightedScore === winnerScore ? (
                    <Badge className="border-accent text-accent">Winner</Badge>
                  ) : null}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="bg-bg">
            <td className="sticky left-0 z-10 border-b border-border bg-bg p-3 font-medium">
              Weighted overall score
            </td>
            {models.map((model) => (
              <td
                className="border-b border-border p-3 font-mono text-lg font-semibold text-accent"
                key={model.name}
              >
                {model.weightedScore.toFixed(1)}
              </td>
            ))}
          </tr>
          {rows.map((dimension) => (
            <tr key={dimension}>
              <td className="sticky left-0 z-10 border-b border-border bg-surface p-3 text-secondary">
                {DIMENSION_LABELS[dimension]}
              </td>
              {models.map((model) => (
                <td
                  className={`border-b border-border p-3 font-mono ${scoreColor(
                    model.scores[dimension],
                  )}`}
                  key={`${model.name}-${dimension}`}
                >
                  {formatScore(model.scores[dimension])}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td className="sticky left-0 z-10 border-b border-border bg-surface p-3 text-secondary">
              Cost / 1M input
            </td>
            {models.map((model) => (
              <td className="border-b border-border p-3 font-mono" key={model.name}>
                {formatCost(model.costInputPer1M)}
              </td>
            ))}
          </tr>
          <tr>
            <td className="sticky left-0 z-10 bg-surface p-3 text-secondary">
              Context window
            </td>
            {models.map((model) => (
              <td className="p-3 font-mono" key={model.name}>
                {formatContext(model.contextWindow)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
