# Admin Login And Authenticated Query Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require login before model questions, add the built-in `admin` / `Codex123!` login, and give admin sessions unlimited API calls while normal users keep a 5-per-hour user+IP quota.

**Architecture:** NextAuth remains the auth boundary. API routes call `auth()` directly, rate limiting uses a user+IP key, and the home page chooses between an authenticated task input and an anonymous instructional splash.

**Tech Stack:** TypeScript, Next.js App Router, NextAuth v5 Credentials, Prisma, Upstash Ratelimit, React, Tailwind CSS, Jest, Testing Library.

---

### Task 1: Auth And Rate Limit Contracts

**Files:**
- Modify: `src/lib/auth.ts`
- Modify: `src/types/next-auth.d.ts`
- Modify: `src/lib/rateLimit.ts`
- Modify: `src/app/api/auth/signup/route.ts`
- Test: `tests/unit/rateLimit.test.ts`
- Test: `tests/integration/auth-admin.test.ts`
- Test: `tests/integration/auth-signup.test.ts`

- [ ] **Step 1: Write failing tests**

Add tests proving `buildRateLimitKey("user_1", "203.0.113.10")` returns `user:user_1:ip:203.0.113.10`, normal rate limiting passes that key to Upstash, `admin` with `Codex123!` authorizes, wrong admin passwords fail, and public signup rejects the reserved `admin` username.

- [ ] **Step 2: Verify red**

Run: `corepack pnpm exec jest tests/unit/rateLimit.test.ts tests/integration/auth-admin.test.ts tests/integration/auth-signup.test.ts --runInBand`

Expected: FAIL because `buildRateLimitKey`, admin auth support, and reserved username handling do not exist.

- [ ] **Step 3: Implement minimal auth/rate-limit code**

Add a built-in admin credentials branch in `src/lib/auth.ts`, propagate `isAdmin` in JWT/session callbacks, add type declarations, add `buildRateLimitKey` while keeping the existing Upstash limiter, and reserve `admin` in the signup route.

- [ ] **Step 4: Verify green**

Run: `corepack pnpm exec jest tests/unit/rateLimit.test.ts tests/integration/auth-admin.test.ts tests/integration/auth-signup.test.ts --runInBand`

Expected: PASS.

### Task 2: API Auth Gate And Admin Bypass

**Files:**
- Modify: `src/app/api/recommend/route.ts`
- Modify: `src/app/api/compare/route.ts`
- Test: `tests/integration/api-routes.test.ts`

- [ ] **Step 1: Write failing route tests**

Extend route tests to prove unauthenticated requests return 401 before rate-limit or DeepSeek calls, normal users call `assertRateLimit("user:user_1:ip:203.0.113.10")`, admin users skip `assertRateLimit`, and successful query logs include `userId` for normal users.

- [ ] **Step 2: Verify red**

Run: `corepack pnpm exec jest tests/integration/api-routes.test.ts --runInBand`

Expected: FAIL because routes do not call `auth()` and still rate-limit by IP only.

- [ ] **Step 3: Implement minimal route changes**

Import `auth`, reject missing sessions with a shared 401 response, build user+IP keys for normal users, skip rate limiting for admin sessions, and add `userId` when creating query records for normal users.

- [ ] **Step 4: Verify green**

Run: `corepack pnpm exec jest tests/integration/api-routes.test.ts --runInBand`

Expected: PASS.

### Task 3: Home Splash And Existing Protected Routes

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/SplashScreen.tsx`
- Test: `tests/unit/frontend-components.test.tsx`
- Test: `tests/unit/home-page.test.tsx`
- Test: `tests/integration/middleware-auth.test.ts`

- [ ] **Step 1: Write failing UI and middleware tests**

Add tests proving the splash says no email is required, shows mock test-run artifacts, and middleware keeps `/results` and `/compare` protected while leaving `/` public for the splash.

- [ ] **Step 2: Verify red**

Run: `corepack pnpm exec jest tests/unit/frontend-components.test.tsx tests/integration/middleware-auth.test.ts --runInBand`

Expected: FAIL because `SplashScreen` does not exist and the home page still renders the question form for anonymous visitors.

- [ ] **Step 3: Implement UI and middleware**

Render `<TaskInput />` only for authenticated home sessions, render `<SplashScreen />` otherwise, and keep the existing middleware protection for `/results` and `/compare`.

- [ ] **Step 4: Verify green**

Run: `corepack pnpm exec jest tests/unit/frontend-components.test.tsx tests/integration/middleware-auth.test.ts --runInBand`

Expected: PASS.

### Task 4: Full Verification

**Files:**
- Verify all changed files.

- [ ] Run `corepack pnpm exec jest --runInBand`.
- [ ] Run `corepack pnpm typecheck`.
- [ ] Run `git diff --check`.
- [ ] Review the diff for unrelated changes before reporting completion.

## Self-Review
- Spec coverage: Auth-required questions, admin credentials, admin unlimited calls, user+IP quota, splash instructions, and mock artifacts are all mapped to tasks.
- Placeholder scan: No unresolved placeholders remain.
- Type consistency: `isAdmin`, `buildRateLimitKey`, route paths, and test command names are consistent across tasks.
