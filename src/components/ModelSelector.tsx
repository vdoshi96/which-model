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
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
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

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {filteredModels.length > 0 ? (
          filteredModels.map((model) => {
            const checked = selectedModels.includes(model);
            const disabled = !checked && atMaximum;

            return (
              <label
                className={cn(
                  "flex min-h-14 items-center gap-3 border border-border bg-surface p-3 text-sm transition",
                  disabled
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer hover:border-secondary",
                  checked && "border-accent",
                )}
                key={model}
              >
                <input
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggleModel(model)}
                  type="checkbox"
                />
                <span className="break-words font-mono leading-5">{model}</span>
              </label>
            );
          })
        ) : (
          <div className="border border-border bg-surface p-4 text-sm text-secondary">
            No matching models found.
          </div>
        )}
      </div>
    </div>
  );
}
