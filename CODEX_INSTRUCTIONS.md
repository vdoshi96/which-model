# CODEX_INSTRUCTIONS.md
# Project: which-model
# GitHub: https://github.com/vdoshi96/which-model
# Last Updated: 2026-05-04

---

## OVERVIEW

Build a full-stack web application called **which-model** that helps users find the best LLM for their specific task. The app aggregates benchmark data from multiple public sources, uses the DeepSeek API to interpret natural-language task descriptions, and returns ranked model recommendations. Users can also select 2 or more specific models for a side-by-side task-specific comparison. The app requires username/password signup (no email). Abuse is limited via IP rate limiting.

The codebase must be architected for easy future transition to a React Native iOS app — clean separation between frontend components and backend API routes is mandatory.

---

## TECH STACK

| Layer | Technology | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | Web now, API layer reusable for React Native later |
| Styling | Tailwind CSS | Fast, utility-first, easy to port |
| Auth | NextAuth.js v5 (Credentials provider) | Username + bcrypt, no email required |
| Database | PostgreSQL via Neon (serverless) | Free tier, serverless-compatible |
| ORM | Prisma | Type-safe, clean migrations |
| Cache + Rate Limiting | Upstash Redis | IP rate limiting, session caching |
| LLM Integration | DeepSeek API (OpenAI-compatible SDK) | Task interpretation engine |
| Cron Jobs | Vercel Cron | Nightly benchmark data refresh |
| Deployment | Vercel | Matches existing infra |
| Package Manager | pnpm | Fast, disk-efficient |
| Language | TypeScript throughout | Type safety, easier iOS API contract later |

---

## REPOSITORY SETUP

- Repo: `https://github.com/vdoshi96/which-model`
- Default branch: `main`
- Each agent works on its own branch named `agent/XXX-description`
- Each agent opens a PR to `main` when its work is complete
- PRs must include: summary, files changed, test results, QA checklist
- Merges to `main` happen after QA agent reviews the PR

---

## ENVIRONMENT VARIABLES

Create a `.env.local` file at project root (never commit this). Add all of the following:

```
# Database
DATABASE_URL=your_neon_postgres_connection_string

# Auth
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
NEXTAUTH_URL=http://localhost:3000

# DeepSeek
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com

# Upstash Redis
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token

# Cron security
CRON_SECRET=generate_a_random_string
```

Also create `.env.example` with all keys but empty values. Commit only `.env.example`.

---

## FOLDER STRUCTURE TO INITIALIZE

```
which-model/
├── .env.example
├── .gitignore
├── README.md
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
├── tailwind.config.ts
├── tsconfig.json
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
│   └── favicon.ico
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                        # Home / search page
│   │   ├── globals.css
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── [...nextauth]/route.ts
│   │   │   ├── recommend/
│   │   │   │   └── route.ts               # POST: task → ranked models
│   │   │   ├── compare/
│   │   │   │   └── route.ts               # POST: models + task → comparison
│   │   │   └── cron/
│   │   │       └── refresh-benchmarks/
│   │   │           └── route.ts           # GET: nightly cron endpoint
│   │   ├── auth/
│   │   │   ├── signin/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── compare/
│   │   │   └── page.tsx                   # Model comparison page
│   │   └── results/
│   │       └── page.tsx                   # Recommendation results page
│   ├── components/
│   │   ├── ui/                            # Reusable primitives (Button, Input, Card, Badge, etc.)
│   │   ├── TaskInput.tsx                  # Main search/task entry component
│   │   ├── ModelCard.tsx                  # Single model recommendation card
│   │   ├── ModelSelector.tsx              # Multi-select picker for comparison
│   │   ├── ComparisonTable.tsx            # Side-by-side comparison component
│   │   ├── RankingList.tsx                # Ordered list of recommended models
│   │   ├── BenchmarkBadge.tsx             # Shows benchmark source + score
│   │   └── NavBar.tsx
│   ├── lib/
│   │   ├── auth.ts                        # NextAuth config
│   │   ├── db.ts                          # Prisma client singleton
│   │   ├── redis.ts                       # Upstash Redis client
│   │   ├── deepseek.ts                    # DeepSeek API client + prompt logic
│   │   ├── rateLimit.ts                   # IP rate limiting logic
│   │   ├── scoring.ts                     # Benchmark → task score weighting logic
│   │   └── benchmarkSources/
│   │       ├── index.ts                   # Orchestrator: calls all sources, normalizes
│   │       ├── artificialAnalysis.ts      # Fetcher for Artificial Analysis data
│   │       ├── lmsysArena.ts              # Fetcher for LMSYS Arena HF dataset
│   │       ├── hfLeaderboard.ts           # Fetcher for HF Open LLM Leaderboard
│   │       └── livebench.ts              # Fetcher for LiveBench GitHub JSON
│   ├── types/
│   │   ├── model.ts                       # Model, BenchmarkScore, TaskDimensions types
│   │   └── api.ts                         # API request/response types
│   └── middleware.ts                      # Auth guard for protected routes
├── docs/
│   ├── AGENT-001-scaffolding.md
│   ├── AGENT-002-auth.md
│   ├── AGENT-003-benchmark-pipeline.md
│   ├── AGENT-004-deepseek-integration.md
│   ├── AGENT-005-comparison-feature.md
│   ├── AGENT-006-frontend-ui.md
│   └── AGENT-007-qa.md
└── tests/
    ├── unit/
    └── integration/
```

---

## DATABASE SCHEMA (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(cuid())
  username     String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  queries      Query[]
}

model Query {
  id          String   @id @default(cuid())
  userId      String?
  user        User?    @relation(fields: [userId], references: [id])
  taskText    String
  ipAddress   String
  resultJson  Json
  createdAt   DateTime @default(now())
}

model Model {
  id          String           @id @default(cuid())
  name        String           @unique  // e.g. "GPT-4o", "Claude 3.5 Sonnet"
  provider    String           // e.g. "OpenAI", "Anthropic"
  contextWindow Int?
  costInputPer1M  Float?       // USD per 1M input tokens
  costOutputPer1M Float?       // USD per 1M output tokens
  scores      BenchmarkScore[]
  updatedAt   DateTime         @updatedAt
}

model BenchmarkScore {
  id          String   @id @default(cuid())
  modelId     String
  model       Model    @relation(fields: [modelId], references: [id])
  source      String   // "artificial_analysis" | "lmsys_arena" | "hf_leaderboard" | "livebench"
  dimension   String   // "reasoning" | "coding" | "math" | "instruction_following" | "overall" | "speed" | "cost_efficiency"
  score       Float
  rawLabel    String?  // original label from source e.g. "MMLU", "ELO", "HumanEval"
  fetchedAt   DateTime @default(now())

  @@unique([modelId, source, dimension])
}
```

---

## AGENT DEFINITIONS

Each agent is a sub-agent responsible for one domain. Each agent MUST:
1. Work on branch `agent/XXX-description`
2. Create its documentation file in `docs/AGENT-XXX-description.md` (see template below)
3. Write code, then write or update tests
4. Open a PR to `main` with a full summary
5. Not merge its own PR — QA agent (AGENT-007) reviews and merges

---

### AGENT-001: Project Scaffolding

**Branch:** `agent/001-scaffolding`
**Doc:** `docs/AGENT-001-scaffolding.md`

**Responsibilities:**
- Initialize Next.js 14 project with App Router, TypeScript, Tailwind, pnpm
- Install all dependencies listed below
- Set up Prisma with schema above, connect to Neon PostgreSQL
- Set up Upstash Redis client in `src/lib/redis.ts`
- Create `.env.example` and `.gitignore`
- Create base `README.md` with project description and setup instructions
- Initialize the full folder structure listed above (empty files are fine)
- Run `prisma migrate dev --name init` and commit the migration
- Confirm `pnpm dev` starts without errors
- Open PR to `main`

**Dependencies to install:**
```
pnpm add next react react-dom
pnpm add -D typescript @types/node @types/react @types/react-dom tailwindcss postcss autoprefixer
pnpm add next-auth@beta
pnpm add @prisma/client prisma
pnpm add @upstash/redis @upstash/ratelimit
pnpm add openai
pnpm add bcryptjs
pnpm add -D @types/bcryptjs
pnpm add zod
pnpm add clsx
```

**Success criteria:**
- `pnpm dev` starts on port 3000
- `pnpm build` completes with no errors
- Prisma schema migrated to Neon DB
- All folders/files exist (even if empty)

---

### AGENT-002: Auth System

**Branch:** `agent/002-auth`
**Doc:** `docs/AGENT-002-auth.md`

**Responsibilities:**
- Implement NextAuth v5 with Credentials provider in `src/lib/auth.ts`
- Auth flow: username + password only, no email. Passwords stored as bcrypt hashes (salt rounds: 12)
- Implement `POST /api/auth/signup` route that: validates username (alphanumeric, 3-20 chars), validates password (min 8 chars), checks username uniqueness, hashes password, creates User in DB
- Implement sign-in page at `/auth/signin` — username + password form
- Implement sign-up page at `/auth/signup` — username + password + confirm password form
- Implement `src/middleware.ts` to protect `/results` and `/compare` routes (redirect to `/auth/signin` if unauthenticated)
- Session strategy: JWT (stateless, no DB session table needed)
- On successful auth, redirect to home page
- Show clear validation error messages inline (not alerts)

**Input validation rules (use Zod):**
- Username: 3-20 chars, alphanumeric + underscores only, no spaces
- Password: 8+ chars, at least one number
- All inputs sanitized before DB write

**Success criteria:**
- User can sign up with username + password
- User can sign in and receive a session cookie
- Protected routes redirect to sign-in if not authenticated
- Duplicate username returns a clear error
- Wrong password returns a clear error (do not specify which field is wrong for security)

---

### AGENT-003: Benchmark Data Pipeline

**Branch:** `agent/003-benchmark-pipeline`
**Doc:** `docs/AGENT-003-benchmark-pipeline.md`

**Responsibilities:**
- Implement four data fetchers in `src/lib/benchmarkSources/`
- Implement the orchestrator in `src/lib/benchmarkSources/index.ts`
- Implement the cron endpoint at `POST /api/cron/refresh-benchmarks`
- Configure Vercel Cron to run this endpoint nightly at 2am UTC in `vercel.json`
- Normalize all source data into the `BenchmarkScore` DB schema
- Implement upsert logic (update if exists, insert if not)

**Data Sources and Fetch Strategy:**

**1. Artificial Analysis (`artificialAnalysis.ts`)**
- Target URL: `https://artificialanalysis.ai` — inspect network tab for their JSON data endpoints (look for `/api/` or chart data endpoints returning model arrays)
- Fallback: scrape their HTML table if no clean JSON endpoint found
- Dimensions to capture: quality score, tokens/sec (speed), cost ($/1M tokens), context window
- Map to DB dimensions: `overall`, `speed`, `cost_efficiency`

**2. LMSYS Arena (`lmsysArena.ts`)**
- Source: Hugging Face dataset `lmsys/chatbot_arena_leaderboard` via HF datasets API
- URL pattern: `https://huggingface.co/datasets/lmsys/chatbot_arena_leaderboard/resolve/main/elo_results.json`
- Dimension to capture: ELO rating
- Map to DB dimension: `overall` (source: `lmsys_arena`)

**3. HF Open LLM Leaderboard (`hfLeaderboard.ts`)**
- Source: HF Spaces API for `open-llm-leaderboard`
- Dimensions: Average score, ARC, HellaSwag, MMLU, TruthfulQA, Winogrande, GSM8K
- Map to DB dimensions: `reasoning` (MMLU), `math` (GSM8K), `overall` (Average)

**4. LiveBench (`livebench.ts`)**
- Source: GitHub raw JSON from `livebench-ai/livebench` repo
- URL: `https://raw.githubusercontent.com/livebench-ai/livebench/main/livebench/data/results.json`
- Dimensions: reasoning, math, coding, instruction_following
- Map directly to matching DB dimensions

**Normalization rules:**
- All scores normalized to 0-100 scale
- ELO scores: normalize against min/max in dataset
- Percentage scores: use as-is
- Speed (tokens/sec): normalize against fastest model in dataset = 100
- Cost: invert and normalize (cheapest = 100)

**Cron endpoint security:**
```typescript
// Verify CRON_SECRET header before running
const authHeader = request.headers.get('authorization')
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return new Response('Unauthorized', { status: 401 })
}
```

**`vercel.json`:**
```json
{
  "crons": [
    {
      "path": "/api/cron/refresh-benchmarks",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Success criteria:**
- All four fetchers return normalized data without crashing (graceful error handling if source is down)
- Cron endpoint upserts data correctly into DB
- Running cron twice does not create duplicates
- At least 20 models populated in DB after first run
- Unauthorized cron call returns 401

---

### AGENT-004: DeepSeek Integration + Rate Limiting

**Branch:** `agent/004-deepseek-integration`
**Doc:** `docs/AGENT-004-deepseek-integration.md`

**Responsibilities:**
- Implement DeepSeek client in `src/lib/deepseek.ts` using OpenAI SDK with DeepSeek base URL
- Implement IP rate limiting in `src/lib/rateLimit.ts` using Upstash `@upstash/ratelimit`
- Implement `POST /api/recommend` endpoint
- Implement `POST /api/compare` endpoint
- Implement `src/lib/scoring.ts` for weighted dimension scoring

**DeepSeek Task Interpreter (`src/lib/deepseek.ts`):**

System prompt (hardcoded, never user-configurable):
```
You are a strict LLM task classifier. Your ONLY job is to analyze a user's task description and output a JSON object mapping task dimensions to importance weights.

You must REFUSE any request that is not a description of a task someone wants to use an LLM for.

Output ONLY valid JSON. No preamble, no explanation, no markdown. Example output:
{
  "dimensions": {
    "reasoning": 0.8,
    "coding": 0.3,
    "math": 0.1,
    "instruction_following": 0.6,
    "overall": 0.5,
    "speed": 0.2,
    "cost_efficiency": 0.4
  },
  "summary": "Two-sentence plain-English explanation of why these weights were chosen",
  "refused": false
}

If the input is not a task description for LLM selection, return:
{ "refused": true, "reason": "brief reason" }

All weight values must be between 0.0 and 1.0.
```

User prompt: `"Task: {userInput}"` (cap userInput at 500 characters before sending)

Model to use: `deepseek-chat` (V3, cheapest, sufficient for classification)
Max tokens: 300

**Rate Limiting (`src/lib/rateLimit.ts`):**
- Use Upstash sliding window: 5 requests per 60 minutes per IP
- Extract IP from `x-forwarded-for` header (Vercel sets this)
- If rate limited, return HTTP 429 with `{ error: "Rate limit exceeded. Try again later." }`

**Scoring Logic (`src/lib/scoring.ts`):**
```
For each model in DB:
  weightedScore = sum over dimensions of (dimensionWeight * normalizedBenchmarkScore)
  normalized by total weight
  
Sort models by weightedScore descending
Return top N models with their scores and the source benchmarks used
```

**`POST /api/recommend` spec:**
```
Request:  { task: string (max 500 chars) }
Response: {
  taskSummary: string,
  dimensions: Record<string, number>,
  recommendations: Array<{
    rank: number,
    model: { name, provider, contextWindow, costInputPer1M, costOutputPer1M },
    score: number,
    benchmarksUsed: Array<{ source, dimension, score }>
  }>
}
```

**`POST /api/compare` spec:**
```
Request:  { task: string, modelNames: string[] (2-5 models) }
Response: {
  taskSummary: string,
  dimensions: Record<string, number>,
  models: Array<{
    name: string,
    provider: string,
    scores: Record<dimension, number>,
    weightedScore: number,
    costInputPer1M: number | null,
    contextWindow: number | null
  }>
}
```

**Error handling:**
- If DeepSeek returns `refused: true`, return HTTP 400 with the reason
- If DeepSeek API call fails, return HTTP 503 with a retry message
- Log all errors to console with timestamp and IP (no PII)

**Success criteria:**
- Task description returns valid dimension weights from DeepSeek
- Off-topic input (e.g. "write me a poem") is refused with HTTP 400
- 6th request from same IP within 60 minutes returns 429
- Recommend endpoint returns ranked models
- Compare endpoint returns side-by-side data for 2-5 models

---

### AGENT-005: Model Comparison Feature

**Branch:** `agent/005-comparison`
**Doc:** `docs/AGENT-005-comparison.md`

**Responsibilities:**
- Implement `ModelSelector.tsx` — a multi-select UI component for picking 2-5 models
- Implement `ComparisonTable.tsx` — renders side-by-side benchmark scores per model for the given task
- Implement the `/compare` page that:
  1. Shows the task description the user entered (passed via URL param or session state)
  2. Shows `ModelSelector` pre-populated with top 5 recommended models (but user can change)
  3. On submit, calls `POST /api/compare` and renders `ComparisonTable`
- Model selector must support search/filter by name
- Comparison table must show:
  - Each selected model as a column
  - Each task-relevant dimension as a row
  - Scores color-coded (green = high, yellow = mid, red = low)
  - Weighted overall score highlighted at the top
  - Cost and context window as additional rows
  - A "winner" badge on the highest-scoring model column

**UX rules:**
- Minimum 2 models required to submit comparison
- Maximum 5 models allowed (enforce in UI and API)
- If a model has no data for a dimension, show "N/A" not a zero
- Table must be horizontally scrollable on mobile

**Success criteria:**
- User can select 2-5 models from search-filtered list
- Comparison table renders correctly for all selected models
- Winner badge appears on correct model
- Table is readable on a 375px-wide screen

---

### AGENT-006: Frontend UI

**Branch:** `agent/006-frontend`
**Doc:** `docs/AGENT-006-frontend.md`

**Responsibilities:**
- Implement all pages and components per the folder structure
- Design aesthetic: clean, dark-mode-first, minimal. Think tool, not marketing site. No gradients, no purple. Use a monospace font for model names and scores.
- Implement `NavBar.tsx` with: logo ("which-model"), sign-in/sign-up links (if logged out), username + sign-out (if logged in)
- Implement home page (`/`) with:
  - Large `TaskInput` text area with placeholder "Describe what you need an LLM to do..."
  - Character counter (500 max)
  - Submit button ("Find Best Models")
  - Below input: toggle to "Compare specific models" which expands `ModelSelector`
  - Loading state during API call (spinner + "Analyzing your task...")
- Implement results page (`/results`) with:
  - Task summary from DeepSeek at top
  - Dimension weights shown as a horizontal bar chart (CSS only, no chart library)
  - `RankingList` showing top 10 models with `ModelCard` for each
  - Each `ModelCard` shows: rank, model name, provider, weighted score, top 3 benchmark sources, cost, context window
  - Button: "Compare top models" pre-selects top 3 into comparison
- Implement `/compare` page (per AGENT-005 spec)
- Implement `/auth/signin` and `/auth/signup` pages (clean, centered card layout)
- `BenchmarkBadge.tsx`: pill showing source name + score, color-coded by source
- All forms use controlled inputs (no HTML form submit, use onClick handlers)
- Error states: inline red text below the field or API error banner at top of page
- All pages fully responsive (mobile-first)

**Font choices:**
- Display/headings: `IBM Plex Mono` (Google Fonts)
- Body: `Inter` (acceptable here as it fits the tool aesthetic)
- Model names + scores: `IBM Plex Mono`

**Color palette (CSS variables in `globals.css`):**
```css
:root {
  --bg: #0a0a0a;
  --surface: #141414;
  --border: #262626;
  --text-primary: #f5f5f5;
  --text-secondary: #888888;
  --accent: #e5ff47;       /* sharp yellow-green for CTAs */
  --green: #4ade80;
  --yellow: #fbbf24;
  --red: #f87171;
}
```

**Success criteria:**
- All pages render without console errors
- Home page submits task and navigates to results
- Results page shows ranked models
- Mobile layout functional at 375px
- Auth pages functional (connect to AGENT-002 routes)

---

### AGENT-007: QA + Testing

**Branch:** `agent/007-qa`
**Doc:** `docs/AGENT-007-qa.md`

**Responsibilities:**
- Write unit tests for: `scoring.ts`, `rateLimit.ts`, `deepseek.ts` (mock API calls), all Zod validators
- Write integration tests for: `/api/recommend`, `/api/compare`, `/api/auth/signup`, cron endpoint
- Run full test suite and document results in `docs/AGENT-007-qa.md`
- Review all other agent PRs before merging — leave inline comments on GitHub
- Create a `docs/BUG_REPORT.md` documenting any bugs found, severity (P0/P1/P2), status (open/fixed)
- Create a `docs/QA_CHECKLIST.md` with a manual test checklist covering all user flows
- Verify: auth guard works, rate limiting fires correctly, DeepSeek refusal works, comparison requires 2+ models, cron is secured
- Final sign-off: merge all agent PRs to `main` in dependency order (001 → 002 → 003 → 004 → 005 → 006 → 007)

**Test framework:** Jest + `@testing-library/react` for component tests

**Install:**
```
pnpm add -D jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom ts-jest
```

**QA Checklist (minimum):**
- [ ] Sign up with valid credentials → success
- [ ] Sign up with duplicate username → error shown
- [ ] Sign up with invalid password → error shown
- [ ] Sign in with correct credentials → session created
- [ ] Sign in with wrong password → generic error shown
- [ ] Submit task description → results page with ranked models
- [ ] Submit off-topic text → 400 error shown to user
- [ ] Submit 6 queries in 60 min from same IP → 429 shown
- [ ] Select 2 models for comparison → comparison table renders
- [ ] Try to compare 1 model → blocked in UI
- [ ] Try to compare 6 models → blocked in UI
- [ ] Access /results without auth → redirected to sign-in
- [ ] Cron endpoint without CRON_SECRET → 401
- [ ] Mobile layout at 375px → no broken layouts

**Success criteria:**
- All unit tests pass
- All integration tests pass (or failures documented with P0/P1/P2 labels)
- QA checklist fully completed and documented
- All agent PRs reviewed and merged to main
- `pnpm build` on main passes with no errors

---

## AGENT DOCUMENTATION TEMPLATE

Each agent must create its doc file (`docs/AGENT-XXX.md`) using this template:

```markdown
# AGENT-XXX: [Name]

## Status
[ ] In Progress | [ ] Complete | [ ] Blocked

## Branch
`agent/XXX-description`

## PR Link
[link when opened]

## Responsibilities
[bullet list from spec above]

## Decisions Made
[Any architectural or implementation decisions made, with reasoning]

## Challenges Encountered
[Document any blockers, unexpected issues, or complexity]

## Files Created / Modified
[List every file touched]

## Test Results
[Paste test output or describe manual test results]

## Dependencies on Other Agents
[Which agents' work must be merged before this branch works fully]

## Open Issues
[Anything left incomplete or known bugs]
```

---

## iOS TRANSITION NOTES

These architectural decisions are made now to ease iOS migration later:

1. All business logic lives in API routes (`/api/*`) — the frontend is just a UI layer
2. API routes return clean JSON with consistent error shapes: `{ error: string }` or `{ data: ... }`
3. No server-side rendering of data — all data fetched client-side via fetch() calls to the API routes
4. Auth uses JWT stored in httpOnly cookies — React Native can use token-based auth against the same API routes
5. No UI-library dependencies (no Radix, no shadcn) — components are plain Tailwind, easy to rewrite in React Native
6. `src/types/` contains all shared TypeScript types — these port directly to a React Native codebase

---

## PR MERGE ORDER

```
agent/001-scaffolding     → main  (first, no deps)
agent/002-auth            → main  (after 001)
agent/003-benchmark-pipeline → main (after 001)
agent/004-deepseek-integration → main (after 001, 003)
agent/005-comparison      → main  (after 004)
agent/006-frontend        → main  (after 002, 004, 005)
agent/007-qa              → main  (after all others, reviews and merges all PRs)
```

---

## FINAL DELIVERABLE CHECKLIST

- [ ] `pnpm build` on `main` passes
- [ ] App deployed to Vercel
- [ ] All env vars set in Vercel dashboard
- [ ] Vercel Cron configured and tested
- [ ] README.md complete with setup instructions
- [ ] All `docs/AGENT-XXX.md` files filled in
- [ ] `docs/BUG_REPORT.md` complete
- [ ] `docs/QA_CHECKLIST.md` complete and checked off
