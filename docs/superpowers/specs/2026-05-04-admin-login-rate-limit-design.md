# Admin Login And Authenticated Query Gate Design

## Status
Approved for implementation by the user on 2026-05-04 via request to plan and implement the feature with Superpowers.

## Goal
Require login before any model question can be submitted, add a built-in `admin` login with password `Codex123!`, and bypass hourly query limits for authenticated admin sessions.

## Architecture
The existing NextAuth credentials flow remains the single authentication mechanism. `src/lib/auth.ts` adds a server-only built-in admin identity before database lookup, marks admin JWT/session state with `isAdmin`, and keeps normal username/password users backed by Prisma.

The public signup route reserves the `admin` username so a database-backed user cannot shadow or confuse the built-in admin login.

API routes become the source of truth for asking questions. `POST /api/recommend` and `POST /api/compare` call `auth()` before validation-sensitive work, reject unauthenticated requests with HTTP 401, and rate-limit normal sessions by a composite key containing the user id and request IP. Admin sessions skip `assertRateLimit`, giving the current logged-in admin IP unlimited calls while the session is active.

The home route becomes auth-aware. Authenticated users keep the existing question input. Anonymous visitors see a splash screen with generated, UI-style artifacts that explain the workflow, show mock screenshots based on realistic test runs, and state that signup needs only a username and password.

## Components
- `src/lib/auth.ts`: recognizes the built-in admin credentials, propagates `isAdmin` into JWT and session.
- `src/types/next-auth.d.ts`: adds `isAdmin` to session, user, and JWT types.
- `src/lib/rateLimit.ts`: builds stable user+IP limit keys and preserves IP extraction.
- `src/app/api/auth/signup/route.ts`: prevents public signup with the reserved `admin` username.
- `src/app/api/recommend/route.ts`: requires auth, bypasses quota for admin, logs normal user ids.
- `src/app/api/compare/route.ts`: mirrors recommend route auth/rate-limit behavior.
- `src/app/page.tsx`: renders the authenticated question form or anonymous splash artifacts.
- `src/components/SplashScreen.tsx`: contains reusable visual instructions and mock result artifacts.

## Data Flow
1. Anonymous visitor lands on `/` and sees only instructions, signup/signin links, and generated mock artifacts.
2. Visitor signs up with username/password only, or signs in as `admin` / `Codex123!`.
3. Authenticated user submits from `/` or compare/results flows.
4. API route obtains the session using `auth()`.
5. If no session exists, the route returns `{ error: "Sign in to ask questions." }` with status 401.
6. If `session.user.isAdmin` is true, DeepSeek/scoring proceeds without rate limiting.
7. Otherwise the route limits `user:{session.user.id}:ip:{ipAddress}` to 5 requests per 60 minutes.

## Error Handling
- Auth failures return 401 before DeepSeek or Prisma model work.
- Normal rate-limit failures keep the existing public 429 message.
- Rate-limit infrastructure failures keep the existing 503 behavior.
- Invalid request bodies still return 400 without consuming rate-limit quota.

## Testing
- Unit tests cover admin credential authorization, admin type propagation, and user+IP limit key construction.
- Integration route tests cover unauthenticated 401, normal user+IP rate-limit key usage, admin rate-limit bypass, and query logging user ids.
- Middleware tests keep `/results` and `/compare` protected while leaving `/` public for the splash.
- Frontend component tests verify the splash communicates username/password-only signup and renders mock artifacts.
