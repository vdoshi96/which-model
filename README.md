# which-model

`which-model` helps users choose the best LLM from the models they can actually use. Users select provider groups or individual models, describe the task, and receive three scoped recommendations: best model no holds barred, best balance of quality and cost, and a cheap model that should still do a decent job.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- NextAuth credentials auth
- Prisma with Neon Postgres
- Upstash Redis rate limiting
- DeepSeek through the OpenAI SDK
- Weekly benchmark refresh cache with curated catalog fallback

## Local Setup

1. Install dependencies:

   ```bash
   corepack pnpm install
   ```

2. Create `.env.local` from `.env.example` and fill in the private values:

   ```bash
   cp .env.example .env.local
   ```

3. Generate Prisma Client:

   ```bash
   corepack pnpm prisma:generate
   ```

4. Run migrations when `DATABASE_URL` points at Neon. Prisma CLI reads `.env`, so keep your ignored local `.env` copy synced with `.env.local` before running this:

   ```bash
   cp .env.local .env
   corepack pnpm prisma:migrate -- --name init
   ```

5. Start the dev server:

   ```bash
   corepack pnpm dev
   ```

## Environment Variables

Only `.env.example` is committed. Never commit `.env` or `.env.local`.

```env
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
ADMIN_PASSWORD=
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=
ARTIFICIAL_ANALYSIS_API_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
CRON_SECRET=
QUERY_LOG_SALT=
QUERY_LOG_RETENTION_DAYS=30
```

`ADMIN_PASSWORD` must be explicitly set to enable the built-in `admin` account; there is no fallback password. Query audit logs store task/IP hashes and compact result metadata, with `QUERY_LOG_RETENTION_DAYS` controlling the retention window.

## Recommendation Data

Recommendations use an effective catalog made from two layers:

- Versioned curated JSON files in `src/data/curated/` for stable model metadata, benchmark definitions, and editorial priors.
- Weekly refreshed benchmark rows in Postgres, populated by `/api/cron/refresh-benchmarks`, including Artificial Analysis API data when `ARTIFICIAL_ANALYSIS_API_KEY` is configured.

DeepSeek interprets the user's task into benchmark weights, then deterministic ranking is run only against the user's selected provider/model scope. Refreshed DB rows are merged into the effective catalog so new models and scores can appear without a code change; curated JSON remains the reviewable fallback. Artificial Analysis data requires attribution to [artificialanalysis.ai](https://artificialanalysis.ai/).

Manual refreshes are still useful for source-backed editorial updates. Use `docs/model-catalog/2026-05-04-manual-refresh-runbook.md` when changing curated JSON.

## Deployment

Deploy on Vercel after linking the GitHub repository. Add the environment variables above in Vercel Project Settings. Vercel Cron runs the benchmark refresh weekly on Monday at 02:00 UTC; curated JSON can still be updated manually when provider facts or editorial priors need review.
