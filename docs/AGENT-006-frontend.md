# AGENT-006: Frontend UI

## Status
[ ] In Progress | [x] Complete | [ ] Blocked

## Branch
`agent/006-frontend`

## PR Link
Pending

## Responsibilities
- Implemented the dark-mode-first frontend surface using the required CSS variables, Inter body font, and IBM Plex Mono for headings, model names, and scores.
- Implemented the home task input flow with a 500-character controlled textarea, exact placeholder text, loading spinner text, inline errors, and optional "Compare specific models" selector expansion.
- Implemented the results page with DeepSeek task summary, CSS-only dimension weight bars, top-10 ranking cards, benchmark badges, and "Compare top models" navigation.
- Polished the AGENT-005 compare page while preserving task/model URL and storage compatibility.
- Polished auth sign-in/sign-up screens with controlled inputs, centered card layout, inline red validation/API errors, and no alert/form-submit behavior.
- Implemented auth-aware NavBar display with sign-in/sign-up links when logged out and username plus sign-out when logged in.
- Added focused frontend component tests for benchmark badges, model cards, and top-10 ranking behavior.

## Decisions Made
- Recommendation payloads are cached in `sessionStorage` under `which-model:last-recommendation` so `/results?task=...` can render immediately after home submission without server-side page data rendering.
- Top model names and the task are also mirrored into `localStorage` using AGENT-005's comparison keys so `/compare` can preselect models from either results or the home compare toggle.
- Home still uses the required "Find Best Models" button text. If compare mode already has at least two selected models, the click routes directly to `/compare`; otherwise it fetches `/api/recommend` and routes to `/results`.
- Results and compare remain protected by the existing middleware from AGENT-002. Unauthenticated direct visits redirect to sign-in.

## Challenges Encountered
- The app has no `/api/models` endpoint, so the home compare selector can only offer previously recommended models from local/session storage.
- Local dev smoke testing direct `/results` and `/compare` requests returns 307 to sign-in when logged out due to the existing auth guard.
- `next build` still emits the known workspace-root and NextAuth/Jose Edge Runtime warnings documented by AGENT-005; the build exits successfully.

## Files Created / Modified
- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/app/page.tsx`
- `src/app/results/page.tsx`
- `src/app/compare/page.tsx`
- `src/components/BenchmarkBadge.tsx`
- `src/components/ModelCard.tsx`
- `src/components/NavBar.tsx`
- `src/components/RankingList.tsx`
- `src/components/SignInForm.tsx`
- `src/components/SignOutButton.tsx`
- `src/components/SignUpForm.tsx`
- `src/components/TaskInput.tsx`
- `src/components/ui/Badge.tsx`
- `src/components/ui/Button.tsx`
- `tests/unit/frontend-components.test.ts`
- `docs/AGENT-006-frontend.md`

## Test Results
- `git diff --check` passed.
- `corepack pnpm lint` passed.
- `corepack pnpm typecheck` passed.
- `corepack pnpm test` passed: 10 files, 29 tests.
- `corepack pnpm build` passed.
- Local dev server smoke test: `corepack pnpm dev --port 3106`; `/`, `/auth/signin`, and `/auth/signup` returned 200. `/results?task=...` and `/compare?task=...&models=...` returned 307 to `/auth/signin` because the existing middleware protects those pages for logged-out users.
- React best-practices checklist completed after TSX edits: controlled inputs, native interactive elements, labels for inputs, stable keys, typed props/helpers, colocated private helpers, and design consistency reviewed.

## Dependencies on Other Agents
AGENT-002, AGENT-004, and AGENT-005.

## Open Issues
- Direct unauthenticated results/compare smoke tests redirect to sign-in by design. Full browser QA of those pages requires a signed-in session plus working backend environment variables/data.
