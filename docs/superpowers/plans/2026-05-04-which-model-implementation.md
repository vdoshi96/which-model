# which-model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify the full `which-model` web application as specified in `CODEX_INSTRUCTIONS.md`.

**Architecture:** Next.js App Router provides client-rendered pages and server-side API routes. Prisma persists users, query history, models, and benchmark scores in Neon Postgres; Upstash Redis rate-limits requests; DeepSeek task classification runs server-side through the OpenAI SDK with a DeepSeek base URL.

**Tech Stack:** TypeScript, Next.js, React, Tailwind CSS, NextAuth v5, Prisma, Neon Postgres, Upstash Redis, OpenAI SDK, Zod, Jest, Testing Library, Vercel Cron.

---

### Task 1: Repository Baseline

**Files:**
- Modify: `.gitignore`
- Keep: `CODEX_INSTRUCTIONS.md`
- Keep: `CODEX_PROMPT.md`
- Create: `docs/superpowers/specs/2026-05-04-which-model-design.md`
- Create: `docs/superpowers/plans/2026-05-04-which-model-implementation.md`

- [ ] Initialize git with `main`.
- [ ] Add remote `https://github.com/vdoshi96/which-model.git`.
- [ ] Commit the baseline files with `docs: add project instructions and build plan`.
- [ ] Push `main` to GitHub.

### Task 2: AGENT-001 Project Scaffolding

**Branch:** `agent/001-scaffolding`

**Files:**
- Create the full Next.js, Prisma, Tailwind, source, tests, and docs structure specified in `CODEX_INSTRUCTIONS.md`.
- Create: `docs/AGENT-001-scaffolding.md`

- [ ] Create branch `agent/001-scaffolding` from `main`.
- [ ] Scaffold a Next.js App Router TypeScript project with Tailwind and pnpm.
- [ ] Install all spec dependencies.
- [ ] Add Prisma schema exactly matching the project schema.
- [ ] Add lazy Prisma, Redis, DeepSeek, rate limit, scoring, and benchmark placeholder modules so the app builds.
- [ ] Add `.env.example` with empty values only.
- [ ] Add `README.md`, `vercel.json`, and all required folders/files.
- [ ] Run Prisma migration generation; run live `prisma migrate dev --name init` only if `DATABASE_URL` is valid.
- [ ] Verify `corepack pnpm build`.
- [ ] Verify `corepack pnpm dev` starts, then stop it.
- [ ] Fill `docs/AGENT-001-scaffolding.md`.
- [ ] Commit with conventional commit messages.
- [ ] Push branch and open PR to `main`.

### Task 3: AGENT-002 Auth System

**Branch:** `agent/002-auth`

**Files:**
- Modify: `src/lib/auth.ts`
- Create: `src/lib/validators/auth.ts`
- Create: `src/app/api/auth/signup/route.ts`
- Modify: `src/app/api/auth/[...nextauth]/route.ts`
- Modify: `src/middleware.ts`
- Modify: `src/app/auth/signin/page.tsx`
- Modify: `src/app/auth/signup/page.tsx`
- Create: `docs/AGENT-002-auth.md`

- [ ] Branch from `agent/001-scaffolding`.
- [ ] Implement Zod auth validators.
- [ ] Implement NextAuth v5 credentials config with bcrypt compare and JWT session strategy.
- [ ] Implement username/password signup route with duplicate handling and bcrypt salt rounds 12.
- [ ] Implement signin/signup pages with controlled inputs and inline errors.
- [ ] Protect `/results` and `/compare`.
- [ ] Add focused tests for validators and signup failure/success behavior where practical.
- [ ] Fill agent doc, commit, push, open PR to `main`.

### Task 4: AGENT-003 Benchmark Pipeline

**Branch:** `agent/003-benchmark-pipeline`

**Files:**
- Modify: `src/lib/benchmarkSources/*.ts`
- Create: `src/lib/benchmarkSources/normalization.ts`
- Create: `src/lib/benchmarkSources/types.ts`
- Modify: `src/app/api/cron/refresh-benchmarks/route.ts`
- Modify: `vercel.json`
- Create: `docs/AGENT-003-benchmark-pipeline.md`

- [ ] Branch from `agent/001-scaffolding`.
- [ ] Implement each source fetcher with source-local try/catch and normalized 0-100 output.
- [ ] Implement orchestrator that skips failed sources and continues.
- [ ] Implement idempotent Prisma upsert of models and benchmark scores.
- [ ] Secure cron route with `Authorization: Bearer ${CRON_SECRET}`.
- [ ] Configure daily `0 2 * * *` Vercel Cron.
- [ ] Add tests for normalization and cron unauthorized behavior where practical.
- [ ] Fill agent doc, commit, push, open PR to `main`.

### Task 5: AGENT-004 DeepSeek, Rate Limit, APIs

**Branch:** `agent/004-deepseek-integration`

**Files:**
- Modify: `src/lib/deepseek.ts`
- Modify: `src/lib/rateLimit.ts`
- Modify: `src/lib/scoring.ts`
- Create: `src/lib/validators/recommend.ts`
- Create: `src/lib/validators/compare.ts`
- Modify: `src/app/api/recommend/route.ts`
- Modify: `src/app/api/compare/route.ts`
- Create: `docs/AGENT-004-deepseek-integration.md`

- [ ] Branch from `agent/003-benchmark-pipeline`.
- [ ] Implement DeepSeek task interpreter with the required system prompt, model, caps, and JSON validation.
- [ ] Implement 5-per-60-minute IP sliding-window rate limiting.
- [ ] Implement weighted scoring over model benchmark scores.
- [ ] Implement recommend endpoint with Zod validation, rate limiting, DeepSeek refusal handling, query logging, and ranked output.
- [ ] Implement compare endpoint with Zod validation, rate limiting, DeepSeek refusal handling, and 2-5 model comparison output.
- [ ] Add tests for DeepSeek parsing, scoring, validators, and API errors where practical.
- [ ] Fill agent doc, commit, push, open PR to `main`.

### Task 6: AGENT-005 Comparison Feature

**Branch:** `agent/005-comparison`

**Files:**
- Modify: `src/components/ModelSelector.tsx`
- Modify: `src/components/ComparisonTable.tsx`
- Modify: `src/app/compare/page.tsx`
- Create: `docs/AGENT-005-comparison.md`

- [ ] Branch from `agent/004-deepseek-integration`.
- [ ] Implement searchable 2-5 model selector with controlled state.
- [ ] Implement responsive comparison table with winner badge, weighted score, dimensions, cost, context, N/A handling, and score colors.
- [ ] Implement compare page flow that reads URL/session state, preselects top models when available, calls `/api/compare`, and renders results.
- [ ] Add focused component tests where practical.
- [ ] Fill agent doc, commit, push, open PR to `main`.

### Task 7: AGENT-006 Frontend UI

**Branch:** `agent/006-frontend`

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/app/page.tsx`
- Modify: `src/app/results/page.tsx`
- Modify: `src/app/auth/signin/page.tsx`
- Modify: `src/app/auth/signup/page.tsx`
- Modify: `src/components/*.tsx`
- Create: `docs/AGENT-006-frontend.md`

- [ ] Branch from `agent/005-comparison`.
- [ ] Apply dark, minimal, no-gradient/no-purple visual system with the required CSS variables and fonts.
- [ ] Implement NavBar auth-aware links and sign out.
- [ ] Implement home task input, character counter, compare toggle, loading state, and navigation to results.
- [ ] Implement results page with summary, CSS bar chart, top 10 ranking list, cards, benchmark badges, and compare-top-models action.
- [ ] Polish auth pages and all responsive states, especially 375px width.
- [ ] Run React quality review checklist after TSX edits.
- [ ] Fill agent doc, commit, push, open PR to `main`.

### Task 8: AGENT-007 QA And Merge

**Branch:** `agent/007-qa`

**Files:**
- Create/modify: `tests/unit/*`
- Create/modify: `tests/integration/*`
- Create: `jest.config.ts`
- Create: `jest.setup.ts`
- Create: `docs/AGENT-007-qa.md`
- Create: `docs/BUG_REPORT.md`
- Create: `docs/QA_CHECKLIST.md`

- [ ] Branch from `agent/006-frontend`.
- [ ] Install Jest and Testing Library dependencies.
- [ ] Add required unit tests for scoring, rateLimit, deepseek, and Zod validators.
- [ ] Add required integration tests for recommend, compare, auth signup, and cron.
- [ ] Run full test suite and build.
- [ ] Review PRs 001-006.
- [ ] Merge PRs in order 001, 002, 003, 004, 005, 006, then 007.
- [ ] Checkout `main`, pull latest, run final `corepack pnpm build`.
- [ ] Confirm `vercel.json` cron config is present.

## Self-Review
- Spec coverage: Every required agent and final checklist item maps to a task above.
- Placeholder scan: No TBD/TODO placeholders remain.
- Type consistency: Branch names, file names, route paths, and env keys match `CODEX_INSTRUCTIONS.md`.
