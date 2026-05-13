"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { DimensionWeights } from "@/components/DimensionWeights";
import { RankingList } from "@/components/RankingList";
import { RecommendationTiers } from "@/components/RecommendationTiers";
import { Button } from "@/components/ui/Button";
import {
  parseRecommendationCache,
  serializeRecommendationCache,
} from "@/lib/recommendationCache";
import type { ApiError, RecommendResponse } from "@/types/api";

const RECOMMENDATION_STORAGE_KEY = "which-model:last-recommendation";
const COMPARE_TASK_STORAGE_KEY = "which-model:compare-task";
const COMPARE_RECOMMENDATIONS_STORAGE_KEY = "which-model:compare-recommendations";

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
    return parseRecommendationCache(raw, task);
  } catch {
    return null;
  }
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
          serializeRecommendationCache(task, payload as RecommendResponse),
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
      <div className="rounded-[8px] border border-border bg-surface p-5 shadow-[var(--shadow-soft)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Best models for this task
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-secondary">
              Scores combine task weights with benchmark evidence, preferences,
              and available model metadata.
            </p>
          </div>
          <div className="rounded-[6px] border border-border bg-soft px-3 py-2 font-mono text-xs uppercase text-muted">
            Recommendations
          </div>
        </div>
      </div>

      {status === "Loading" ? (
        <div className="flex min-h-40 items-center gap-3 rounded-[8px] border border-border bg-surface p-6 font-mono text-sm text-secondary">
          <span className="h-4 w-4 animate-spin rounded-full border border-accent border-t-transparent" />
          Analyzing your task...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[8px] border border-danger/70 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {result ? (
        <>
          <div className="rounded-[8px] border border-border bg-surface p-5">
            <div className="grid gap-3 sm:grid-cols-[7rem_minmax(0,1fr)]">
              <p className="font-mono text-xs uppercase text-secondary">
                Your task
              </p>
              <p className="text-base leading-7 text-primary">
                {result.taskSummary}
              </p>
            </div>
          </div>

          <DimensionWeights dimensions={result.dimensions} />

          {result.recommendationTiers ? (
            <div className="space-y-3">
              <div>
                <h2 className="text-xl font-semibold">
                  Three recommendation modes
                </h2>
                <p className="mt-1 text-sm text-secondary">
                  Each pick is constrained to the providers and models selected
                  before analysis.
                </p>
              </div>
              <RecommendationTiers tiers={result.recommendationTiers} />
            </div>
          ) : null}

          <div className="flex flex-col gap-3 rounded-[8px] border border-border bg-soft p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Top 10 ranking</h2>
              <p className="mt-1 text-sm text-secondary">
                Ranked by task weights, curated benchmark signals, preferences,
                and available model metadata. Cost affects ranking only when
                cost sensitivity is requested.
              </p>
            </div>
            <Button
              disabled={topThree.length < 2}
              onClick={handleCompareTopModels}
              variant="secondary"
            >
              <span className="inline-flex items-center gap-2">
                Compare top models
                <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 20 20">
                  <path
                    d="M4 10h11M11 6l4 4-4 4"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.7"
                  />
                </svg>
              </span>
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
