# Model Catalog Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a source-backed 70+ model catalog so Claude, Gemini, Kimi, DeepSeek, Qwen, Llama, thinking variants, and other popular models are discoverable with real cost/context metadata.

**Architecture:** Keep benchmark ranking as the authority, and add a curated catalog as metadata plus UI discoverability. Use catalog fallbacks in compare without synthetic benchmark scores.

**Tech Stack:** Next.js App Router, TypeScript, Prisma, Jest, React Testing Library.

---

### Task 1: Catalog Tests and Module

**Files:**
- Create: `src/lib/modelCatalog.ts`
- Create: `tests/unit/model-catalog.test.ts`
- Modify: `src/types/api.ts`

- [ ] **Step 1: Write failing catalog tests**

Create `tests/unit/model-catalog.test.ts` with tests for:

- `findCatalogModel("claude-sonnet-4-6")` returns Claude Sonnet 4.6.
- `applyCatalogMetadata()` fills cost/context from the catalog and does not mutate the input record.
- `listCatalogModels()` includes Claude, Gemini, Kimi, DeepSeek, Qwen, Llama, Mistral, Cohere, AI21, GLM, and OpenAI families.
- `listCatalogModels()` returns at least 70 rows.
- `listCatalogModels()` includes DeepSeek Reasoner, Qwen Plus Thinking, and OpenAI reasoning rows.
- `applyCatalogMetadata()` preserves non-null source-provided context and pricing while canonicalizing matched names/providers.

Run:

```bash
corepack pnpm jest tests/unit/model-catalog.test.ts --runInBand
```

Expected before implementation: fail because `src/lib/modelCatalog.ts` does not exist.

- [ ] **Step 2: Implement catalog module**

Create `src/lib/modelCatalog.ts` with:

- `CatalogModelStatus`
- `CuratedModel`
- `CatalogModelOption`
- `CURATED_MODEL_CATALOG`
- `listCatalogModels`
- `findCatalogModel`
- `applyCatalogMetadata`
- `mergeCatalogWithDbModels`

- [ ] **Step 3: Run catalog tests**

Run:

```bash
corepack pnpm jest tests/unit/model-catalog.test.ts --runInBand
```

Expected after implementation: pass.

### Task 2: Benchmark and API Integration

**Files:**
- Modify: `src/lib/benchmarkSources/index.ts`
- Modify: `src/app/api/models/route.ts`
- Modify: `src/app/api/recommend/route.ts`
- Modify: `src/app/api/compare/route.ts`
- Modify: `tests/unit/benchmark-upsert.test.ts`
- Modify: `tests/integration/api-routes.test.ts`

- [ ] **Step 1: Write failing integration tests**

Add tests that prove:

- Benchmark upsert writes catalog cost/context when a benchmark record aliases a curated model.
- `GET /api/models` returns catalog models plus DB models.
- `/api/recommend` excludes models with no benchmark scores.
- `/api/compare` can return a catalog-only model with null scores and real metadata.
- `/api/compare` uses alias-backed DB benchmark scores when the selected name is a catalog display name.
- `/api/compare` still 404s for truly unknown names.

Run:

```bash
corepack pnpm jest tests/unit/benchmark-upsert.test.ts tests/integration/api-routes.test.ts --runInBand
```

Expected before implementation: fail.

- [ ] **Step 2: Implement backend integration**

Use `applyCatalogMetadata()` before upserting benchmark model metadata. Add `/api/models`. Use `mergeCatalogWithDbModels()` in API routes. Filter recommendation inputs to models with at least one valid benchmark score.

- [ ] **Step 3: Run focused backend tests**

Run:

```bash
corepack pnpm jest tests/unit/benchmark-upsert.test.ts tests/integration/api-routes.test.ts --runInBand
```

Expected after implementation: pass.

### Task 3: UI Discovery

**Files:**
- Modify: `src/types/api.ts`
- Modify: `src/components/TaskInput.tsx`
- Modify: `src/app/compare/page.tsx`
- Modify: `tests/unit/frontend-components.test.tsx`

- [ ] **Step 1: Write failing UI test**

Add a React Testing Library test showing that opening "Compare specific models" fetches `/api/models` and renders a catalog model without needing stored recommendations.

Run:

```bash
corepack pnpm jest tests/unit/frontend-components.test.tsx --runInBand
```

Expected before implementation: fail.

- [ ] **Step 2: Implement UI loading**

Add a typed `/api/models` fetch helper in `TaskInput` and compare page. Merge fetched names with URL/storage/recommendation names.

- [ ] **Step 3: Run focused UI tests**

Run:

```bash
corepack pnpm jest tests/unit/frontend-components.test.tsx --runInBand
```

Expected after implementation: pass.

### Task 4: QA and Merge

**Files:**
- Create: `docs/model-catalog/2026-05-04-03-qa.md`
- Merge: `feature/model-catalog-expansion` into `main`

- [ ] **Step 1: Run full QA**

Run:

```bash
corepack pnpm test --runInBand
corepack pnpm typecheck
```

Expected: all tests and typecheck pass.

- [ ] **Step 2: Document QA**

Write `docs/model-catalog/2026-05-04-03-qa.md` with commands, results, and any residual risks.

- [ ] **Step 3: Merge into main**

Run:

```bash
git status --short
git switch main
git merge --no-ff feature/model-catalog-expansion
```

Expected: merge completes cleanly after QA.
