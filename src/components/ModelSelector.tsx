"use client";

import { useMemo, useState } from "react";

import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/ui";

interface ModelSelectorProps {
  models: string[];
  selectedModels: string[];
  onChange: (models: string[]) => void;
  maxModels?: number;
  minModels?: number;
}

export function ModelSelector({
  maxModels = 5,
  minModels = 2,
  models,
  selectedModels,
  onChange,
}: ModelSelectorProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const modelOptions = useMemo(
    () => Array.from(new Set([...selectedModels, ...models])).sort(),
    [models, selectedModels],
  );
  const filteredModels = useMemo(
    () =>
      modelOptions.filter((model) =>
        model.toLowerCase().includes(normalizedQuery),
      ),
    [modelOptions, normalizedQuery],
  );
  const hasMinimum = selectedModels.length >= minModels;
  const atMaximum = selectedModels.length >= maxModels;

  function toggleModel(model: string) {
    const selected = selectedModels.includes(model);

    if (selected) {
      onChange(selectedModels.filter((name) => name !== model));
      return;
    }

    if (!atMaximum) {
      onChange([...selectedModels, model]);
    }
  }

  return (
    <div
      className="space-y-3 rounded-[8px] border border-border bg-surface p-3 sm:p-4"
      data-testid="model-selector"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="block flex-1 space-y-1">
          <span className="font-mono text-xs uppercase text-secondary">
            Search models
          </span>
          <Input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by model name..."
            value={query}
          />
        </label>
        <div className="rounded-[5px] border border-border bg-soft px-2.5 py-2 font-mono text-xs text-secondary">
          {selectedModels.length} of {maxModels} selected
        </div>
      </div>

      <div
        className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-[6px] border border-border bg-soft p-1.5"
        data-testid="selected-models-strip"
      >
        {selectedModels.length > 0 ? (
          selectedModels.map((model) => (
            <button
              aria-label={`Remove ${model}`}
              className="inline-flex h-7 max-w-48 items-center gap-1.5 truncate rounded-[5px] border border-accent/70 bg-accent/10 px-2 text-left font-mono text-xs text-primary transition hover:border-accent focus:border-accent focus:outline-none"
              data-testid="selected-model-chip"
              key={model}
              onClick={() => toggleModel(model)}
              type="button"
            >
              <span className="min-w-0 truncate">{model}</span>
              <span aria-hidden="true" className="text-accent">
                x
              </span>
            </button>
          ))
        ) : (
          <span className="px-1 font-mono text-xs text-secondary">
            No models selected
          </span>
        )}
      </div>

      {!hasMinimum ? (
        <p className="text-sm text-warning">
          Select at least {minModels} models to compare.
        </p>
      ) : null}
      {atMaximum ? (
        <p className="text-sm text-secondary">
          Maximum reached. Remove a model to pick another.
        </p>
      ) : null}

      <ul
        className="max-h-72 divide-y divide-border overflow-y-auto rounded-[6px] border border-border bg-soft"
        data-testid="model-options-list"
      >
        {filteredModels.length > 0 ? (
          filteredModels.map((model) => {
            const checked = selectedModels.includes(model);
            const disabled = !checked && atMaximum;

            return (
              <li key={model}>
                <label
                  className={cn(
                    "flex min-h-10 items-center gap-2 px-3 py-1.5 text-sm transition",
                    disabled
                      ? "cursor-not-allowed opacity-50"
                      : "cursor-pointer hover:bg-raised",
                    checked && "bg-accent/10 text-accent",
                  )}
                >
                  <input
                    aria-checked={checked}
                    aria-label={model}
                    checked={checked}
                    className="h-4 w-4 accent-accent"
                    disabled={disabled}
                    onChange={() => toggleModel(model)}
                    type="checkbox"
                  />
                  <span className="min-w-0 flex-1 truncate font-mono leading-5">
                    {model}
                  </span>
                  {checked ? (
                    <span className="font-mono text-[11px] uppercase text-accent">
                      Selected
                    </span>
                  ) : null}
                </label>
              </li>
            );
          })
        ) : (
          <li className="p-4 text-sm text-secondary">
            No matching models found.
          </li>
        )}
      </ul>
    </div>
  );
}
