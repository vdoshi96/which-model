"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { RankingList } from "@/components/RankingList";
import { Button } from "@/components/ui/Button";
import type { ApiError, RecommendResponse } from "@/types/api";
import type { BenchmarkDimension, TaskDimensions } from "@/types/model";

const RECOMMENDATION_STORAGE_KEY = "which-model:last-recommendation";
const COMPARE_TASK_STORAGE_KEY = "which-model:compare-task";
const COMPARE_RECOMMENDATIONS_STORAGE_KEY = "which-model:compare-recommendations";

const DIMENSION_LABELS: Record<BenchmarkDimension, string> = {
  reasoning: "Reasoning",
  coding: "Coding",
  math: "Math",
  instruction_following: "Instruction following",
  overall: "Overall",
  speed: "Speed",
  cost_efficiency: "Cost efficiency",
};

const DIMENSION_ORDER = Object.keys(DIMENSION_LABELS) as BenchmarkDimension[];

function getErrorMessage(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof (payload as ApiError).error === "string"
  ) {
    return (payload as ApiError).error;
  }

  return fallback;
}

function readStoredRecommendation(task: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(RECOMMENDATION_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as RecommendResponse;
    return parsed.recommendations.length > 0 && task ? parsed : null;
  } catch {
    return null;
  }
}

function DimensionWeights({ dimensions }: { dimensions: TaskDimensions }) {
  const maxWeight = Math.max(...Object.values(dimensions), 0.01);

  return (
    <div className="space-y-3 border border-border bg-surface p-4">
      <h2 className="font-mono text-sm font-semibold uppercase text-secondary">
        Task weights
      </h2>
      <div className="space-y-3">
        {DIMENSION_ORDER.map((dimension) => {
          const weight = dimensions[dimension];
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

function ResultsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const task = searchParams.get("task")?.trim() ?? "";
  const [result, setResult] = useState<RecommendResponse | null>(null);
  const [status, setStatus] = useState("Idle");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadRecommendation() {
      if (!task) {
        setError("Describe a task on the home page to see recommendations.");
        setStatus("Error");
        return;
      }

      const storedResult = readStoredRecommendation(task);

      if (storedResult) {
        setResult(storedResult);
        setStatus("Loaded");
        return;
      }

      setStatus("Loading");
      setError("");

      try {
        const response = await fetch("/api/recommend", {
          body: JSON.stringify({ task }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const payload = (await response.json()) as RecommendResponse | ApiError;

        if (!response.ok) {
          throw new Error(
            getErrorMessage(payload, "Could not load recommendations."),
          );
        }

        if (cancelled) {
          return;
        }

        setResult(payload as RecommendResponse);
        window.sessionStorage.setItem(
          RECOMMENDATION_STORAGE_KEY,
          JSON.stringify(payload),
        );
        setStatus("Loaded");
      } catch (requestError) {
        if (!cancelled) {
          setStatus("Error");
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Could not load recommendations.",
          );
        }
      }
    }

    void loadRecommendation();

    return () => {
      cancelled = true;
    };
  }, [task]);

  const topThree = useMemo(
    () =>
      result?.recommendations
        .slice(0, 3)
        .map((recommendation) => recommendation.model.name) ?? [],
    [result],
  );

  function handleCompareTopModels() {
    if (!task || topThree.length < 2) {
      setError("At least two recommended models are needed for comparison.");
      return;
    }

    window.localStorage.setItem(COMPARE_TASK_STORAGE_KEY, task);
    window.localStorage.setItem(
      COMPARE_RECOMMENDATIONS_STORAGE_KEY,
      JSON.stringify(topThree),
    );
    const params = new URLSearchParams({
      models: topThree.join(","),
      task,
    });

    router.push(`/compare?${params.toString()}`);
  }

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-secondary">
          Recommendations
        </p>
        <h1 className="font-mono text-3xl font-semibold sm:text-4xl">
          Best models for this task
        </h1>
      </div>

      {status === "Loading" ? (
        <div className="flex min-h-40 items-center gap-3 border border-border bg-surface p-6 font-mono text-sm text-secondary">
          <span className="h-4 w-4 animate-spin border border-accent border-t-transparent" />
          Analyzing your task...
        </div>
      ) : null}

      {error ? (
        <div className="border border-danger bg-surface p-4 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {result ? (
        <>
          <div className="border border-border bg-surface p-5">
            <p className="font-mono text-xs uppercase text-secondary">
              Task summary
            </p>
            <p className="mt-2 text-base leading-7 text-primary">
              {result.taskSummary}
            </p>
          </div>

          <DimensionWeights dimensions={result.dimensions} />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-mono text-xl font-semibold">Top 10 ranking</h2>
              <p className="mt-1 text-sm text-secondary">
                Ranked by task-weighted benchmark fit.
              </p>
            </div>
            <Button
              disabled={topThree.length < 2}
              onClick={handleCompareTopModels}
              variant="secondary"
            >
              Compare top models
            </Button>
          </div>

          <RankingList recommendations={result.recommendations} />
        </>
      ) : null}
    </section>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="text-secondary">Loading results...</div>}>
      <ResultsPageContent />
    </Suspense>
  );
}
