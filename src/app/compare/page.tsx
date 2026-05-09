"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { DimensionWeights } from "@/components/DimensionWeights";
import { ComparisonTable } from "@/components/ComparisonTable";
import { ModelSelector } from "@/components/ModelSelector";
import { RankingList } from "@/components/RankingList";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { buildInitialCompareSelection } from "@/lib/compareSelection";
import type {
  ApiError,
  CompareResponse,
  ModelsResponse,
  RecommendResponse,
} from "@/types/api";
import type { RankedModel } from "@/types/model";

const MAX_MODELS = 5;
const MIN_MODELS = 2;
const TASK_STORAGE_KEY = "which-model:compare-task";
const RECOMMENDATIONS_STORAGE_KEY = "which-model:compare-recommendations";

function parseModelNames(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
}

function uniqueModelNames(names: string[]) {
  return Array.from(new Set(names.filter(Boolean)));
}

function readStoredTask() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(TASK_STORAGE_KEY) ?? "";
}

function readStoredRecommendations() {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(RECOMMENDATIONS_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

async function fetchCatalogModelNames() {
  const response = await fetch("/api/models");

  if (!response.ok) {
    throw new Error("Could not load model catalog.");
  }

  const payload = (await response.json()) as ModelsResponse;
  return payload.models.map((model) => model.name);
}

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

function toRankedRecommendations(comparison: CompareResponse): RankedModel[] {
  return comparison.models.map((model, index) => ({
    rank: index + 1,
    model: {
      name: model.name,
      provider: model.provider,
      contextWindow: model.contextWindow,
      costInputPer1M: model.costInputPer1M,
      costOutputPer1M: model.costOutputPer1M ?? null,
    },
    score: model.weightedScore,
    benchmarksUsed: model.benchmarksUsed ?? [],
    evidenceCount: model.evidenceCount,
    missingEvidence: model.missingEvidence,
    unavailableEvidence: model.unavailableEvidence,
    provenanceSummary: model.provenanceSummary,
    contributions: model.contributions,
    rationale: model.rationale,
  }));
}

function ComparePageContent() {
  const searchParams = useSearchParams();
  const taskFromUrl = searchParams.get("task") ?? "";
  const selectedFromUrl = [
    ...searchParams.getAll("model"),
    ...parseModelNames(searchParams.get("models")),
    ...parseModelNames(searchParams.get("modelNames")),
  ];
  const [task, setTask] = useState("");
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [comparison, setComparison] = useState<CompareResponse | null>(null);
  const [recommendationStatus, setRecommendationStatus] = useState("Idle");
  const [comparisonStatus, setComparisonStatus] = useState("Idle");
  const [recommendedTask, setRecommendedTask] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const initialTask = taskFromUrl.trim() || readStoredTask();
    const storedRecommendations = readStoredRecommendations();
    const initialSelection = buildInitialCompareSelection({
      selectedFromUrl,
      storedRecommendations,
    });

    setTask(initialTask);
    setModelOptions(
      uniqueModelNames([
        ...initialSelection,
        ...(selectedFromUrl.length > 0 ? [] : storedRecommendations),
      ]),
    );
    setSelectedModels(initialSelection);
  }, [taskFromUrl, searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalogModels() {
      try {
        const catalogModelNames = await fetchCatalogModelNames();

        if (!cancelled) {
          setModelOptions((current) =>
            uniqueModelNames([...current, ...catalogModelNames]),
          );
        }
      } catch {
        // Stored and recommendation-derived options still keep comparison usable.
      }
    }

    void loadCatalogModels();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const trimmedTask = task.trim();

    if (!trimmedTask) {
      return;
    }

    window.localStorage.setItem(TASK_STORAGE_KEY, trimmedTask);
  }, [task]);

  useEffect(() => {
    const trimmedTask = task.trim();
    let cancelled = false;

    if (!trimmedTask || trimmedTask === recommendedTask) {
      return;
    }

    async function loadRecommendations() {
      setRecommendationStatus("Loading");
      setError("");

      try {
        const response = await fetch("/api/recommend", {
          body: JSON.stringify({ task: trimmedTask }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const payload = (await response.json()) as RecommendResponse | ApiError;

        if (!response.ok) {
          throw new Error(
            getErrorMessage(payload, "Could not load recommended models."),
          );
        }

        if (cancelled) {
          return;
        }

        const recommendedNames = (payload as RecommendResponse).recommendations
          .slice(0, MAX_MODELS)
          .map((recommendation) => recommendation.model.name);

        setModelOptions((current) =>
          uniqueModelNames([...current, ...recommendedNames]),
        );
        window.localStorage.setItem(
          RECOMMENDATIONS_STORAGE_KEY,
          JSON.stringify(recommendedNames),
        );
        setRecommendedTask(trimmedTask);
        setRecommendationStatus("Loaded");
      } catch (requestError) {
        if (!cancelled) {
          setRecommendedTask(trimmedTask);
          setRecommendationStatus("Error");
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Could not load recommended models.",
          );
        }
      }
    }

    const timeoutId = window.setTimeout(() => {
      void loadRecommendations();
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [recommendedTask, task]);

  const canCompare = task.trim().length > 0 && selectedModels.length >= MIN_MODELS;
  const selectedSummary = useMemo(
    () => selectedModels.join(", "),
    [selectedModels],
  );
  const comparedRecommendations = useMemo(
    () => (comparison ? toRankedRecommendations(comparison) : []),
    [comparison],
  );

  async function handleCompare() {
    if (!canCompare || selectedModels.length > MAX_MODELS) {
      setError("Select 2 to 5 models before comparing.");
      return;
    }

    setComparisonStatus("Loading");
    setError("");

    try {
      const response = await fetch("/api/compare", {
        body: JSON.stringify({
          modelNames: selectedModels,
          task: task.trim(),
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as CompareResponse | ApiError;

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Comparison failed."));
      }

      setComparison(payload as CompareResponse);
      setComparisonStatus("Loaded");
    } catch (requestError) {
      setComparisonStatus("Error");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Comparison failed.",
      );
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[8px] border border-border bg-surface p-5 shadow-[var(--shadow-soft)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Compare models
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-secondary">
              Pick two or more anchor models. The comparison fills open slots
              with curated recommendations for this task.
            </p>
          </div>
          <div className="rounded-[6px] border border-border bg-soft px-3 py-2 font-mono text-xs uppercase text-muted">
            Comparison
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-[8px] border border-danger/70 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="space-y-3 rounded-[8px] border border-border bg-surface p-4">
        <label className="block space-y-2">
          <span className="font-mono text-sm font-semibold uppercase text-primary">
            Task description
          </span>
          <Textarea
            maxLength={500}
            onChange={(event) => {
              setTask(event.target.value);
              setComparison(null);
            }}
            placeholder="Describe the task you want an LLM to perform..."
            value={task}
          />
        </label>
        <div className="flex flex-col gap-2 font-mono text-xs text-secondary sm:flex-row sm:items-center sm:justify-between">
          <span>{task.length}/500</span>
          {recommendationStatus === "Loading" ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 animate-spin rounded-full border border-accent border-t-transparent" />
              Loading top recommendations...
            </span>
          ) : null}
        </div>
      </div>

      <div
        className="sticky top-20 z-20 flex flex-col gap-2 rounded-[8px] border border-border-strong bg-bg/95 p-3 shadow-[var(--shadow-soft)] backdrop-blur sm:flex-row sm:items-center sm:justify-between"
        data-testid="compare-command-bar"
      >
        <p className="min-w-0 truncate text-sm text-secondary">
          <span className="font-mono text-xs uppercase text-primary">
            Compare
          </span>{" "}
          {selectedModels.length > 0
            ? `${selectedModels.length} selected - ${selectedSummary}`
            : "Choose recommended models to compare."}
        </p>
        <Button
          disabled={!canCompare || selectedModels.length > MAX_MODELS}
          onClick={handleCompare}
        >
          {comparisonStatus === "Loading" ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 animate-spin rounded-full border border-black border-t-transparent" />
              Comparing...
            </span>
          ) : (
            "Compare Models"
          )}
        </Button>
      </div>

      <ModelSelector
        maxModels={MAX_MODELS}
        minModels={MIN_MODELS}
        models={modelOptions}
        onChange={(models) => {
          setSelectedModels(models.slice(0, MAX_MODELS));
          setComparison(null);
        }}
        selectedModels={selectedModels}
      />

      {comparison ? (
        <>
          <div className="rounded-[8px] border border-border bg-surface p-5">
            <div className="grid gap-3 sm:grid-cols-[7rem_minmax(0,1fr)]">
              <p className="font-mono text-xs uppercase text-secondary">
                Your task
              </p>
              <p className="text-base leading-7 text-primary">
                {comparison.taskSummary}
              </p>
            </div>
          </div>

          <DimensionWeights dimensions={comparison.dimensions} />

          <ComparisonTable
            dimensions={comparison.dimensions}
            models={comparison.models}
          />

          <div>
            <h2 className="text-xl font-semibold">Top 5 ranking</h2>
            <p className="mt-1 text-sm text-secondary">
              Your selected models stay in the shortlist; remaining slots are
              filled by the same curated ranking used for normal recommendations.
            </p>
          </div>

          <RankingList recommendations={comparedRecommendations} />
        </>
      ) : null}
    </section>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="text-secondary">Loading comparison...</div>}>
      <ComparePageContent />
    </Suspense>
  );
}
