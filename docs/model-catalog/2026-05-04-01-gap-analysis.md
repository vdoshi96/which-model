# Model Catalog Gap Analysis

Date: 2026-05-04
Branch: `feature/model-catalog-expansion`

## Current State

The application only discovers models through benchmark refreshes and prior recommendation responses:

- Benchmark refreshes upsert `Model` and `BenchmarkScore` rows from public benchmark adapters.
- `/api/recommend` ranks Prisma models with benchmark scores.
- `/api/compare` only compares requested model names when all names already exist in Prisma.
- The home and compare pages build model selector options from session storage, local storage, URL params, or fresh recommendations.
- There is no standalone `/api/models` endpoint.

This makes the visible website catalog smaller than the market. If benchmark sources miss a provider, use a different model name, omit pricing, or omit context-window data, the website has no durable fallback.

## Requested Gap

The user specifically called out missing Claude, Gemini, Kimi, DeepSeek, Qwen, and Llama models, plus older variants and other popular models people still use.

The implementation must add:

- A curated model catalog with real cost and context-window metadata.
- Official source URLs and verification dates for each curated row.
- A discoverability endpoint for UI selectors.
- Compare support for catalog-only models without inventing benchmark scores.
- Recommendation behavior that remains benchmark-first and does not present catalog-only models as benchmark-ranked winners.
- At least 70 selectable catalog models after including older variants, hosted open-weight variants, and thinking/reasoning modes.

## Product Decision

The curated catalog is metadata, not a benchmark source. It may supply model names, providers, context windows, and input/output prices. It must not fabricate quality, reasoning, coding, speed, or cost-efficiency benchmark scores.

Catalog-only models can be selected and compared; their dimension scores should render as missing data and their weighted score should be `0` until benchmark data exists.

## Implementation Gaps

1. Add a static typed model catalog with at least 70 rows.
2. Add source-backed lookup and merge helpers.
3. Enrich benchmark-ingested models with curated cost/context when names or aliases match.
4. Add `/api/models` to return benchmark-backed and catalog-only models.
5. Load `/api/models` in the home compare selector and compare page.
6. Allow `/api/compare` to resolve catalog-only selected models while still 404ing truly unknown models.
7. Preserve source-provided non-null benchmark metadata instead of clobbering it with static catalog values.
8. Resolve alias-backed DB benchmark rows when users compare a catalog display name.
9. Document QA results before merging back to `main`.

## Verification Baseline

Before edits on `feature/model-catalog-expansion`:

```bash
corepack pnpm test --runInBand
```

Result: 15 test suites passed, 49 tests passed.
