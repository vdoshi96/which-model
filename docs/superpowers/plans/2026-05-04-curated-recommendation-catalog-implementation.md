# Curated Recommendation Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move which-model to a manually curated, source-backed recommendation catalog where DeepSeek interprets tasks/preferences and deterministic app code ranks models.

**Architecture:** Add versioned curated JSON data, validation, deterministic recommendation scoring, structured user preference controls, evidence-rich results, and a Browser Use manual refresh workflow. The old live benchmark refresh can remain temporarily for historical code but must no longer be the ranking authority.

**Tech Stack:** Next.js App Router, TypeScript, JSON data modules, Zod, Prisma, DeepSeek API, Jest, React Testing Library, Browser Use in-app browser verification.

---

## PR and Branch Policy

All implementation work happens off `main`. Each task group below maps to one GitHub PR.

- Local branch naming: `feature/curated-catalog-XX-short-name`
- PR title format: `feat: <short behavior>`
- PR body must include: summary, tests, Browser Use verification if UI changes, docs updated, residual risks
- Merge order: baseline stabilization, data foundation, intent/preferences, ranking engine, results transparency, manual refresh
- Before pushing, creating a PR, or merging a PR, the controller must ask the user for action-time confirmation because those actions modify GitHub state.

## Documentation Standards

Each PR must update or create a doc when it changes data semantics, ranking semantics, or refresh process.

Use these doc locations:

- Design: `docs/superpowers/specs/2026-05-04-curated-recommendation-catalog-design.md`
- Plan: `docs/superpowers/plans/2026-05-04-curated-recommendation-catalog-implementation.md`
- Refresh notes: `docs/model-catalog/YYYY-MM-DD-refresh-notes.md`
- QA notes: `docs/model-catalog/YYYY-MM-DD-curated-catalog-qa.md`

Do not add “TBD” or unsourced benchmark claims. If a fact is uncertain, document it as uncertainty in notes, not as data.

## Browser Use Standards

Use the Browser Use plugin for two cases:

1. **Manual refresh research**
   - Open official provider and benchmark pages in the in-app browser.
   - Record visible facts, URLs, and dates in refresh notes.
   - Use screenshots only when the visible layout/fact would be hard to summarize.

2. **Local app verification**
   - Verify `http://localhost:3100/`.
   - Verify `http://localhost:3100/results?task=write+a+song`.
   - Verify `http://localhost:3100/results?task=build+a+coding+agent`.
   - Verify `http://localhost:3100/compare`.
   - Check visible ranking copy, evidence counts, cost/context display, and no runtime error overlay.

## Task 0: Baseline Stabilization PR

**PR 1 branch:** `feature/curated-catalog-00-baseline`

**Files:** existing working-tree changes from the prior stabilization work.

- [ ] **Step 1: Review current working tree**

Run:

```bash
git status --short
git diff --stat
```

Expected: existing UI, benchmark-source, cache, login, compare-selection, and recommendation-prior changes are visible.

- [ ] **Step 2: Run verification**

Run:

```bash
corepack pnpm typecheck
corepack pnpm jest --runInBand
corepack pnpm build
```

Expected: typecheck passes, all Jest tests pass, build succeeds with only the existing `jose` Edge Runtime warning.

- [ ] **Step 3: Browser Use verification**

Use Browser Use with `iab` backend.

Verify:

```text
http://localhost:3100/
http://localhost:3100/results?task=write+a+song
http://localhost:3100/compare?models=Claude+Opus+4.7%2CGPT-5.5&task=write+a+song
```

Expected:

- no runtime error overlay
- results mention catalog priors when sparse coverage is involved
- frontier models display cost/context metadata
- compare preserves selected models

- [ ] **Step 4: Commit and prepare PR**

Commit message:

```bash
git add src tests docs
git commit -m "feat: stabilize recommendation and comparison baseline"
```

Ask the user for confirmation before pushing and creating the PR.

## Task 1: Curated Data Schema and Validation

**PR 2 branch:** `feature/curated-catalog-01-data-foundation`

**Files:**

- Create: `src/data/curated/benchmark-definitions.json`
- Create: `src/data/curated/models.json`
- Create: `src/data/curated/scores.json`
- Create: `src/lib/curatedCatalog/schema.ts`
- Create: `src/lib/curatedCatalog/loadCatalog.ts`
- Create: `src/lib/curatedCatalog/validateCatalog.ts`
- Create: `tests/unit/curated-catalog-validation.test.ts`

- [ ] **Step 1: Write failing validation tests**

Create `tests/unit/curated-catalog-validation.test.ts`:

```ts
import {
  loadCuratedCatalog,
  validateCuratedCatalog,
} from "@/lib/curatedCatalog/loadCatalog";

describe("curated catalog validation", () => {
  it("loads valid curated model, benchmark, and score data", () => {
    const catalog = loadCuratedCatalog();
    const result = validateCuratedCatalog(catalog);

    expect(result.ok).toBe(true);
    expect(catalog.models.length).toBeGreaterThanOrEqual(20);
    expect(catalog.benchmarks.length).toBeGreaterThanOrEqual(8);
    expect(catalog.scores.length).toBeGreaterThanOrEqual(60);
  });

  it("requires source-backed cost and context metadata for frontier models", () => {
    const catalog = loadCuratedCatalog();
    const frontierModels = catalog.models.filter(
      (model) => model.status === "frontier",
    );

    expect(frontierModels.length).toBeGreaterThanOrEqual(5);
    expect(
      frontierModels.every(
        (model) =>
          model.contextWindow !== null &&
          model.costInputPer1M !== null &&
          model.costOutputPer1M !== null &&
          model.sourceUrls.length > 0 &&
          model.lastVerified.length > 0,
      ),
    ).toBe(true);
  });

  it("reports missing benchmark references", () => {
    const catalog = loadCuratedCatalog();
    const result = validateCuratedCatalog({
      ...catalog,
      scores: [
        ...catalog.scores,
        {
          modelId: catalog.models[0].id,
          benchmarkId: "missing-benchmark",
          score: 99,
          normalizedScore: 99,
          rawLabel: "bad fixture",
          sourceUrl: "https://example.com",
          lastVerified: "2026-05-04",
          notes: "fixture",
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      `Unknown benchmark id "missing-benchmark" in score row for ${catalog.models[0].id}`,
    );
  });
});
```

Run:

```bash
corepack pnpm jest tests/unit/curated-catalog-validation.test.ts --runInBand
```

Expected before implementation: fail because `@/lib/curatedCatalog/loadCatalog` does not exist.

- [ ] **Step 2: Add JSON seed data**

Create the three JSON files with enough real source-backed seed data to satisfy the tests. Include frontier rows for:

- `gpt-5-5`
- `gpt-5-4`
- `claude-opus-4-7`
- `claude-sonnet-4-6`
- `gemini-3-1-pro-preview`
- `grok-4-3`
- `deepseek-v4-pro`
- `kimi-k2-6`
- `qwen3-max`

Use official source URLs already represented in `src/lib/modelCatalog.ts` for the first seed pass.

- [ ] **Step 3: Implement schemas**

Create `src/lib/curatedCatalog/schema.ts`:

```ts
import { z } from "zod";

export const benchmarkCategorySchema = z.enum([
  "overall",
  "reasoning",
  "coding",
  "instruction_following",
  "creative_writing",
  "math",
  "tool_use",
  "speed",
  "cost_efficiency",
  "long_context",
]);

export const benchmarkDefinitionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  category: benchmarkCategorySchema,
  scale: z.enum(["0_100", "elo", "rank", "price"]),
  higherIsBetter: z.boolean(),
  description: z.string().min(1),
  limitations: z.string().min(1),
  sourceUrl: z.string().url(),
  lastVerified: z.string().min(10),
});

export const curatedModelSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  provider: z.string().min(1),
  apiIds: z.array(z.string()),
  aliases: z.array(z.string()),
  status: z.enum([
    "frontier",
    "active",
    "preview",
    "legacy",
    "deprecated",
    "retired",
  ]),
  releaseDate: z.string().nullable(),
  contextWindow: z.number().int().positive().nullable(),
  costInputPer1M: z.number().nonnegative().nullable(),
  costOutputPer1M: z.number().nonnegative().nullable(),
  modalities: z.array(z.string().min(1)),
  infrastructure: z.array(z.string().min(1)),
  strengthTags: z.array(z.string().min(1)),
  sourceUrls: z.array(z.string().url()),
  lastVerified: z.string().min(10),
  notes: z.string(),
});

export const modelBenchmarkScoreSchema = z.object({
  modelId: z.string().min(1),
  benchmarkId: z.string().min(1),
  score: z.number(),
  normalizedScore: z.number().min(0).max(100),
  rawLabel: z.string().min(1),
  sourceUrl: z.string().url(),
  lastVerified: z.string().min(10),
  notes: z.string(),
});

export const curatedCatalogSchema = z.object({
  benchmarks: z.array(benchmarkDefinitionSchema),
  models: z.array(curatedModelSchema),
  scores: z.array(modelBenchmarkScoreSchema),
});

export type BenchmarkCategory = z.infer<typeof benchmarkCategorySchema>;
export type BenchmarkDefinition = z.infer<typeof benchmarkDefinitionSchema>;
export type CuratedCatalogModel = z.infer<typeof curatedModelSchema>;
export type ModelBenchmarkScore = z.infer<typeof modelBenchmarkScoreSchema>;
export type CuratedCatalog = z.infer<typeof curatedCatalogSchema>;
```

- [ ] **Step 4: Implement loader and validator**

Create `src/lib/curatedCatalog/loadCatalog.ts`:

```ts
import benchmarkDefinitions from "@/data/curated/benchmark-definitions.json";
import models from "@/data/curated/models.json";
import scores from "@/data/curated/scores.json";

import {
  curatedCatalogSchema,
  type CuratedCatalog,
} from "./schema";
import { validateCuratedCatalog } from "./validateCatalog";

export function loadCuratedCatalog(): CuratedCatalog {
  const parsed = curatedCatalogSchema.parse({
    benchmarks: benchmarkDefinitions,
    models,
    scores,
  });
  const validation = validateCuratedCatalog(parsed);

  if (!validation.ok) {
    throw new Error(validation.errors.join("\n"));
  }

  return parsed;
}

export { validateCuratedCatalog };
```

Create `src/lib/curatedCatalog/validateCatalog.ts`:

```ts
import type { CuratedCatalog } from "./schema";

export type CatalogValidationResult =
  | { ok: true; errors: [] }
  | { ok: false; errors: string[] };

export function validateCuratedCatalog(
  catalog: CuratedCatalog,
): CatalogValidationResult {
  const errors: string[] = [];
  const benchmarkIds = new Set(catalog.benchmarks.map((benchmark) => benchmark.id));
  const modelIds = new Set(catalog.models.map((model) => model.id));

  for (const score of catalog.scores) {
    if (!modelIds.has(score.modelId)) {
      errors.push(`Unknown model id "${score.modelId}" in score row`);
    }

    if (!benchmarkIds.has(score.benchmarkId)) {
      errors.push(
        `Unknown benchmark id "${score.benchmarkId}" in score row for ${score.modelId}`,
      );
    }
  }

  for (const model of catalog.models.filter((entry) => entry.status === "frontier")) {
    if (
      model.contextWindow === null ||
      model.costInputPer1M === null ||
      model.costOutputPer1M === null
    ) {
      errors.push(`Frontier model "${model.id}" is missing cost/context metadata`);
    }

    if (model.sourceUrls.length === 0) {
      errors.push(`Frontier model "${model.id}" is missing source URLs`);
    }
  }

  return errors.length === 0 ? { ok: true, errors: [] } : { ok: false, errors };
}
```

- [ ] **Step 5: Verify Task 1**

Run:

```bash
corepack pnpm jest tests/unit/curated-catalog-validation.test.ts --runInBand
corepack pnpm typecheck
```

Expected: tests and typecheck pass.

- [ ] **Step 6: Commit PR 1 locally**

```bash
git add src/data/curated src/lib/curatedCatalog tests/unit/curated-catalog-validation.test.ts
git commit -m "feat: add curated catalog data foundation"
```

Ask the user before pushing/opening the PR.

## Task 2: Intent Schema and Preference Controls

**PR 3 branch:** `feature/curated-catalog-02-intent-preferences`

**Files:**

- Modify: `src/lib/deepseek.ts`
- Create: `src/lib/recommendation/preferences.ts`
- Modify: `src/lib/validators/recommend.ts`
- Modify: `src/components/TaskInput.tsx`
- Modify: `src/app/results/page.tsx`
- Modify: `tests/unit/deepseek.test.ts`
- Modify: `tests/unit/frontend-components.test.tsx`

- [ ] **Step 1: Write failing tests**

Add tests that prove:

- creative writing tasks produce high `overall`, `creative_writing`, and `instruction_following` weights in prompt expectations
- `cost_efficiency` is zero unless the user or checklist requests cost sensitivity
- TaskInput submits checklist preferences in the recommendation request

Run:

```bash
corepack pnpm jest tests/unit/deepseek.test.ts tests/unit/frontend-components.test.tsx --runInBand
```

Expected before implementation: fail because preferences are not part of the request schema/UI.

- [ ] **Step 2: Add preference types**

Create `src/lib/recommendation/preferences.ts`:

```ts
import { z } from "zod";

export const recommendationPreferencesSchema = z.object({
  costSensitive: z.boolean().default(false),
  preferFrontier: z.boolean().default(true),
  latencySensitive: z.boolean().default(false),
  needsLongContext: z.boolean().default(false),
  localOnly: z.boolean().default(false),
  preferredProviders: z.array(z.string()).default([]),
  preferredModels: z.array(z.string()).default([]),
  infrastructure: z.array(z.string()).default([]),
});

export type RecommendationPreferences = z.infer<
  typeof recommendationPreferencesSchema
>;

export const defaultRecommendationPreferences: RecommendationPreferences = {
  costSensitive: false,
  preferFrontier: true,
  latencySensitive: false,
  needsLongContext: false,
  localOnly: false,
  preferredProviders: [],
  preferredModels: [],
  infrastructure: [],
};
```

- [ ] **Step 3: Extend request validation**

Modify `src/lib/validators/recommend.ts` to accept:

```ts
preferences: recommendationPreferencesSchema.optional()
```

and default missing preferences to `defaultRecommendationPreferences` inside the API route.

- [ ] **Step 4: Update DeepSeek prompt and interpretation mapping**

Keep the public `dimensions` property for compatibility in this PR. Add a new internal mapper in `src/lib/recommendation/preferences.ts`:

```ts
import type { TaskDimensions } from "@/types/model";

import type { RecommendationPreferences } from "./preferences";

export interface RecommendationIntent {
  summary: string;
  weights: TaskDimensions & {
    creative_writing: number;
    tool_use: number;
    long_context: number;
  };
}

export function buildRecommendationIntent({
  dimensions,
  preferences,
  summary,
}: {
  dimensions: TaskDimensions;
  preferences: RecommendationPreferences;
  summary: string;
}): RecommendationIntent {
  return {
    summary,
    weights: {
      ...dimensions,
      creative_writing: dimensions.overall,
      tool_use: dimensions.instruction_following,
      long_context: preferences.needsLongContext ? 1 : 0,
      cost_efficiency: preferences.costSensitive
        ? Math.max(dimensions.cost_efficiency, 0.75)
        : 0,
      speed: preferences.latencySensitive ? Math.max(dimensions.speed, 0.75) : 0,
    },
  };
}
```

Later ranking tasks can consume `RecommendationIntent` without requiring a breaking DeepSeek response change in this PR.

The prompt must include:

```text
For creative writing tasks such as songs, poems, stories, speeches, or brand copy, use high weights for overall, creative_writing, and instruction_following. Use cost_efficiency only when the user mentions budget/cost or the costSensitive preference is true.
```

- [ ] **Step 5: Add checklist UI**

In `TaskInput`, add checkboxes/toggles for:

- Cost conscious
- Prefer frontier models
- Need long context
- Low latency
- Local-only

Send them to `/api/recommend` as `preferences`.

- [ ] **Step 6: Verify Task 2**

Run:

```bash
corepack pnpm jest tests/unit/deepseek.test.ts tests/unit/frontend-components.test.tsx --runInBand
corepack pnpm typecheck
```

Expected: tests and typecheck pass.

Use Browser Use to verify the home task form visually at `http://localhost:3100/`.

- [ ] **Step 7: Commit PR 2 locally**

```bash
git add src/lib/deepseek.ts src/lib/recommendation/preferences.ts src/lib/validators/recommend.ts src/components/TaskInput.tsx src/app/results/page.tsx tests
git commit -m "feat: capture recommendation preferences"
```

Ask the user before pushing/opening the PR.

## Task 3: Deterministic Recommendation Engine

**PR 4 branch:** `feature/curated-catalog-03-ranking-engine`

**Files:**

- Create: `src/lib/recommendation/rankCuratedModels.ts`
- Create: `src/lib/recommendation/explainRanking.ts`
- Modify: `src/app/api/recommend/route.ts`
- Modify: `src/app/api/compare/route.ts`
- Modify: `src/types/model.ts`
- Modify: `tests/integration/api-routes.test.ts`
- Create: `tests/unit/rank-curated-models.test.ts`

- [ ] **Step 1: Write failing ranking tests**

Create `tests/unit/rank-curated-models.test.ts`:

```ts
import { loadCuratedCatalog } from "@/lib/curatedCatalog/loadCatalog";
import { rankCuratedModels } from "@/lib/recommendation/rankCuratedModels";
import { defaultRecommendationPreferences } from "@/lib/recommendation/preferences";

describe("rankCuratedModels", () => {
  it("puts frontier models above sparse single-benchmark rows for broad creative tasks", () => {
    const catalog = loadCuratedCatalog();
    const ranked = rankCuratedModels({
      catalog,
      intent: {
        summary: "Song writing needs style and instruction following.",
        weights: {
          overall: 0.85,
          creative_writing: 0.7,
          instruction_following: 0.75,
          reasoning: 0.25,
          coding: 0,
          math: 0,
          tool_use: 0,
          speed: 0,
          cost_efficiency: 0,
          long_context: 0,
        },
      },
      preferences: defaultRecommendationPreferences,
      limit: 10,
    });

    const topFive = ranked.slice(0, 5).map((entry) => entry.model.name);
    expect(topFive).toContain("GPT-5.5");
    expect(topFive).toContain("Claude Opus 4.7");
    expect(ranked[0].evidenceCount).toBeGreaterThanOrEqual(5);
  });

  it("uses cost only when costSensitive is true", () => {
    const catalog = loadCuratedCatalog();
    const base = rankCuratedModels({
      catalog,
      intent: {
        summary: "Write polished marketing copy.",
        weights: {
          overall: 0.8,
          creative_writing: 0.8,
          instruction_following: 0.6,
          reasoning: 0.2,
          coding: 0,
          math: 0,
          tool_use: 0,
          speed: 0,
          cost_efficiency: 0,
          long_context: 0,
        },
      },
      preferences: { ...defaultRecommendationPreferences, costSensitive: false },
      limit: 10,
    });
    const costSensitive = rankCuratedModels({
      catalog,
      intent: {
        summary: "Write polished marketing copy cheaply.",
        weights: {
          overall: 0.8,
          creative_writing: 0.8,
          instruction_following: 0.6,
          reasoning: 0.2,
          coding: 0,
          math: 0,
          tool_use: 0,
          speed: 0,
          cost_efficiency: 0.8,
          long_context: 0,
        },
      },
      preferences: { ...defaultRecommendationPreferences, costSensitive: true },
      limit: 10,
    });

    expect(base[0].model.name).not.toBe(costSensitive[0].model.name);
  });
});
```

Run:

```bash
corepack pnpm jest tests/unit/rank-curated-models.test.ts --runInBand
```

Expected before implementation: fail because `rankCuratedModels` does not exist.

- [ ] **Step 2: Implement ranking result types**

Extend model API types with:

```ts
export interface RankingContribution {
  label: string;
  value: number;
  weight: number;
  contribution: number;
}

export interface RankedModel {
  rank: number;
  model: ModelSummary;
  score: number;
  benchmarksUsed: BenchmarkScore[];
  evidenceCount?: number;
  missingEvidence?: string[];
  contributions?: RankingContribution[];
  rationale?: string;
}
```

- [ ] **Step 3: Implement `rankCuratedModels`**

Implement deterministic ranking:

- filter by provider/model/infra/local/context/cost preferences
- group scores by benchmark category
- weighted average category scores
- evidence penalty for missing high-weight categories
- cost/latency/context boosts only when requested
- stable tie-breaker by status and name

- [ ] **Step 4: Wire `/api/recommend`**

`/api/recommend` should:

1. validate request and preferences
2. call DeepSeek for intent
3. load curated catalog
4. rank through `rankCuratedModels`
5. save query history
6. return ranked models with contributions and rationale

- [ ] **Step 5: Wire `/api/compare`**

Compare should load curated catalog scores for selected models and return category scores/evidence. Keep existing 404 behavior for truly unknown models.

- [ ] **Step 6: Verify Task 3**

Run:

```bash
corepack pnpm jest tests/unit/rank-curated-models.test.ts tests/integration/api-routes.test.ts --runInBand
corepack pnpm typecheck
```

Expected: tests and typecheck pass.

- [ ] **Step 7: Commit PR 3 locally**

```bash
git add src/lib/recommendation src/app/api/recommend src/app/api/compare src/types tests
git commit -m "feat: rank recommendations from curated catalog"
```

Ask the user before pushing/opening the PR.

## Task 4: Results and Compare Transparency

**PR 5 branch:** `feature/curated-catalog-04-results-transparency`

**Files:**

- Modify: `src/components/ModelCard.tsx`
- Modify: `src/components/ComparisonTable.tsx`
- Modify: `src/app/results/page.tsx`
- Modify: `src/app/compare/page.tsx`
- Modify: `tests/unit/frontend-components.test.tsx`
- Modify: `tests/unit/comparison-components.test.tsx`

- [ ] **Step 1: Write failing UI tests**

Add tests that assert:

- model cards show evidence count
- model cards show top contributions
- missing evidence appears when high-weight categories have no score
- result page copy states cost only affects ranking when requested
- compare table shows missing curated categories as missing, not silent zeroes

Run:

```bash
corepack pnpm jest tests/unit/frontend-components.test.tsx tests/unit/comparison-components.test.tsx --runInBand
```

Expected before implementation: fail.

- [ ] **Step 2: Implement ModelCard transparency**

Show:

- `N scoring signals`
- top 3 benchmark badges
- top 3 contribution rows
- missing evidence list
- cost/context/infra metadata

- [ ] **Step 3: Implement Results copy**

Replace generic ranking copy with:

```text
Ranked by task weights, curated benchmark signals, preferences, and available model metadata. Cost affects ranking only when cost sensitivity is requested.
```

- [ ] **Step 4: Implement Compare transparency**

In `ComparisonTable`, add evidence rows or a compact evidence note per model. Keep fixed table dimensions stable on mobile/desktop.

- [ ] **Step 5: Browser Use verification**

Use Browser Use on:

```text
http://localhost:3100/results?task=write+a+song
http://localhost:3100/results?task=build+a+coding+agent
http://localhost:3100/compare?models=GPT-5.5%2CClaude+Opus+4.7&task=write+a+song
```

Expected:

- frontier models appear for `write a song`
- cost/context visible for known frontier models
- evidence counts visible
- no horizontal text overflow on the visible viewport
- no runtime error overlay

- [ ] **Step 6: Commit PR 4 locally**

```bash
git add src/components src/app/results src/app/compare tests
git commit -m "feat: show recommendation evidence and contributions"
```

Ask the user before pushing/opening the PR.

## Task 5: Manual Refresh Workflow and Live Refresh Deprecation

**PR 6 branch:** `feature/curated-catalog-05-manual-refresh`

**Files:**

- Create: `docs/model-catalog/2026-05-04-manual-refresh-runbook.md`
- Create: `docs/model-catalog/2026-05-04-curated-catalog-qa.md`
- Modify: `src/app/api/cron/refresh-benchmarks/route.ts`
- Modify: `src/lib/benchmarkSources/index.ts`
- Modify: `README.md`
- Modify: `tests/integration/cron-refresh.test.ts`

- [ ] **Step 1: Write failing tests**

Update cron tests to assert the old benchmark refresh endpoint no longer updates ranking data automatically. It must return `410 Gone` with:

```json
{
  "ok": false,
  "error": "Automatic benchmark refresh is disabled. Use the manual curated catalog refresh runbook."
}
```

Run:

```bash
corepack pnpm jest tests/integration/cron-refresh.test.ts --runInBand
```

Expected before implementation: fail.

- [ ] **Step 2: Write runbook**

Create `docs/model-catalog/2026-05-04-manual-refresh-runbook.md` with:

- Browser Use setup reminder
- official provider pages checklist
- benchmark pages checklist
- source note template
- JSON edit checklist
- validation commands
- Browser Use UI verification steps
- PR checklist

- [ ] **Step 3: Disable live ranking refresh**

Modify `src/app/api/cron/refresh-benchmarks/route.ts` to return `410` with the exact JSON body from Step 1. Do not run `refreshBenchmarkData()` from this route after the change.

- [ ] **Step 4: Document QA**

Create `docs/model-catalog/2026-05-04-curated-catalog-qa.md` with:

```markdown
# Curated Catalog QA

## Commands

- `corepack pnpm typecheck`
- `corepack pnpm jest --runInBand`
- `corepack pnpm build`

## Browser Use

- `/`
- `/results?task=write+a+song`
- `/results?task=build+a+coding+agent`
- `/compare?models=GPT-5.5%2CClaude+Opus+4.7&task=write+a+song`

## Residual Risks

- Pricing can change between manual refreshes.
- Some benchmarks do not test creative writing directly.
- Preview model costs/context can change quickly.
```

- [ ] **Step 5: Verify Task 5**

Run:

```bash
corepack pnpm jest tests/integration/cron-refresh.test.ts --runInBand
corepack pnpm typecheck
corepack pnpm build
```

Expected: tests, typecheck, and build pass.

- [ ] **Step 6: Commit PR 5 locally**

```bash
git add docs README.md src/app/api/cron/refresh-benchmarks src/lib/benchmarkSources tests/integration/cron-refresh.test.ts
git commit -m "docs: add manual curated catalog refresh workflow"
```

Ask the user before pushing/opening the PR.

## Task 6: Final Integration QA and Merge Order

**PR:** final merge sequence. Create `fix/curated-catalog-final-qa` only if final QA finds a defect that requires another code change.

- [ ] **Step 1: Confirm all PRs are green**

For each PR, verify:

```bash
corepack pnpm typecheck
corepack pnpm jest --runInBand
corepack pnpm build
```

- [ ] **Step 2: Confirm Browser Use final pass**

Use Browser Use to verify:

```text
http://localhost:3100/
http://localhost:3100/results?task=write+a+song
http://localhost:3100/results?task=build+a+coding+agent
http://localhost:3100/compare?models=GPT-5.5%2CClaude+Opus+4.7&task=write+a+song
```

- [ ] **Step 3: Ask for merge confirmation**

Before merging any GitHub PR, ask:

```text
I’m ready to merge PRs in this order: baseline stabilization, data foundation, intent/preferences, ranking engine, results transparency, manual refresh. This will update GitHub main. Please confirm I should merge them now.
```

- [ ] **Step 4: Merge in order**

After confirmation, merge PRs one at a time. After each merge, update local main:

```bash
git switch main
git pull --ff-only origin main
```

Expected: local main tracks remote main after each merge.

- [ ] **Step 5: Final report**

Final response must include:

- PR links
- merge order
- verification commands
- Browser Use verification summary
- any residual risks

## Subagent Execution Notes

Use superpowers:subagent-driven-development once implementation begins.

Recommended subagent boundaries:

1. Task 1 implementer: curated data schema/validation.
2. Task 2 implementer: preference schema and UI controls.
3. Task 3 implementer: ranking engine and API wiring.
4. Task 4 implementer: results/compare transparency UI.
5. Task 5 implementer: manual refresh runbook and cron deprecation.

After each implementer:

1. Run spec compliance review subagent.
2. Run code quality review subagent.
3. Fix issues before moving to the next PR.

Do not dispatch multiple implementers in parallel because the tasks touch shared API/types and would conflict.
