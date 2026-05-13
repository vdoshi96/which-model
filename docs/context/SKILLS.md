# Project Workflows

## Recommendation Changes

1. Add or update focused unit/integration tests first.
2. Keep ranking deterministic and source-visible.
3. Verify selected provider/model scope behavior.
4. Run targeted Jest tests, then `corepack pnpm typecheck`.

## Benchmark Refresh Changes

1. Prefer official APIs or source pages.
2. Cache source data server-side; never expose API keys to the browser.
3. Keep curated JSON reviewable and use refreshed DB rows as an additive layer.
4. Record source caveats in README or docs when behavior changes.

## Frontend Flow Changes

1. Use existing Tailwind primitives and compact app UI patterns.
2. Verify selection, submission, results, and compare path.
3. Watch for mobile overflow in selector lists and result cards.
