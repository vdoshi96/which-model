import benchmarkDefinitions from "@/data/curated/benchmark-definitions.json";
import models from "@/data/curated/models.json";
import scores from "@/data/curated/scores.json";

import { curatedCatalogSchema, type CuratedCatalog } from "./schema";
import { validateCuratedCatalog } from "./validateCatalog";

export function loadCuratedCatalog(): CuratedCatalog {
  const parsed = curatedCatalogSchema.parse({
    benchmarks: benchmarkDefinitions,
    models,
    scores,
  });
  const validation = validateCuratedCatalog(parsed);

  if (!validation.ok) {
    throw new Error(validation.errors.join("\n"));
  }

  return parsed;
}

export { validateCuratedCatalog };
