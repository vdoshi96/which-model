"use client";

import { useMemo, useState } from "react";

import { Input } from "@/components/ui/Input";

interface ModelSelectorProps {
  models: string[];
  selectedModels: string[];
  onChange: (models: string[]) => void;
}

export function ModelSelector({
  models,
  selectedModels,
  onChange,
}: ModelSelectorProps) {
  const [query, setQuery] = useState("");
  const filteredModels = useMemo(
    () =>
      models.filter((model) =>
        model.toLowerCase().includes(query.toLowerCase()),
      ),
    [models, query],
  );

  return (
    <div className="space-y-3">
      <Input
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search models..."
        value={query}
      />
      <div className="grid gap-2 sm:grid-cols-2">
        {filteredModels.map((model) => {
          const checked = selectedModels.includes(model);

          return (
            <label
              className="flex items-center gap-2 border border-border bg-surface p-3 text-sm"
              key={model}
            >
              <input
                checked={checked}
                onChange={() => {
                  onChange(
                    checked
                      ? selectedModels.filter((name) => name !== model)
                      : [...selectedModels, model].slice(0, 5),
                  );
                }}
                type="checkbox"
              />
              <span className="font-mono">{model}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
