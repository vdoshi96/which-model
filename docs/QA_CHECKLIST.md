# QA CHECKLIST

| Check | Status | Evidence / Reason |
| --- | --- | --- |
| Sign up with valid credentials -> success | Automated pass; live manual not run | `tests/integration/auth-signup.test.ts` verifies 201, bcrypt hash with 12 rounds, and user create call. Live DB session requires configured env. |
| Sign up with duplicate username -> error shown | Automated pass; live manual not run | `tests/integration/auth-signup.test.ts` verifies 409 `Username is already taken.` UI live check requires running app with DB. |
| Sign up with invalid password -> error shown | Automated pass; live manual not run | Signup API rejects invalid inputs; frontend performs inline password validation. Live UI check requires browser session. |
| Sign in with correct credentials -> session created | Not fully live-tested | Auth implementation reviewed; live cookie/session creation requires real DB user and NextAuth env. |
| Sign in with wrong password -> generic error shown | Code-reviewed; not fully live-tested | `SignInForm` shows generic invalid credentials error; live NextAuth credential check requires DB/env. |
| Submit task description -> results page with ranked models | Automated API pass; live manual not run | `tests/integration/api-routes.test.ts` verifies ranked recommendations from mocked DeepSeek/Prisma. Live flow requires DeepSeek, DB, Redis. |
| Submit off-topic text -> 400 error shown to user | Automated pass | `tests/integration/api-routes.test.ts` verifies DeepSeek refusal returns HTTP 400 and error JSON. |
| Submit 6 queries in 60 min from same IP -> 429 shown | Automated pass | `tests/integration/api-routes.test.ts` verifies route returns 429 when rate limiter throws. Full Upstash window exercise requires Redis env. |
| Select 2 models for comparison -> comparison table renders | Automated pass | `tests/unit/comparison-components.test.tsx` verifies table rendering; route integration verifies two model comparison response. |
| Try to compare 1 model -> blocked in UI | Automated pass | `ModelSelector` and compare route tests cover minimum model guidance/API rejection. |
| Try to compare 6 models -> blocked in UI | Automated pass | Validator rejects more than five models; `ModelSelector` disables unselected options at five. |
| Access `/results` without auth -> redirected to sign-in | Automated pass | `tests/integration/middleware-auth.test.ts` verifies 307 redirect with callback URL. |
| Cron endpoint without `CRON_SECRET` -> 401 | Automated pass | `tests/integration/cron-refresh.test.ts` verifies missing/wrong bearer token returns 401. |
| Mobile layout at 375px -> no broken layouts | Not fully live-tested | Component tests verify mobile scroll classes for comparison table. Visual browser pass remains needed. |

## Required Check Commands
- `git diff --check` - passed.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - passed: 12 suites, 39 tests.
- `corepack pnpm build` - passed with known warnings documented in `docs/AGENT-007-qa.md`.
