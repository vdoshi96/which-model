"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ModelSelector } from "@/components/ModelSelector";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import {
  defaultRecommendationPreferences,
  type RecommendationPreferences,
} from "@/lib/recommendation/preferences";
import { parseRecommendationModelNames } from "@/lib/recommendationCache";
import type { ApiError, ModelsResponse, RecommendResponse } from "@/types/api";

const MAX_TASK_LENGTH = 500;
const RECOMMENDATION_STORAGE_KEY = "which-model:last-recommendation";
const COMPARE_TASK_STORAGE_KEY = "which-model:compare-task";
const COMPARE_RECOMMENDATIONS_STORAGE_KEY = "which-model:compare-recommendations";

const PREFERENCE_CONTROLS: Array<{
  key: keyof Pick<
    RecommendationPreferences,
    | "costSensitive"
    | "preferFrontier"
    | "needsLongContext"
    | "latencySensitive"
    | "localOnly"
  >;
  label: string;
}> = [
  { key: "costSensitive", label: "Cost conscious" },
  { key: "preferFrontier", label: "Prefer frontier models" },
  { key: "needsLongContext", label: "Need long context" },
  { key: "latencySensitive", label: "Low latency" },
  { key: "localOnly", label: "Local-only" },
];

function readStoredModelNames() {
  if (typeof window === "undefined") {
    return [];
  }

  const sessionNames = parseRecommendationModelNames(
    window.sessionStorage.getItem(RECOMMENDATION_STORAGE_KEY),
  );

  if (sessionNames.length > 0) {
    return sessionNames;
  }

  return parseRecommendationModelNames(
    window.localStorage.getItem(COMPARE_RECOMMENDATIONS_STORAGE_KEY),
  );
}

function uniqueModelNames(names: string[]) {
  return Array.from(new Set(names.filter(Boolean)));
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

export function TaskInput() {
  const router = useRouter();
  const [task, setTask] = useState("");
  const [error, setError] = useState("");
  const [apiError, setApiError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [compareSpecific, setCompareSpecific] = useState(false);
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<RecommendationPreferences>(
    defaultRecommendationPreferences,
  );

  function updatePreference(
    key: keyof RecommendationPreferences,
    checked: boolean,
  ) {
    setPreferences((currentPreferences) => ({
      ...currentPreferences,
      [key]: checked,
    }));
  }

  async function loadModelOptions() {
    const storedModelNames = readStoredModelNames();

    setModelOptions(storedModelNames);

    try {
      const catalogModelNames = await fetchCatalogModelNames();
      setModelOptions(uniqueModelNames([...storedModelNames, ...catalogModelNames]));
    } catch {
      setModelOptions(storedModelNames);
    }
  }

  async function handleSubmit() {
    const trimmedTask = task.trim();

    if (!trimmedTask) {
      setError("Describe the task first.");
      return;
    }

    if (compareSpecific && selectedModels.length >= 2) {
      window.localStorage.setItem(COMPARE_TASK_STORAGE_KEY, trimmedTask);
      window.localStorage.setItem(
        COMPARE_RECOMMENDATIONS_STORAGE_KEY,
        JSON.stringify(selectedModels),
      );
      const params = new URLSearchParams({
        models: selectedModels.join(","),
        task: trimmedTask,
      });
      router.push(`/compare?${params.toString()}`);
      return;
    }

    setApiError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/recommend", {
        body: JSON.stringify({ task: trimmedTask, preferences }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as RecommendResponse | ApiError;

      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload, "Could not analyze that task. Try again."),
        );
      }

      window.sessionStorage.setItem(
        RECOMMENDATION_STORAGE_KEY,
        JSON.stringify(payload),
      );
      window.localStorage.setItem(COMPARE_TASK_STORAGE_KEY, trimmedTask);
      window.localStorage.setItem(
        COMPARE_RECOMMENDATIONS_STORAGE_KEY,
        JSON.stringify(
          (payload as RecommendResponse).recommendations.map(
            (recommendation) => recommendation.model.name,
          ),
        ),
      );

      const params = new URLSearchParams({ task: trimmedTask });
      router.push(`/results?${params.toString()}`);
    } catch (requestError) {
      setApiError(
        requestError instanceof Error
          ? requestError.message
          : "Could not analyze that task. Try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {apiError ? (
        <div className="border border-danger bg-surface p-3 text-sm text-danger">
          {apiError}
        </div>
      ) : null}
      <Textarea
        aria-describedby="task-counter"
        maxLength={MAX_TASK_LENGTH}
        onChange={(event) => {
          setTask(event.target.value);
          setError("");
          setApiError("");
        }}
        placeholder="Describe what you need an LLM to do..."
        value={task}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-mono text-xs text-secondary" id="task-counter">
          {task.length}/{MAX_TASK_LENGTH}
        </span>
        <Button disabled={isLoading} onClick={handleSubmit}>
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 animate-spin border border-black border-t-transparent" />
              Analyzing your task...
            </span>
          ) : (
            compareSpecific ? "Compare Selected Models" : "Find Best Models"
          )}
        </Button>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="border-t border-border pt-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {PREFERENCE_CONTROLS.map((control) => (
            <label
              className="flex min-h-10 cursor-pointer items-center gap-2 border border-border bg-surface px-3 py-2 text-sm text-secondary"
              key={control.key}
            >
              <input
                checked={Boolean(preferences[control.key])}
                onChange={(event) =>
                  updatePreference(control.key, event.target.checked)
                }
                type="checkbox"
              />
              <span>{control.label}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="border-t border-border pt-4">
        <label className="flex cursor-pointer items-center gap-3 text-sm text-secondary">
          <input
            checked={compareSpecific}
            onChange={(event) => {
              const checked = event.target.checked;

              setCompareSpecific(checked);
              if (checked && modelOptions.length === 0) {
                void loadModelOptions();
              }
            }}
            type="checkbox"
          />
          <span>Compare specific models</span>
        </label>
        {compareSpecific ? (
          <div className="mt-4">
            {modelOptions.length > 0 ? (
              <ModelSelector
                models={modelOptions}
                onChange={setSelectedModels}
                selectedModels={selectedModels}
              />
            ) : (
              <div className="border border-border bg-surface p-4 text-sm text-secondary">
                Run a recommendation once to populate model choices, then return
                here to select specific models.
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
