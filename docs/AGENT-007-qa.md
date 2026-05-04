# AGENT-007: QA + Testing

## Status
[ ] In Progress | [x] Complete | [ ] Blocked

## Branch
`agent/007-qa`

## PR Link
Pending

## Responsibilities
- Migrated the test framework from Vitest to Jest with TypeScript config and `@testing-library/react`.
- Wrote and verified unit tests for scoring, rate limiting, DeepSeek interpretation, exported Zod validators, and frontend components.
- Wrote and verified integration tests for `/api/recommend`, `/api/compare`, `/api/auth/signup`, auth middleware, and the cron refresh endpoint.
- Verified auth guard behavior, rate limiting, DeepSeek refusal handling, comparison minimums, and cron authorization through automated tests.
- Created `docs/BUG_REPORT.md` and `docs/QA_CHECKLIST.md`.
- Reviewed PRs #1-#6 and left one actionable PR comment for a real issue.
- Ran full required checks in the isolated AGENT-007 worktree.

## Decisions Made
- Replaced `vitest.config.ts` with `jest.config.ts` to satisfy the AGENT-007 framework requirement while preserving the no-JavaScript-config rule.
- Kept default Jest environment as `node` for API route tests and used jsdom per component test file for React Testing Library coverage.
- Removed the Vitest dev dependency after migration so `corepack pnpm test` runs the required Jest suite.
- Added a small Jest-backed `vitest` import shim so earlier-agent Vitest-style tests from PR #2 remain runnable after ordered merges.
- Added one tiny source fix after a failing test proved the compare API could return fewer actual models than requested.

## Challenges Encountered
- Jest with jsdom does not provide the same global `Request` behavior as Node route tests need, so API tests run under Node and component tests opt into jsdom.
- TypeScript treated mock-only test files as global scripts until they were marked as modules with `export {}`.
- Live browser checks that need real auth/database/DeepSeek/Redis env vars were not fully executed in this QA pass; those are marked clearly in `docs/QA_CHECKLIST.md`.

## Files Created / Modified
- `jest.config.ts`
- `package.json`
- `pnpm-lock.yaml`
- `src/app/api/compare/route.ts`
- `src/lib/validators/compare.ts`
- `tests/jest.setup.ts`
- `tests/integration/api-routes.test.ts`
- `tests/integration/auth-signup.test.ts`
- `tests/integration/cron-refresh.test.ts`
- `tests/integration/middleware-auth.test.ts`
- `tests/unit/__mocks__/styleMock.ts`
- `tests/unit/__mocks__/vitestShim.ts`
- `tests/unit/benchmark-normalization.test.ts`
- `tests/unit/benchmark-upsert.test.ts`
- `tests/unit/comparison-components.test.tsx`
- `tests/unit/deepseek.test.ts`
- `tests/unit/frontend-components.test.tsx`
- `tests/unit/rateLimit.test.ts`
- `tests/unit/scoring.test.ts`
- `tests/unit/validators.test.ts`
- `docs/AGENT-007-qa.md`
- `docs/BUG_REPORT.md`
- `docs/QA_CHECKLIST.md`
- Removed `vitest.config.ts`
- Migrated/renamed older Vitest route/component tests into Jest unit/integration coverage.

## Test Results
- `git diff --check` - passed.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - passed: 12 suites, 39 tests.
- `corepack pnpm build` - passed.

Build warnings observed:
- Next.js workspace-root inference warning because this isolated worktree is nested under the main repo and both have `pnpm-lock.yaml`.
- Existing NextAuth/Jose Edge Runtime warnings for `CompressionStream` and `DecompressionStream`.

## PR Review Results
- PR #1 AGENT-001: reviewed scaffold/config/env handling; no QA comments left.
- PR #2 AGENT-002: reviewed auth flow, Zod/bcrypt behavior, middleware scope; no QA comments left.
- PR #3 AGENT-003: reviewed benchmark normalization/upsert and cron security; no QA comments left.
- PR #4 AGENT-004: found P2 compare API gap and commented: https://github.com/vdoshi96/which-model/pull/4#issuecomment-4373778445. Fixed in this branch.
- PR #5 AGENT-005: reviewed selector/table/compare page behavior; no QA comments left.
- PR #6 AGENT-006: reviewed frontend flows, storage handoff, auth pages, and UI tests; no QA comments left.

## Dependencies on Other Agents
- AGENT-001 through AGENT-006 must merge before AGENT-007.
- Final merge order remains: #1, #2, #3, #4, #5, #6, #7.

## Open Issues
- No open P0/P1/P2 bugs found in this QA branch.
- Live end-to-end browser verification with production-like env vars remains for controller/final deployment QA.
