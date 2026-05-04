# AGENT-004: DeepSeek Integration + Rate Limiting

## Status
[ ] In Progress | [x] Complete | [ ] Blocked

## Branch
`agent/004-deepseek-integration`

## PR Link
Pending

## Responsibilities
- Implemented direct DeepSeek task interpretation via the OpenAI SDK using `deepseek-chat`, `DEEPSEEK_API_KEY`, and `DEEPSEEK_BASE_URL`.
- Added Upstash sliding-window IP rate limiting at 5 requests per 60 minutes.
- Implemented weighted scoring and comparison score shaping.
- Implemented `POST /api/recommend` and `POST /api/compare` with Zod validation, rate limiting, DeepSeek refusal handling, Prisma model queries, and query logging.
- Added focused Vitest coverage for DeepSeek parsing, validators, rate limiting, scoring, and route behavior.

## Decisions Made
- DeepSeek is called directly through `openai`; no AI SDK wrapper is used.
- The system prompt from `CODEX_INSTRUCTIONS.md` is hardcoded in `src/lib/deepseek.ts`.
- User input is capped at 500 characters before the DeepSeek request and routes validate the same limit with Zod.
- Compare responses include every known benchmark dimension and use `null` where no score is available.
- API error logs include timestamp, IP address, and error message only; task text is not logged to console.

## Challenges Encountered
- Prisma JSON input types required an explicit cast at the `Query.resultJson` persistence boundary.
- Vitest needed mocked OpenAI/Upstash/Prisma clients to avoid real network or database calls.

## Files Created / Modified
- `src/lib/deepseek.ts`
- `src/lib/rateLimit.ts`
- `src/lib/scoring.ts`
- `src/lib/validators/recommend.ts`
- `src/lib/validators/compare.ts`
- `src/app/api/recommend/route.ts`
- `src/app/api/compare/route.ts`
- `src/types/api.ts`
- `tests/unit/deepseek.test.ts`
- `tests/unit/rateLimit.test.ts`
- `tests/unit/scoring.test.ts`
- `tests/unit/validators.test.ts`
- `tests/unit/api-routes.test.ts`
- `docs/AGENT-004-deepseek-integration.md`

## Test Results
- Focused tests: `corepack pnpm vitest run tests/unit/deepseek.test.ts tests/unit/rateLimit.test.ts tests/unit/scoring.test.ts tests/unit/validators.test.ts tests/unit/api-routes.test.ts` passed.
- `git diff --check` passed.
- `corepack pnpm lint` passed.
- `corepack pnpm typecheck` passed.
- `corepack pnpm test` passed, 8 files and 21 tests.
- `corepack pnpm build` passed.

## Dependencies on Other Agents
- AGENT-001 scaffolding.
- AGENT-003 benchmark pipeline and Prisma score ingestion.

## Open Issues
- PR link pending.
- No real DeepSeek call was made; tests mock the SDK as required.
