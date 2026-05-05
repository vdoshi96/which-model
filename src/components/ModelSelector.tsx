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
    <div className="space-y-4 border border-border bg-surface p-4" data-testid="model-selector">
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
        <div className="font-mono text-xs text-secondary">
          {selectedModels.length} of {maxModels} selected
        </div>
      </div>

      <div
        className="flex min-h-11 flex-wrap items-center gap-2 border border-border bg-bg p-2"
        data-testid="selected-models-strip"
      >
        {selectedModels.length > 0 ? (
          selectedModels.map((model) => (
            <button
              className="inline-flex max-w-full items-center gap-2 border border-accent/70 bg-surface px-2.5 py-1.5 text-left font-mono text-xs text-primary transition hover:border-accent"
              key={model}
              onClick={() => toggleModel(model)}
              type="button"
            >
              <span className="truncate">{model}</span>
              <span aria-hidden="true" className="text-accent">
                x
              </span>
              <span className="sr-only">Remove {model}</span>
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

      <div
        className="max-h-80 overflow-y-auto border border-border bg-bg"
        data-testid="model-options-list"
      >
        {filteredModels.length > 0 ? (
          filteredModels.map((model) => {
            const checked = selectedModels.includes(model);
            const disabled = !checked && atMaximum;

            return (
              <label
                className={cn(
                  "flex min-h-12 items-center gap-3 border-b border-border px-3 py-2 text-sm transition last:border-b-0",
                  disabled
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer hover:bg-surface",
                  checked && "bg-surface text-accent",
                )}
                key={model}
              >
                <input
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggleModel(model)}
                  type="checkbox"
                />
                <span className="min-w-0 flex-1 break-words font-mono leading-5">
                  {model}
                </span>
              </label>
            );
          })
        ) : (
          <div className="p-4 text-sm text-secondary">
            No matching models found.
          </div>
        )}
      </div>
    </div>
  );
}
