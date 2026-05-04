"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { ComparisonTable } from "@/components/ComparisonTable";
import { ModelSelector } from "@/components/ModelSelector";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import type {
  ApiError,
  CompareResponse,
  RecommendResponse,
} from "@/types/api";

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
    const initialSelection = uniqueModelNames([
      ...selectedFromUrl,
      ...storedRecommendations.slice(0, MAX_MODELS),
    ]).slice(0, MAX_MODELS);

    setTask(initialTask);
    setModelOptions(uniqueModelNames([...storedRecommendations, ...initialSelection]));
    setSelectedModels(initialSelection);
  }, [taskFromUrl, searchParams]);

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
        setSelectedModels(recommendedNames);
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
      <div className="space-y-2">
        <h1 className="font-mono text-3xl font-semibold">Compare Models</h1>
        <p className="mt-2 text-secondary">
          Select two to five models for a task-specific comparison.
        </p>
      </div>

      <div className="space-y-3">
        <label className="block space-y-2">
          <span className="font-mono text-sm text-secondary">
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
            <span>Loading top recommendations...</span>
          ) : null}
        </div>
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-secondary">
          {selectedModels.length > 0
            ? `Selected: ${selectedSummary}`
            : "Choose recommended models to compare."}
        </p>
        <Button
          disabled={!canCompare || selectedModels.length > MAX_MODELS}
          onClick={handleCompare}
        >
          {comparisonStatus === "Loading" ? "Comparing..." : "Compare Models"}
        </Button>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <ComparisonTable
        dimensions={comparison?.dimensions}
        models={comparison?.models ?? []}
      />
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
