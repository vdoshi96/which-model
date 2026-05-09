import type { ExtendedBenchmarkDimension, RankedModel } from "@/types/model";

import { BenchmarkBadge } from "./BenchmarkBadge";
import { Card } from "./ui/Card";

interface ModelCardProps {
  recommendation: RankedModel;
}

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

function formatDimensionLabel(dimension: string) {
  return (
    DIMENSION_LABELS[dimension as ExtendedBenchmarkDimension] ??
    dimension.replaceAll("_", " ")
  );
}

function formatMetric(value: number) {
  return value.toFixed(2);
}

function formatEvidenceList(dimensions: string[]) {
  return dimensions.map(formatDimensionLabel).join(", ");
}

function formatProvenanceSummary(summary: Record<string, number>) {
  return Object.entries(summary)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([provenance, count]) => `${provenance.replaceAll("_", " ")}: ${count}`)
    .join(", ");
}

export function ModelCard({ recommendation }: ModelCardProps) {
  const signalCount =
    recommendation.evidenceCount ?? recommendation.benchmarksUsed.length;
  const topContributions = [...(recommendation.contributions ?? [])]
    .sort((left, right) => right.contribution - left.contribution)
    .slice(0, 3);
  const missingEvidence = recommendation.missingEvidence ?? [];
  const unavailableEvidence = recommendation.unavailableEvidence ?? [];
  const provenanceSummary = recommendation.provenanceSummary
    ? formatProvenanceSummary(recommendation.provenanceSummary)
    : "";

  return (
    <Card className="space-y-4 p-0">
      <div className="grid gap-4 p-4 sm:grid-cols-[3rem_minmax(0,1fr)_8rem] sm:items-center">
        <div className="grid h-9 w-9 place-items-center rounded-[6px] border border-border bg-soft font-mono text-sm text-accent">
          #{recommendation.rank}
        </div>
        <div className="min-w-0">
          <h2 className="break-words text-xl font-semibold leading-tight">
            {recommendation.model.name}
          </h2>
          <p className="mt-1 text-sm text-secondary">
            {recommendation.model.provider}
          </p>
        </div>
        <div className="shrink-0 sm:text-right">
          <p className="font-mono text-xs uppercase text-secondary">
            Weighted score
          </p>
          <p className="mt-1 font-mono text-3xl font-semibold text-cyan">
            {recommendation.score.toFixed(2)}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-y border-border bg-soft/60 px-4 py-3">
        <p className="mr-1 font-mono text-xs text-secondary">
          {formatSignalCount(signalCount)}
        </p>
        {recommendation.benchmarksUsed.slice(0, 3).map((benchmark) => (
          <BenchmarkBadge
            key={`${benchmark.source}-${benchmark.dimension}`}
            score={benchmark.score}
            source={benchmark.source}
          />
        ))}
      </div>
      {topContributions.length > 0 ? (
        <div className="space-y-2 px-4">
          <p className="font-mono text-xs uppercase text-secondary">
            Top contributions
          </p>
          <div className="space-y-2">
            {topContributions.map((contribution) => (
              <div
                className="grid min-h-9 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 text-sm"
                key={contribution.label}
              >
                <span className="min-w-0 truncate text-primary">
                  {formatDimensionLabel(contribution.label)}
                </span>
                <span className="whitespace-nowrap font-mono text-xs text-secondary">
                  value {formatMetric(contribution.value)}
                </span>
                <span className="whitespace-nowrap font-mono text-xs text-secondary">
                  weight {formatMetric(contribution.weight)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {missingEvidence.length > 0 || unavailableEvidence.length > 0 ? (
        <div className="flex flex-wrap gap-2 border-t border-border px-4 pt-4">
          {missingEvidence.length > 0 ? (
            <span className="inline-flex min-h-7 items-center rounded-[5px] border border-warning/70 bg-warning/10 px-2 py-1 font-mono text-xs text-warning">
              Missing: {formatEvidenceList(missingEvidence)}
            </span>
          ) : null}
          {unavailableEvidence.length > 0 ? (
            <span className="inline-flex min-h-7 items-center rounded-[5px] border border-border bg-soft px-2 py-1 font-mono text-xs text-secondary">
              Unavailable: {formatEvidenceList(unavailableEvidence)}
            </span>
          ) : null}
        </div>
      ) : null}
      {recommendation.rationale || provenanceSummary ? (
        <div className="space-y-2 border-t border-border px-4 pt-4 text-sm">
          {provenanceSummary ? (
            <p className="font-mono text-xs text-secondary">
              <span className="uppercase">Provenance</span>{" "}
              <span>{provenanceSummary}</span>
            </p>
          ) : null}
          {recommendation.rationale ? (
            <p className="leading-6 text-secondary">{recommendation.rationale}</p>
          ) : null}
        </div>
      ) : null}
      <div className="grid gap-3 border-t border-border p-4 text-sm sm:grid-cols-2">
        <div className="rounded-[6px] border border-border bg-soft p-3">
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
        <div className="rounded-[6px] border border-border bg-soft p-3">
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
