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
    <div className="rounded-[8px] border border-border bg-surface p-4 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-primary">Task weights</h2>
        <span className="font-mono text-[11px] uppercase text-muted">
          normalized by task
        </span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {DIMENSION_ORDER.map((dimension) => {
          const weight = dimensions[dimension] ?? 0;
          const width = `${Math.max((weight / maxWeight) * 100, 2)}%`;

          return (
            <div className="grid gap-2" key={dimension}>
              <div className="flex items-center justify-between gap-3">
                <div className="font-mono text-xs text-secondary">
                  {DIMENSION_LABELS[dimension]}
                </div>
                <div className="font-mono text-xs text-primary">
                  {weight.toFixed(2)}
                </div>
              </div>
              <div
                aria-label={`${DIMENSION_LABELS[dimension]} weight ${weight.toFixed(
                  2,
                )}`}
                className="h-2 overflow-hidden rounded-full bg-border"
                role="img"
              >
                <div className="h-full rounded-full bg-cyan" style={{ width }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
