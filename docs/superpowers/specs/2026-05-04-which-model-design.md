# which-model Refined Build Spec

## Status
Approved by user on 2026-05-04 via request to start the sub-agent-driven build.

## Goal
Build `which-model`, a production-ready Next.js App Router application that recommends and compares LLMs for user-described tasks using benchmark data, DeepSeek classification, username/password auth, and IP rate limiting.

## Confirmed Scope
- Initialize the empty GitHub repository `vdoshi96/which-model`.
- Use TypeScript throughout. Do not add JavaScript source files.
- Use Next.js App Router, Tailwind CSS, NextAuth v5 credentials auth, Prisma, Neon Postgres, Upstash Redis, OpenAI SDK pointed at DeepSeek, Zod validation, Jest, and Testing Library.
- Use one branch and PR per required agent: AGENT-001 through AGENT-007.
- Never commit `.env` or `.env.local`; commit only `.env.example`.
- Keep all LLM calls server-side in API routes and shared server libraries.
- Validate every API request with Zod before processing.
- Use graceful benchmark source fallback: log source failures, skip failed source, continue with remaining sources.
- Configure Vercel Cron with `vercel.json`.

## Local Environment
The local `.env.local` file should contain:
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `DEEPSEEK_API_KEY`
- `DEEPSEEK_BASE_URL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `CRON_SECRET`

As of this spec, local generated secrets are present, but `DATABASE_URL`, `UPSTASH_REDIS_REST_URL`, and `UPSTASH_REDIS_REST_TOKEN` still need to be populated in the workspace before live database and Redis verification can pass.

## Architecture
The frontend is a client-driven UI layer with reusable components under `src/components` and route pages under `src/app`. Business logic lives behind API routes and server-only libraries under `src/lib`, keeping the HTTP API reusable for a future React Native iOS client.

Data flows through four backend seams:
- Auth: `src/lib/auth.ts`, `/api/auth/signup`, and NextAuth route handlers.
- Benchmarks: source-specific fetchers normalize public data into a shared benchmark shape, then an orchestrator upserts `Model` and `BenchmarkScore` rows.
- Task interpretation: `src/lib/deepseek.ts` calls DeepSeek using the OpenAI SDK and returns validated task dimension weights.
- Scoring: `src/lib/scoring.ts` combines task weights with normalized benchmark scores for recommendations and comparisons.

Server clients for Prisma, Redis, and DeepSeek are lazily initialized to avoid build-time env crashes.

## Branch And PR Plan
- `main`: initial repository baseline with prompt/spec files.
- `agent/001-scaffolding`: project scaffolding, config, schema, folders, env example, README, base docs.
- `agent/002-auth`: auth routes, auth pages, middleware.
- `agent/003-benchmark-pipeline`: benchmark fetchers, cron route, Vercel cron config.
- `agent/004-deepseek-integration`: DeepSeek client, rate limiting, scoring, recommend and compare APIs.
- `agent/005-comparison`: comparison components and compare page.
- `agent/006-frontend`: polished dark-mode UI pages and shared components.
- `agent/007-qa`: unit/integration tests, QA checklist, bug report, PR review and merge coordination.

Branches with dependencies are created from their dependency branch so they can build before earlier PRs are merged, but every PR targets `main` and is merged in the required order.

## Testing Strategy
- AGENT-001 runs install, type-check/build where possible, and verifies `pnpm dev` can start.
- Feature agents add focused tests for validators and business logic when their code introduces behavior.
- AGENT-007 adds the required Jest unit/integration coverage for scoring, rate limiting, DeepSeek, validators, auth signup, recommend/compare, and cron auth.
- External services are mocked in automated tests. Live service checks run only when valid local env values are available.

## Deployment Configuration
The repo includes `vercel.json` with a daily UTC cron entry for `/api/cron/refresh-benchmarks`. Production Vercel env vars must be added after the GitHub repo is linked to Vercel.

## Open Constraints
- The current workspace still has empty Neon and Upstash values in `.env.local`; live migration and Redis verification are blocked until populated.
- Vercel project linking and production env entry will be completed by the user after repository work is pushed.
