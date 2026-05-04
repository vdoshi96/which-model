# Model Catalog Expansion Design

**Goal:** Expand which-model's visible model coverage with a source-backed curated catalog while preserving benchmark-based recommendations.

**Architecture:** Add a typed static catalog that stores provider, context-window, and pricing metadata with source URLs and verification dates. The benchmark refresh pipeline can use the catalog to canonicalize names/providers and fill missing metadata, while preserving non-null source-provided cost/context values. A new `/api/models` endpoint makes catalog and DB models discoverable to the UI. Recommendation ranking remains benchmark-first; catalog-only models do not receive synthetic benchmark scores.

**Tech Stack:** Next.js App Router, TypeScript, Prisma, Jest, React Testing Library.

## Design

### Catalog Data

Create `src/lib/modelCatalog.ts` with:

- `CURATED_MODEL_CATALOG`: readonly model records.
- `listCatalogModels()`: returns sorted catalog records.
- `findCatalogModel(name)`: matches by display name or alias.
- `applyCatalogMetadata(record)`: merges catalog metadata into benchmark records without mutating input.
- `mergeCatalogWithDbModels(dbModels)`: returns a model list containing DB-backed records plus catalog-only records.

The catalog must contain at least 70 rows and include provider-exposed thinking/reasoning variants such as DeepSeek Reasoner, Qwen thinking mode, and OpenAI reasoning rows.

Catalog records include:

- `name`
- `provider`
- `apiId`
- `aliases`
- `contextWindow`
- `costInputPer1M`
- `costOutputPer1M`
- `status`
- `notes`
- `sourceUrls`
- `lastVerified`

### API

Add `GET /api/models`.

Response:

```json
{
  "models": [
    {
      "name": "Claude Sonnet 4.6",
      "provider": "Anthropic",
      "contextWindow": 1000000,
      "costInputPer1M": 3,
      "costOutputPer1M": 15,
      "hasBenchmarks": false,
      "status": "active"
    }
  ]
}
```

The endpoint does not call DeepSeek and does not rate limit because it only exposes public catalog metadata already visible in the UI.

### Recommendation Behavior

`/api/recommend` should continue to rank only models that have usable benchmark scores. Catalog metadata can enrich DB-backed models, but catalog-only models should not appear in recommendations with a fake zero score when enough benchmark-backed candidates exist.

### Compare Behavior

`/api/compare` should resolve each requested model from Prisma first, then from the catalog. If a requested model exists only in the catalog, it should return null dimension scores and `weightedScore: 0`. If a requested model exists in neither place, return the existing 404.

If Prisma has benchmark rows stored under a catalog alias or API id, comparing the catalog display name should use those benchmark scores rather than falling back to catalog-only zeros.

### UI Behavior

Home:

- When "Compare specific models" is opened, load `/api/models`.
- Merge fetched catalog names with stored recommendation names.
- If fetching fails, fall back to stored names and keep the existing guidance.

Compare page:

- Load `/api/models` on mount.
- Merge catalog names with URL, storage, and recommendation names.
- Continue preselecting top recommendations for the task when recommendation data loads.

### Data Integrity

- Every curated row must have source URLs and `lastVerified: "2026-05-04"`.
- Prices are standard USD per 1M input/output tokens.
- Tiered pricing uses the lowest standard tier in numeric fields, with tiering explained in `notes`.
- Open-weight models with host-specific API pricing include the host in the model name.
- Benchmark source values for non-null context and pricing are treated as fresher than static catalog values during ingestion.

## Testing

Add failing tests before implementation:

- Catalog lookup and metadata merge.
- Benchmark upsert uses catalog metadata.
- `/api/models` returns catalog and DB-backed models.
- `/api/recommend` filters catalog-only zero-score models.
- `/api/compare` can compare a catalog-only model and still rejects unknown names.
- `/api/compare` preserves alias-backed benchmark scores.
- Home compare selector can render fetched catalog options without a prior recommendation.
- Catalog tests enforce at least 70 models and specific thinking/reasoning variants.

## Branch and Merge

Work happens on `feature/model-catalog-expansion`. After tests and typecheck pass, merge the feature branch into `main` locally.
