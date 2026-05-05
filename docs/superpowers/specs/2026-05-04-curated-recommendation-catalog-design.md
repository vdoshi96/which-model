# Curated Recommendation Catalog Design

**Goal:** Replace live benchmark-driven ranking with a manually curated, source-backed model intelligence catalog that DeepSeek interprets but does not directly rank.

**Architecture:** which-model stores model metadata, benchmark definitions, benchmark scores, infrastructure compatibility, qualitative tags, and source notes in versioned local data files. DeepSeek translates a user task and checklist preferences into a typed intent profile. The app applies deterministic ranking against the curated data so every result is reproducible, inspectable, and explainable.

**Tech Stack:** Next.js App Router, TypeScript, JSON data modules, Zod validation, Prisma for query history, DeepSeek API for task interpretation, Jest, React Testing Library, Browser Use for manual refresh research and end-to-end UI verification.

## Product Principles

1. Recommendations must be reproducible. DeepSeek can interpret the ask, but it must not be the final opaque ranker.
2. Sparse benchmark coverage must be visible. A model with one benchmark row should not look as trustworthy as a model with broad evidence.
3. Cost only matters when the user says it matters or checks a cost-sensitive option.
4. Context window, pricing, infrastructure availability, and source dates are first-class recommendation inputs.
5. Manual refreshes are intentional editorial events. There is no background crawler that silently changes ranking behavior.

## Data Model

Create a curated data layer under `src/data/curated/`.

### `benchmark-definitions.json`

Each benchmark definition describes what a benchmark means, what it is good for, and how its score should be interpreted.

Fields:

- `id`: stable identifier such as `lmarena_text`, `swe_bench_verified`, `aider_polyglot`, `bfcl_v4`, `livebench_global`, `artificial_analysis_intelligence`
- `label`: user-facing label
- `category`: one of `overall`, `reasoning`, `coding`, `instruction_following`, `creative_writing`, `math`, `tool_use`, `speed`, `cost_efficiency`, `long_context`
- `scale`: `0_100`, `elo`, `rank`, or `price`
- `higherIsBetter`: boolean
- `description`: what this benchmark measures
- `limitations`: what this benchmark does not prove
- `sourceUrl`: canonical public URL
- `lastVerified`: local verification date

### `models.json`

Each model record contains provider metadata and fixed source-backed cost/context data.

Fields:

- `id`: stable app id, for example `gpt-5-5`
- `name`: display name, for example `GPT-5.5`
- `provider`: display provider
- `apiIds`: provider and aggregator identifiers
- `aliases`: benchmark/source aliases
- `status`: `frontier`, `active`, `preview`, `legacy`, `deprecated`, or `retired`
- `releaseDate`: ISO date when known
- `contextWindow`: token count or null
- `costInputPer1M`: USD per 1M input tokens or null
- `costOutputPer1M`: USD per 1M output tokens or null
- `modalities`: `text`, `image`, `audio`, `video`, `tool_use`, etc.
- `infrastructure`: `openai_api`, `anthropic_api`, `google_ai_studio`, `vertex_ai`, `bedrock`, `openrouter`, `together`, `fireworks`, `local`, etc.
- `strengthTags`: `creative_writing`, `coding_agent`, `reasoning`, `low_latency`, `long_context`, `tool_use`, `cost_sensitive`, etc.
- `sourceUrls`: official docs/pricing/model pages
- `lastVerified`: local verification date
- `notes`: short caveats about tiers, previews, cache pricing, regional pricing, or hosting-specific costs

### `scores.json`

Each score links a model to a benchmark.

Fields:

- `modelId`
- `benchmarkId`
- `score`
- `normalizedScore`
- `rawLabel`
- `sourceUrl`
- `lastVerified`
- `notes`

The target is not exactly 20 rows for every model on day one. The validation standard is:

- Frontier models should have broad metadata plus at least five scoring signals, including at least one overall or creative/general quality signal.
- Benchmark-only or open-weight models can appear with fewer signals, but the UI must show that lower coverage.
- The catalog validator reports coverage gaps by model and by benchmark category.

## DeepSeek Role

DeepSeek receives:

- the user task text
- checklist preferences
- a compact description of supported benchmark categories
- available filters such as cost sensitivity, preferred providers, preferred models, infrastructure harness, latency sensitivity, long-context requirement, modality needs, and local/cloud preference

DeepSeek returns typed JSON:

```json
{
  "refused": false,
  "summary": "Creative writing task; prioritize broad model quality, instruction following, and stylistic control.",
  "weights": {
    "overall": 0.85,
    "instruction_following": 0.75,
    "creative_writing": 0.7,
    "reasoning": 0.25,
    "coding": 0,
    "math": 0,
    "tool_use": 0,
    "speed": 0,
    "cost_efficiency": 0,
    "long_context": 0
  },
  "filters": {
    "providers": [],
    "models": [],
    "infrastructure": [],
    "requiresLocal": false,
    "requiresLongContext": false,
    "maxInputCostPer1M": null,
    "maxOutputCostPer1M": null
  },
  "preferences": {
    "costSensitive": false,
    "latencySensitive": false,
    "preferFrontier": true
  }
}
```

DeepSeek never receives the full raw catalog unless a small shortlist needs explanation. The ranking engine remains deterministic.

## Ranking Engine

Ranking happens in `src/lib/recommendation/`.

Pipeline:

1. Load and validate curated data.
2. Apply hard filters: provider/model preferences, infrastructure, local/cloud, modality, context, and cost ceilings.
3. Group scores by benchmark category.
4. For each model, compute category scores using normalized benchmark values.
5. Apply DeepSeek/user weights.
6. Apply transparent adjustments:
   - frontier/active status boost only for broad tasks
   - cost boost only when cost-sensitive
   - latency boost only when latency-sensitive
   - long-context boost only when relevant
7. Apply evidence penalty if high-weight categories have no supporting score.
8. Return ranked models with:
   - final score
   - category contributions
   - evidence count
   - missing high-value evidence
   - cost/context/infra metadata
   - explanation strings generated from deterministic contributions

## UI

### Home / Task Input

Add structured controls below the task box:

- Cost conscious
- Prefer frontier models
- Preferred providers
- Preferred models
- Infrastructure/harness: OpenAI API, Anthropic API, Google/Vertex, Bedrock, OpenRouter, local, no preference
- Need long context
- Need low latency
- Local-only

These controls are sent to `/api/recommend` with the task text.

### Results

Results should show:

- task summary
- interpreted weights and active filters
- top ranked models
- cost/context/infra details
- evidence count
- strongest scoring signals
- missing evidence
- deterministic “why this ranked” contributions

The page copy must explicitly say that cost affects ranking only when requested.

### Compare

Compare should use the same curated model metadata and category scores. It should compare selected models even when benchmark coverage differs, while showing missing categories as missing rather than as zeros without explanation.

## Manual Refresh Workflow

There is no automatic benchmark cron as a ranking source.

When the user asks for a refresh:

1. Use Browser Use against official provider docs, pricing pages, model pages, and benchmark leaderboards.
2. Capture source URLs, visible page facts, dates, screenshots when useful, and notes in `docs/model-catalog/YYYY-MM-DD-refresh-notes.md`.
3. Update curated JSON files manually.
4. Run catalog validation and app tests.
5. Use Browser Use on `localhost:3100` to verify:
   - `/`
   - `/results?task=write+a+song`
   - `/results?task=build+a+coding+agent`
   - `/compare`
6. Open a dedicated PR for the refresh and merge it only after review.

## Documentation Standards

Every data refresh PR must include:

- changed model ids
- changed benchmark ids
- sources consulted
- what changed and why
- verification commands and outcomes
- Browser Use pages/screens verified
- residual uncertainty, especially around price tiers or preview models

Every implementation PR must include:

- tests added/changed
- behavior changed
- screenshots or Browser Use notes for visible UI changes
- migration or compatibility notes

## PR Sequence

1. **PR 1: Baseline stabilization**
   - Capture already completed UI/data-quality fixes currently in the working tree.
   - This must land first so the app has a clean baseline.

2. **PR 2: Curated data foundation**
   - Add curated JSON schemas, validator, benchmark definitions, initial model/scores data, and docs standards.

3. **PR 3: Intent and preference capture**
   - Extend DeepSeek interpretation and add user checklist controls.

4. **PR 4: Deterministic recommendation engine**
   - Replace live benchmark ranking source with curated-data deterministic ranking.

5. **PR 5: Results and compare transparency**
   - Add evidence counts, score contributions, missing-evidence messaging, and compare support.

6. **PR 6: Manual refresh workflow**
   - Deprecate live refresh ranking, add refresh runbook, Browser Use QA checklist, and data validation commands.

Merge order is strictly PR 1 through PR 6. Each PR must pass typecheck, Jest, build, and Browser Use verification when it affects visible behavior.

## Risks

- Manual curation can lag behind model releases. Mitigation: make refreshes small, source-backed, and fast.
- Curated priors can become subjective. Mitigation: prefer benchmark rows where available and show evidence/missing-evidence clearly.
- DeepSeek can misclassify tasks. Mitigation: expose weights/preferences to the user and let checklist controls override interpretation.
- Pricing changes frequently. Mitigation: source URLs, last-verified dates, and refresh notes are required for every price change.
