# Sources

## Artificial Analysis Models

- URL: https://artificialanalysis.ai/models
- Accessed: 2026-05-13
- Notes: comparison surface organizes models across intelligence, speed, latency, price, context window, cost-to-run evaluations, and provider filters. Reasoning/effort variants are represented as separate comparable model rows when available.

## Artificial Analysis API Reference

- URL: https://artificialanalysis.ai/api-reference
- Accessed: 2026-05-13
- Notes: free API requires an `x-api-key` header, attribution, server-side caching, and has a documented 1,000 requests/day limit. LLM endpoint returns stable model IDs, names/slugs, provider metadata, evaluations, pricing, output speed, and latency.

## Existing Curated Catalog

- Paths: `src/data/curated/models.json`, `benchmark-definitions.json`, `scores.json`, `sources.json`
- Notes: baseline model metadata, priors, and source registry used when refreshed DB data is missing.
