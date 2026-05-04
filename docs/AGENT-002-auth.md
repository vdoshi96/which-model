# AGENT-002: Auth System

## Status
[x] In Progress | [ ] Complete | [ ] Blocked

## Branch
`agent/002-auth`

## PR Link
Pending until PR is opened.

## Responsibilities
- Implement NextAuth v5 Credentials provider for username/password auth.
- Store bcrypt password hashes with salt rounds 12.
- Add validated `POST /api/auth/signup` with duplicate username handling.
- Add controlled sign-in and sign-up forms with inline validation errors.
- Protect `/results` and `/compare` with middleware redirects to `/auth/signin`.
- Use JWT sessions, not database sessions.
- Add focused auth validator and signup route tests where practical.

## Decisions Made
- Centralized auth input validation in `src/lib/validators/auth.ts` so the API, NextAuth authorize callback, and client forms share the same username/password rules.
- Usernames are sanitized with `trim()` before lookup or persistence; passwords are not trimmed or otherwise mutated.
- Signup returns structured `fieldErrors` for validation failures and a clear duplicate username message. Sign-in keeps credential failures generic as `Invalid username or password.`
- Signup signs the new user in through the Credentials provider after successful account creation, then redirects home.
- Middleware uses JWT token lookup for `/results` and `/compare` and preserves the original URL as a same-origin callback target.
- Added Vitest for focused AGENT-002 tests because the scaffold test script was a placeholder and AGENT-007's broader Jest setup has not landed yet.

## Challenges Encountered
- The isolated worktree lives below the shared checkout, so `next build` warns that it sees multiple lockfiles and infers the outer repository as the tracing root.
- A patch tool invocation initially targeted the shared checkout before switching to absolute paths for this isolated worktree. No further writes were made there from this workstream.

## Files Created / Modified
- `package.json`
- `pnpm-lock.yaml`
- `vitest.config.ts`
- `src/lib/auth.ts`
- `src/lib/validators/auth.ts`
- `src/app/api/auth/signup/route.ts`
- `src/components/SignInForm.tsx`
- `src/components/SignUpForm.tsx`
- `tests/unit/authValidators.test.ts`
- `tests/integration/signupRoute.test.ts`
- `docs/AGENT-002-auth.md`

## Test Results
- `corepack pnpm lint` - passed (`tsc --noEmit`)
- `corepack pnpm typecheck` - passed (`tsc --noEmit`)
- `corepack pnpm test` - passed (2 files, 8 tests)
- `corepack pnpm build` - passed
- `git diff --check` - passed
- Build warning: multiple lockfiles due nested worktree path.

## Dependencies on Other Agents
- Depends on AGENT-001 scaffolding for Next.js, Prisma schema, base auth files, and dependencies.
- AGENT-006 may refine visual styling/navigation around the auth pages.
- AGENT-007 should add broader end-to-end auth QA and review this PR before merge.

## Open Issues
- No known AGENT-002 blocking issues.
- Manual browser verification of cookie creation and protected-route redirects remains for QA.
