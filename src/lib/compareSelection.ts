export const DEFAULT_MAX_COMPARE_MODELS = 5;

function uniqueModelNames(names: string[]) {
  return Array.from(new Set(names.filter(Boolean)));
}

export function buildInitialCompareSelection({
  maxModels = DEFAULT_MAX_COMPARE_MODELS,
  selectedFromUrl,
  storedRecommendations,
}: {
  maxModels?: number;
  selectedFromUrl: string[];
  storedRecommendations: string[];
}) {
  const explicitSelection = uniqueModelNames(selectedFromUrl);

  if (explicitSelection.length > 0) {
    return explicitSelection.slice(0, maxModels);
  }

  return uniqueModelNames(storedRecommendations).slice(0, maxModels);
}

export function mergeSelectedWithRecommendations({
  maxModels = DEFAULT_MAX_COMPARE_MODELS,
  recommendedNames,
  selectedModels,
}: {
  maxModels?: number;
  recommendedNames: string[];
  selectedModels: string[];
}) {
  return uniqueModelNames([...selectedModels, ...recommendedNames]).slice(
    0,
    maxModels,
  );
}
