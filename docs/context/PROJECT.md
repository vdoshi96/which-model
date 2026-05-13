# Project Context

`which-model` helps users choose an LLM for a specific task from the providers and models they can actually access.

Core workflow:

1. User selects provider groups, individual models, or both.
2. User describes the task in natural language.
3. DeepSeek maps the task to benchmark-weight dimensions.
4. The backend ranks only the selected candidate scope and returns three recommendations: best quality, best balance, and budget/decent.
5. Users can inspect ranking evidence, costs, context windows, and compare models.

Stack:

- Next.js App Router, React, TypeScript, Tailwind CSS.
- NextAuth credentials auth.
- Prisma/Postgres for users, query audit logs, and refreshed benchmark cache.
- Upstash Redis for rate limiting.
- DeepSeek via OpenAI-compatible SDK for task interpretation.
- Vercel Cron for weekly benchmark refresh.

External benchmark data:

- Curated JSON in `src/data/curated/` provides stable baseline metadata and priors.
- Weekly refreshes populate DB rows through `src/lib/benchmarkSources/`.
- Artificial Analysis API can provide benchmark, pricing, provider, speed, and latency data when `ARTIFICIAL_ANALYSIS_API_KEY` is configured.

Constraints:

- Recommendation output must be constrained to the user's selected providers/models.
- Refreshed data should augment, not replace, curated fallback coverage.
- Task text and IPs are logged only as salted hashes through the query audit path.
