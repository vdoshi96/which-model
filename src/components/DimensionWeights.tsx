import type { ExtendedBenchmarkDimension, TaskDimensions } from "@/types/model";

const DIMENSION_LABELS: Record<ExtendedBenchmarkDimension, string> = {
  reasoning: "Reasoning",
  coding: "Coding",
  math: "Math",
  instruction_following: "Instruction following",
  creative_writing: "Creative writing",
  overall: "Overall",
  tool_use: "Tool use",
  speed: "Speed",
  cost_efficiency: "Cost efficiency",
  long_context: "Long context",
};

const DIMENSION_ORDER = Object.keys(
  DIMENSION_LABELS,
) as ExtendedBenchmarkDimension[];

export function DimensionWeights({ dimensions }: { dimensions: TaskDimensions }) {
  const maxWeight = Math.max(...Object.values(dimensions), 0.01);

  return (
    <div className="space-y-3 border border-border bg-surface p-4">
      <h2 className="font-mono text-sm font-semibold uppercase text-secondary">
        Task weights
      </h2>
      <div className="space-y-3">
        {DIMENSION_ORDER.map((dimension) => {
          const weight = dimensions[dimension] ?? 0;
          const width = `${Math.max((weight / maxWeight) * 100, 2)}%`;

          return (
            <div className="grid gap-2 sm:grid-cols-[11rem_1fr_4rem]" key={dimension}>
              <div className="font-mono text-xs text-secondary">
                {DIMENSION_LABELS[dimension]}
              </div>
              <div
                aria-label={`${DIMENSION_LABELS[dimension]} weight ${weight.toFixed(
                  2,
                )}`}
                className="h-3 border border-border bg-bg"
                role="img"
              >
                <div className="h-full bg-accent" style={{ width }} />
              </div>
              <div className="font-mono text-xs text-primary sm:text-right">
                {weight.toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
