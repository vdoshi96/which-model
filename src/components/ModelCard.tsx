import type { RankedModel } from "@/types/model";

import { BenchmarkBadge } from "./BenchmarkBadge";
import { Card } from "./ui/Card";

interface ModelCardProps {
  recommendation: RankedModel;
}

function formatCost(input: number | null, output: number | null) {
  if (input === null && output === null) {
    return "Cost unavailable";
  }

  const inputCost = input === null ? "N/A" : `$${input.toFixed(2)}`;
  const outputCost = output === null ? "N/A" : `$${output.toFixed(2)}`;

  return `${inputCost} / ${outputCost}`;
}

function formatContext(contextWindow: number | null) {
  return contextWindow === null
    ? "Context unavailable"
    : `${contextWindow.toLocaleString()} tokens`;
}

function formatSignalCount(count: number) {
  return `${count} scoring ${count === 1 ? "signal" : "signals"}`;
}

export function ModelCard({ recommendation }: ModelCardProps) {
  return (
    <Card className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-xs text-secondary">
            #{recommendation.rank}
          </p>
          <h2 className="break-words font-mono text-xl font-semibold leading-tight">
            {recommendation.model.name}
          </h2>
          <p className="text-sm text-secondary">{recommendation.model.provider}</p>
        </div>
        <div className="shrink-0 sm:text-right">
          <p className="font-mono text-xs uppercase text-secondary">
            Weighted score
          </p>
          <p className="font-mono text-2xl font-semibold text-accent">
            {recommendation.score.toFixed(2)}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {recommendation.benchmarksUsed.slice(0, 3).map((benchmark) => (
          <BenchmarkBadge
            key={`${benchmark.source}-${benchmark.dimension}`}
            score={benchmark.score}
            source={benchmark.source}
          />
        ))}
      </div>
      <p className="font-mono text-xs text-secondary">
        {formatSignalCount(recommendation.benchmarksUsed.length)}
      </p>
      <div className="grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-2">
        <div>
          <p className="font-mono text-xs uppercase text-secondary">
            Cost / 1M tokens
          </p>
          <p className="mt-1 font-mono text-primary">
            {formatCost(
              recommendation.model.costInputPer1M,
              recommendation.model.costOutputPer1M,
            )}
          </p>
        </div>
        <div>
          <p className="font-mono text-xs uppercase text-secondary">
            Context window
          </p>
          <p className="mt-1 font-mono text-primary">
            {formatContext(recommendation.model.contextWindow)}
          </p>
        </div>
      </div>
    </Card>
  );
}
