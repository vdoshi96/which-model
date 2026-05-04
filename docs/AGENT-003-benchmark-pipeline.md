# AGENT-003: Benchmark Data Pipeline

## Status
[ ] In Progress | [x] Complete | [ ] Blocked

## Branch
`agent/003-benchmark-pipeline`

## PR Link
https://github.com/vdoshi96/which-model/pull/3

## Responsibilities
- Implement public benchmark source fetchers for Artificial Analysis, LMSYS Arena, HF Open LLM Leaderboard, and LiveBench.
- Normalize benchmark outputs to the shared 0-100 `BenchmarkScore` scale.
- Refresh benchmark data through a secure Vercel Cron route.
- Upsert `Model` and `BenchmarkScore` records without creating duplicates.
- Add focused tests for normalization and cron authorization.

## Decisions Made
- Added shared normalization helpers for ELO min/max, percentage values, speed with fastest model as 100, and inverted cost with cheapest model as 100.
- Added shared source parsing utilities for public JSON, CSV, deeply nested object arrays, conservative provider inference, and structured source error logging.
- Kept all source failures non-fatal: each fetcher tries candidate endpoints/fallbacks, and the orchestrator skips failed sources while continuing with successful ones.
- Implemented `refreshBenchmarkData()` in `src/lib/benchmarkSources/index.ts` so the cron route has one clear entry point for fetch, dedupe, and Prisma upserts.
- Implemented secure cron `GET` and exported `POST` as an alias. The route rejects missing `CRON_SECRET`, missing auth, malformed auth, and wrong bearer tokens with 401.
- Used the public Hugging Face datasets-server rows endpoint as a LiveBench fallback because the originally specified raw GitHub `results.json` URL currently returns 404 and the repo now lives at `LiveBench/LiveBench`.
- Added Vitest as a lightweight TypeScript test runner.

## Challenges Encountered
- Public benchmark endpoints are not stable. Artificial Analysis does not expose a documented static endpoint, so the fetcher tries multiple JSON candidates and falls back to parsing embedded JSON from HTML.
- LiveBench's specified `livebench-ai/livebench` raw result URL is currently unavailable. The implementation still tries direct JSON candidates, then samples public `livebench/model_judgment` leaderboard rows from Hugging Face and aggregates category scores by model.
- HF Open LLM Leaderboard public JSON locations are also treated as candidates and can be skipped gracefully if unavailable or malformed.

## Files Created / Modified
- `src/lib/benchmarkSources/artificialAnalysis.ts`
- `src/lib/benchmarkSources/lmsysArena.ts`
- `src/lib/benchmarkSources/hfLeaderboard.ts`
- `src/lib/benchmarkSources/livebench.ts`
- `src/lib/benchmarkSources/index.ts`
- `src/lib/benchmarkSources/normalization.ts`
- `src/lib/benchmarkSources/sourceUtils.ts`
- `src/app/api/cron/refresh-benchmarks/route.ts`
- `tests/unit/benchmark-normalization.test.ts`
- `tests/unit/cron-refresh.test.ts`
- `tests/unit/benchmark-upsert.test.ts`
- `vitest.config.ts`
- `package.json`
- `pnpm-lock.yaml`
- `docs/AGENT-003-benchmark-pipeline.md`

## Test Results
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm build` - passed. Next.js emitted a workspace-root warning because this isolated worktree is nested under the shared repo and both contain `pnpm-lock.yaml`.
- `corepack pnpm test` - passed, 3 files / 7 tests.

## Dependencies on Other Agents
- Depends on AGENT-001 scaffold, Prisma schema, and cron route location.
- Does not depend on AGENT-002 auth or AGENT-004 DeepSeek work.

## Open Issues
- First production cron run quality depends on current public source availability. Individual source failures are logged and skipped by design.
- No API keys were added. Benchmark sources are public.
