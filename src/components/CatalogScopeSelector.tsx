"use client";

import { useMemo, useState } from "react";

import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/ui";
import type { ModelCatalogItem, ModelProviderGroup } from "@/types/api";

interface CatalogScopeSelectorProps {
  models: ModelCatalogItem[];
  providers: ModelProviderGroup[];
  selectedModels: string[];
  selectedProviders: string[];
  onModelsChange: (models: string[]) => void;
  onProvidersChange: (providers: string[]) => void;
  isLoading?: boolean;
}

const PRIMARY_PROVIDER_ORDER = [
  "OpenAI",
  "Anthropic",
  "Google",
  "DeepSeek",
  "xAI",
  "Moonshot AI",
  "Alibaba Cloud",
  "Mistral AI",
  "Cohere",
  "Meta",
];
const DEFAULT_PROVIDER_LIMIT = 12;

export function CatalogScopeSelector({
  isLoading = false,
  models,
  onModelsChange,
  onProvidersChange,
  providers,
  selectedModels,
  selectedProviders,
}: CatalogScopeSelectorProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const selectedModelSet = new Set(selectedModels);
  const selectedProviderSet = new Set(selectedProviders);
  const filteredProviders = useMemo(
    () => {
      if (normalizedQuery) {
        return providers.filter((provider) =>
          provider.name.toLowerCase().includes(normalizedQuery),
        );
      }

      const selected = providers.filter((provider) =>
        selectedProviderSet.has(provider.name),
      );
      const visible = providers
        .filter((provider) => !selectedProviderSet.has(provider.name))
        .sort(compareProviderGroups)
        .slice(0, DEFAULT_PROVIDER_LIMIT);

      return [...selected, ...visible].sort(compareProviderGroups);
    },
    [normalizedQuery, providers, selectedProviders],
  );
  const filteredModels = useMemo(
    () =>
      models.filter((model) => {
        if (!normalizedQuery) {
          return true;
        }

        return [model.name, model.provider, model.effortLevel ?? ""].some((value) =>
          value.toLowerCase().includes(normalizedQuery),
        );
      }),
    [models, normalizedQuery],
  );

  function toggleProvider(providerName: string) {
    if (selectedProviderSet.has(providerName)) {
      onProvidersChange(
        selectedProviders.filter((provider) => provider !== providerName),
      );
      return;
    }

    onProvidersChange([...selectedProviders, providerName]);
  }

  function toggleModel(modelId: string) {
    if (selectedModelSet.has(modelId)) {
      onModelsChange(selectedModels.filter((model) => model !== modelId));
      return;
    }

    onModelsChange([...selectedModels, modelId]);
  }

  return (
    <div className="space-y-3" data-testid="catalog-scope-selector">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="block flex-1 space-y-1">
          <span className="font-mono text-xs uppercase text-secondary">
            Search models and providers
          </span>
          <Input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search OpenAI, DeepSeek, Claude, GPT..."
            value={query}
          />
        </label>
        <div className="rounded-[5px] border border-border bg-soft px-2.5 py-2 font-mono text-xs text-secondary">
          <span>
            {selectedProviders.length} provider{" "}
            {selectedProviders.length === 1 ? "group" : "groups"}
          </span>
          <span className="mx-1 text-muted">/</span>
          <span>
            {selectedModels.length}{" "}
            {selectedModels.length === 1 ? "model" : "models"}
          </span>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {filteredProviders.map((provider) => {
          const checked = selectedProviderSet.has(provider.name);

          return (
            <label
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-2 rounded-[6px] border px-3 py-2 text-sm transition",
                checked
                  ? "border-accent bg-accent/10 text-primary"
                  : "border-border bg-soft text-secondary hover:border-border-strong hover:bg-raised",
              )}
              key={provider.name}
            >
              <input
                aria-label={`All ${provider.name} models`}
                checked={checked}
                className="h-4 w-4 accent-accent"
                onChange={() => toggleProvider(provider.name)}
                type="checkbox"
              />
              <span className="min-w-0 flex-1 truncate">
                All {provider.name} models
              </span>
              <span className="font-mono text-[11px] text-muted">
                {provider.modelCount}
              </span>
            </label>
          );
        })}
      </div>

      <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-[6px] border border-border bg-soft">
        {isLoading ? (
          <li className="flex min-h-16 items-center gap-2 p-4 text-sm text-secondary">
            <span className="h-3 w-3 animate-spin rounded-full border border-accent border-t-transparent" />
            Loading model catalog...
          </li>
        ) : null}
        {!isLoading && filteredModels.length === 0 ? (
          <li className="p-4 text-sm text-secondary">No matching models found.</li>
        ) : null}
        {!isLoading
          ? filteredModels.map((model) => {
              const checked = selectedModelSet.has(model.id);
              const coveredByProvider = selectedProviderSet.has(model.provider);

              return (
                <li key={model.id}>
                  <label
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center gap-2 px-3 py-2 text-sm transition hover:bg-raised",
                      checked && "bg-accent/10 text-accent",
                    )}
                  >
                    <input
                      aria-label={model.name}
                      checked={checked}
                      className="h-4 w-4 accent-accent"
                      onChange={() => toggleModel(model.id)}
                      type="checkbox"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono leading-5">
                        {model.name}
                      </span>
                      <span className="block truncate text-xs text-secondary">
                        {model.provider}
                        {model.effortLevel ? ` / ${model.effortLevel}` : ""}
                      </span>
                    </span>
                    {coveredByProvider ? (
                      <span className="font-mono text-[11px] uppercase text-muted">
                        Provider
                      </span>
                    ) : null}
                  </label>
                </li>
              );
            })
          : null}
      </ul>
    </div>
  );
}

function compareProviderGroups(
  left: ModelProviderGroup,
  right: ModelProviderGroup,
) {
  const leftPriority = providerPriority(left.name);
  const rightPriority = providerPriority(right.name);

  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  const countDifference = right.modelCount - left.modelCount;

  if (countDifference !== 0) {
    return countDifference;
  }

  return left.name.localeCompare(right.name);
}

function providerPriority(name: string) {
  if (name.trim().toLowerCase() === "unknown") {
    return PRIMARY_PROVIDER_ORDER.length + 100;
  }

  const index = PRIMARY_PROVIDER_ORDER.findIndex(
    (provider) => provider.toLowerCase() === name.toLowerCase(),
  );

  return index === -1 ? PRIMARY_PROVIDER_ORDER.length : index;
}
