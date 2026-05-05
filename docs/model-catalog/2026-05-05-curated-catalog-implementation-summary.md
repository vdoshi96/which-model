# Curated Catalog Implementation Summary

Date: 2026-05-05

## Outcome

`which-model` now ranks and compares models from a versioned curated catalog instead of treating sparse live benchmark rows as the source of truth. DeepSeek still interprets the user's natural-language task and preference checklist, but the final shortlist is deterministic, reproducible, and explainable from repository data.

## Major Changes

- Reworked the landing experience and baseline flows so the app no longer opens to a stale or broken first screen.
- Fixed password Enter-submit on sign-in.
- Added a curated data foundation under `src/data/curated/`:
  - `models.json`
  - `benchmark-definitions.json`
  - `scores.json`
- Added Zod schema validation and catalog loading utilities under `src/lib/curatedCatalog/`.
- Added recommendation preferences for cost sensitivity, frontier preference, long context, low latency, local-only, preferred providers, preferred models, and infrastructure filters.
- Replaced recommendation ranking with `rankCuratedModels()`, a deterministic curated-catalog scoring engine.
- Updated compare to use the same curated model evidence and to reject non-curated DB-only artifacts.
- Changed `/api/models` to return curated catalog models only, so the selector cannot expose options that compare cannot score.
- Added model-card and compare-table transparency:
  - evidence count
  - top benchmark badges
  - top scoring contributions
  - provenance summaries
  - missing and unavailable evidence notes
  - cost and context metadata
- Made compare selection cleaner:
  - compact selected-model chips
  - dense searchable option list
  - sticky command bar with the compare action above the selector
  - URL-selected models are preserved, then open slots are filled with task-fit recommendations
- Disabled the automatic live benchmark cron refresh with an explicit `410 Gone`.
- Added a manual Browser Use driven refresh runbook and QA checklist.

## Ranking Behavior

- Cost affects ranking only when cost sensitivity is requested.
- Long-context, local-only, provider, model, and infrastructure preferences filter or bias the candidate set before final ranking.
- Sparse one-row benchmark artifacts no longer outrank frontier models for broad creative tasks.
- Missing evidence is surfaced instead of silently becoming a zero.
- Editorial priors and derived metadata are labeled as such; they are not presented as measured benchmark claims.

## Data Refresh Policy

Refreshes are manual editorial events. A refresh PR must document:

- source URLs
- visible source facts
- accessed dates
- benchmark meanings and limitations
- pricing/context caveats
- validation commands
- Browser Use verification paths

The old `/api/cron/refresh-benchmarks` route now preserves unauthorized `401` behavior, but authorized requests return:

```json
{
  "ok": false,
  "error": "Automatic benchmark refresh is disabled. Use the manual curated catalog refresh runbook."
}
```

## Browser Use Verification

Verified in the in-app browser against `http://localhost:3100`:

- `/`
- `/results?task=write+a+song`
- `/results?task=build+a+coding+agent`
- `/compare?models=GPT-5.5%2CClaude+Opus+4.7&task=write+a+song`

Final browser checks confirmed:

- no runtime error overlay
- no console errors on verified paths
- song-writing recommendations include frontier models
- coding-agent recommendations show scoring signals and top contributions
- compare keeps selected models in a sticky command bar above the selector
- compare options come from the curated catalog only
- compare output shows weighted scores, cost/context, and evidence gaps

## Validation

Final integrated branch validation:

```bash
corepack pnpm jest --runInBand
corepack pnpm typecheck
corepack pnpm build
```

Results:

- Jest: 24 suites passed, 120 tests passed.
- TypeScript: passed.
- Production build: passed.
- Known residual warning: `jose` reports `CompressionStream` and `DecompressionStream` as unsupported in the Edge Runtime through the NextAuth import path. This warning existed during the work and does not fail the build.

## Local Merge Order

The verified local `main` was fast-forwarded through:

1. `feature/curated-catalog-00-baseline`
2. `feature/curated-catalog-01-data-foundation`
3. `feature/curated-catalog-02-intent-preferences`
4. `feature/curated-catalog-03-ranking-engine`
5. `feature/curated-catalog-04-results-transparency`
6. `feature/curated-catalog-05-manual-refresh`
7. `fix/curated-catalog-final-qa`

The final GitHub push should leave local `main` and `origin/main` on the same commit.
