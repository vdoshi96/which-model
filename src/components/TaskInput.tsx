"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { CatalogScopeSelector } from "@/components/CatalogScopeSelector";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import {
  defaultRecommendationPreferences,
  type RecommendationPreferences,
} from "@/lib/recommendation/preferences";
import { serializeRecommendationCache } from "@/lib/recommendationCache";
import type {
  ApiError,
  ModelCatalogItem,
  ModelProviderGroup,
  ModelsResponse,
  RecommendResponse,
} from "@/types/api";

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

const checkboxClassName =
  "h-4 w-4 rounded border-border bg-soft accent-accent focus:ring-0";

async function fetchCatalog() {
  const response = await fetch("/api/models");

  if (!response.ok) {
    throw new Error("Could not load model catalog.");
  }

  const payload = (await response.json()) as ModelsResponse;
  const models = payload.models.map((model) => ({
    ...model,
    id: model.id ?? model.name,
  }));

  return {
    models,
    providers: payload.providers ?? buildProviderGroups(models),
  };
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
  const [catalogError, setCatalogError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [modelOptions, setModelOptions] = useState<ModelCatalogItem[]>([]);
  const [providerOptions, setProviderOptions] = useState<ModelProviderGroup[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<RecommendationPreferences>(
    defaultRecommendationPreferences,
  );

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      try {
        const catalog = await fetchCatalog();

        if (cancelled) {
          return;
        }

        setModelOptions(catalog.models);
        setProviderOptions(catalog.providers);
      } catch (requestError) {
        if (!cancelled) {
          setCatalogError(
            requestError instanceof Error
              ? requestError.message
              : "Could not load model catalog.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsCatalogLoading(false);
        }
      }
    }

    void loadCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  function updatePreference(
    key: keyof RecommendationPreferences,
    checked: boolean,
  ) {
    setPreferences((currentPreferences) => ({
      ...currentPreferences,
      [key]: checked,
    }));
  }

  async function handleSubmit() {
    const trimmedTask = task.trim();

    if (selectedProviders.length === 0 && selectedModels.length === 0) {
      setError("Pick at least one provider or model first.");
      return;
    }

    if (!trimmedTask) {
      setError("Describe the task first.");
      return;
    }

    setApiError("");
    setIsLoading(true);

    try {
      const scopedPreferences = {
        ...preferences,
        preferredProviders: selectedProviders,
        preferredModels: selectedModels,
      };
      const response = await fetch("/api/recommend", {
        body: JSON.stringify({ task: trimmedTask, preferences: scopedPreferences }),
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
        serializeRecommendationCache(trimmedTask, payload as RecommendResponse),
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
    <div className="min-w-0 rounded-[8px] border border-border-strong bg-surface p-4 shadow-[var(--shadow-soft)] sm:p-5">
      {apiError ? (
        <div className="mb-4 rounded-[6px] border border-danger/70 bg-danger/10 p-3 text-sm text-danger">
          {apiError}
        </div>
      ) : null}
      <div className="space-y-3">
        <p className="font-mono text-sm font-semibold uppercase text-primary">
          1. Pick providers or models
        </p>
        {catalogError ? (
          <div className="rounded-[6px] border border-warning/70 bg-warning/10 p-3 text-sm text-warning">
            {catalogError}
          </div>
        ) : null}
        <CatalogScopeSelector
          isLoading={isCatalogLoading}
          models={modelOptions}
          onModelsChange={(models) => {
            setSelectedModels(models);
            setError("");
          }}
          onProvidersChange={(providers) => {
            setSelectedProviders(providers);
            setError("");
          }}
          providers={providerOptions}
          selectedModels={selectedModels}
          selectedProviders={selectedProviders}
        />
      </div>

      <div className="mt-5 space-y-3 border-t border-border pt-5">
        <div className="flex items-center justify-between gap-3">
          <label
            className="font-mono text-sm font-semibold uppercase text-primary"
            htmlFor="task-input"
          >
            2. Describe your task
          </label>
          <span className="font-mono text-xs text-muted" id="task-counter">
            {task.length}/{MAX_TASK_LENGTH}
          </span>
        </div>
        <Textarea
          aria-describedby="task-counter"
          id="task-input"
          maxLength={MAX_TASK_LENGTH}
          onChange={(event) => {
            setTask(event.target.value);
            setError("");
            setApiError("");
          }}
          placeholder="Describe what you need an LLM to do..."
          value={task}
        />
      </div>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      <div className="mt-5 border-t border-border pt-5">
        <p className="font-mono text-sm font-semibold uppercase text-primary">
          3. Preferences
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {PREFERENCE_CONTROLS.map((control) => (
            <label
              className="flex min-h-10 cursor-pointer items-center gap-2 rounded-[6px] border border-border bg-soft px-3 py-2 text-sm text-secondary transition hover:border-border-strong hover:bg-raised"
              key={control.key}
            >
              <input
                checked={Boolean(preferences[control.key])}
                className={checkboxClassName}
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

      <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-secondary">
          The three picks are limited to the providers and models selected above.
        </p>
        <Button className="w-full sm:w-auto" disabled={isLoading} onClick={handleSubmit}>
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 animate-spin rounded-full border border-black border-t-transparent" />
              Analyzing your task...
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              Analyze Selected Models
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
          )}
        </Button>
      </div>
    </div>
  );
}

function buildProviderGroups(models: ModelCatalogItem[]) {
  return Array.from(
    models.reduce((groups, model) => {
      const current = groups.get(model.provider) ?? {
        name: model.provider,
        modelCount: 0,
        benchmarkedCount: 0,
      };

      current.modelCount += 1;
      current.benchmarkedCount += model.hasBenchmarks ? 1 : 0;
      groups.set(model.provider, current);

      return groups;
    }, new Map<string, ModelProviderGroup>()),
  )
    .map(([, provider]) => provider)
    .sort((left, right) => left.name.localeCompare(right.name));
}
