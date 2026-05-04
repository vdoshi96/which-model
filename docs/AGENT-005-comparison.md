# AGENT-005: Model Comparison Feature

## Status
[ ] In Progress | [x] Complete | [ ] Blocked

## Branch
`agent/005-comparison`

## PR Link
Pending

## Responsibilities
- Implemented `ModelSelector` as a controlled searchable multi-select with 2-model guidance and 5-model maximum enforcement.
- Implemented `ComparisonTable` with selected models as columns, weighted score at the top, task dimensions, cost/context rows, score color coding, winner badge, N/A rendering, and horizontal mobile scrolling.
- Implemented `/compare` client flow:
  - Reads the task from `?task=` or local storage.
  - Reads optional model names from `?model=`, `?models=`, or `?modelNames=`.
  - Calls `POST /api/recommend` for the current task and preselects the top 5 model names.
  - Calls `POST /api/compare` on submit and renders the returned comparison.
- Added focused component render tests for selector and table behavior.

## Decisions Made
- There is no `/api/models` endpoint, so selectable options are derived from URL/local storage/recommendation data. For a task with no model options, `/compare` calls `/api/recommend` and uses the top 5 recommendations as both options and initial selection.
- The page stores only task text and model names in local storage. It does not store API responses with benchmark details or any secrets.
- The comparison table receives dimension weights from `/api/compare` and renders task-relevant rows plus any dimension with model data.
- Vitest needed a small `oxc.jsx` config so render-level tests can import TSX components while the project keeps `jsx: "preserve"` for Next.js.

## Challenges Encountered
- Existing Vitest setup could not import TSX components under Vite 8/Oxc with the project `tsconfig` preserving JSX. Fixed with a minimal test config update.
- No model catalog endpoint exists by design, so model discovery intentionally depends on recommendation results or model names passed into the page.

## Files Created / Modified
- `src/components/ModelSelector.tsx`
- `src/components/ComparisonTable.tsx`
- `src/app/compare/page.tsx`
- `tests/unit/comparison-components.test.ts`
- `vitest.config.ts`
- `docs/AGENT-005-comparison.md`

## Test Results
- `git diff --check` passed.
- `corepack pnpm lint` passed.
- `corepack pnpm typecheck` passed.
- `corepack pnpm test` passed: 9 files, 25 tests.
- `corepack pnpm build` passed.
- Build warning observed but not introduced by AGENT-005: Next.js workspace-root inference sees both root and worktree lockfiles; NextAuth/Jose also emits existing Edge Runtime API warnings from middleware import trace.

## Dependencies on Other Agents
- AGENT-004 `/api/recommend` and `/api/compare` endpoints.
- AGENT-004 comparison API still enforces the 2-5 model constraint server-side.

## Open Issues
- None known for AGENT-005.
