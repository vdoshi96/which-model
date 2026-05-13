# Status

Current phase: product-flow redesign toward scoped model recommendations.

What exists:

- Authenticated Next.js app with home, results, compare, auth pages, and API routes.
- Curated model catalog and deterministic scoring/ranking.
- Benchmark source adapters and Prisma-backed refresh route.
- Provider/model scope selector on the home task flow.
- Three backend recommendation tiers: no holds barred, balanced, budget.

Recently changed:

- Provider and model filters now behave as a union candidate scope.
- `/api/recommend` returns scoped recommendation tiers and catalog scope metadata.
- `/api/models` returns provider groups and model IDs.
- Weekly cron refresh is enabled and feeds an effective catalog merged from DB rows plus curated JSON.
- Artificial Analysis adapter now maps more evaluation fields into task categories.

Last verification:

- `corepack pnpm test -- tests/unit/recommendation-tiers.test.ts tests/unit/rank-curated-models.test.ts tests/integration/api-routes.test.ts tests/integration/cron-refresh.test.ts tests/unit/frontend-components.test.tsx tests/unit/benchmark-sources.test.ts --runInBand`
- `corepack pnpm typecheck`
- `corepack pnpm test --runInBand`
- `corepack pnpm build`
- Browser plugin QA on `http://localhost:3000`: authenticated home selector, desktop result flow, and 390px mobile home viewport.
- Vercel production/preview env check: required database, auth, DeepSeek, Upstash, cron, admin, query-audit, and Artificial Analysis variables are present; secrets are stored as sensitive.

Next checks:

- Run a real scheduled refresh in the deployed environment after the post-env redeploy is ready.

Known issues:

- Curated effort-level variants are inferred from model names unless refreshed data provides separate variant rows.
