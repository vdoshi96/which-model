import type { ComparedModel } from "@/types/api";
import type { ExtendedBenchmarkDimension, TaskDimensions } from "@/types/model";

import { Badge } from "./ui/Badge";

interface ComparisonTableProps {
  dimensions?: Partial<TaskDimensions>;
  models: ComparedModel[];
}

const DIMENSION_LABELS: Record<ExtendedBenchmarkDimension, string> = {
  reasoning: "Reasoning",
  coding: "Coding",
  math: "Math",
  instruction_following: "Instruction following",
  creative_writing: "Creative writing",
  overall: "Overall benchmark",
  tool_use: "Tool use",
  speed: "Speed",
  cost_efficiency: "Cost efficiency",
  long_context: "Long context",
};

const DIMENSION_ORDER = Object.keys(
  DIMENSION_LABELS,
) as ExtendedBenchmarkDimension[];

function formatScore(score: number | null | undefined) {
  return score == null ? "N/A" : score.toFixed(1);
}

function formatCost(cost: number | null) {
  return cost === null ? "N/A" : `$${cost.toFixed(2)}`;
}

function formatContext(contextWindow: number | null) {
  return contextWindow === null ? "N/A" : contextWindow.toLocaleString();
}

function scoreColor(score: number | null | undefined) {
  if (score == null) {
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
    const isTaskRelevant = (dimensions?.[dimension] ?? 0) > 0;
    const hasModelData = models.some((model) => model.scores[dimension] != null);

    return isTaskRelevant || hasModelData;
  });
}

function uniqueEvidenceGaps(models: ComparedModel[]) {
  return Array.from(
    new Set(
      models.flatMap((model) => [
        ...(model.unavailableEvidence ?? []).map(
          (dimension) =>
            `${DIMENSION_LABELS[dimension as ExtendedBenchmarkDimension] ?? dimension}: curated evidence unavailable`,
        ),
        ...(model.missingEvidence ?? []).map(
          (dimension) =>
            `${DIMENSION_LABELS[dimension as ExtendedBenchmarkDimension] ?? dimension}: missing for at least one selected model`,
        ),
      ]),
    ),
  );
}

export function ComparisonTable({ dimensions, models }: ComparisonTableProps) {
  if (models.length === 0) {
    return (
      <div className="rounded-[8px] border border-border bg-surface p-6 text-secondary">
        Comparison results will appear here after you compare two or more models.
      </div>
    );
  }

  const winnerScore = Math.max(...models.map((model) => model.weightedScore));
  const rows = relevantDimensions(models, dimensions);
  const evidenceGaps = uniqueEvidenceGaps(models);

  return (
    <div className="overflow-hidden rounded-[8px] border border-border bg-surface shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold text-primary">Compare models</h2>
        <span className="font-mono text-[11px] uppercase text-muted">
          Top 5 ranking
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] table-fixed border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-40 border-b border-border bg-surface p-3 text-left font-mono text-xs uppercase text-secondary sm:w-52">
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
            <tr className="bg-soft">
              <td className="sticky left-0 z-10 border-b border-border bg-soft p-3 font-medium">
                Weighted overall score
              </td>
              {models.map((model) => (
                <td
                  className="border-b border-border p-3 font-mono text-lg font-semibold text-cyan"
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
                <td
                  className="border-b border-border p-3 font-mono"
                  key={model.name}
                >
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
      {evidenceGaps.length > 0 ? (
        <div className="border-t border-border bg-soft p-3 text-xs text-secondary">
          <div className="font-mono uppercase">Evidence gaps</div>
          <p className="mt-1">
            Not an N/A placeholder: these notes show where curated benchmark
            evidence is missing or unavailable.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {evidenceGaps.map((gap) => (
              <span className="rounded-[5px] border border-border bg-surface px-2 py-1" key={gap}>
                {gap}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
