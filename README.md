# which-model

`which-model` helps users find the best LLM for a specific task. It combines a source-backed curated JSON catalog, server-side DeepSeek task interpretation, and deterministic weighted scoring to return ranked recommendations and side-by-side comparisons.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- NextAuth credentials auth
- Prisma with Neon Postgres
- Upstash Redis rate limiting
- DeepSeek through the OpenAI SDK
- Manual curated catalog refreshes

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
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
CRON_SECRET=
```

## Recommendation Data

Recommendations use versioned curated JSON files in `src/data/curated/` for model metadata, benchmark definitions, and scoring evidence. DeepSeek interprets the user's task, then the app applies deterministic ranking against the curated catalog so recommendation changes are reviewable and reproducible.

Refreshes are manual editorial events. Use `docs/model-catalog/2026-05-04-manual-refresh-runbook.md` to verify official provider pages, benchmark pages, JSON edits, validation commands, and Browser Use UI checks before opening a refresh PR.

## Deployment

Deploy on Vercel after linking the GitHub repository. Add the environment variables above in Vercel Project Settings. Recommendation ranking is not refreshed by a nightly live benchmark job; update the curated JSON catalog through the manual refresh runbook when provider or benchmark facts change.
