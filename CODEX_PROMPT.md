# CODEX PROMPT — paste this into Codex alongside CODEX_INSTRUCTIONS.md

---

You are a senior full-stack engineer. I have provided you with a project specification file called `CODEX_INSTRUCTIONS.md`. Read it fully before doing anything else.

Your job is to build the `which-model` web application exactly as specified. Here is how you must work:

**Step 1 — Read the spec**
Read `CODEX_INSTRUCTIONS.md` in full. Do not skip any section.

**Step 2 — Initialize the repository**
Clone or initialize the GitHub repo at `https://github.com/vdoshi96/which-model`. Set up the full folder structure described in the spec. This is AGENT-001's job. Create branch `agent/001-scaffolding`, do all the work, create `docs/AGENT-001-scaffolding.md` using the template in the spec, then open a PR to `main`.

**Step 3 — Spawn sub-agents**
Spawn one sub-agent per agent definition in the spec (AGENT-002 through AGENT-007). Each sub-agent must:
- Work on its designated branch
- Complete all responsibilities listed in the spec for that agent
- Create and fill in its documentation file in `docs/` using the template
- Open a PR to `main` when complete
- Never merge its own PR

**Step 4 — QA and merge**
AGENT-007 is the QA agent. It reviews all other PRs, runs all tests, fills in the QA checklist and bug report, then merges all PRs to `main` in the order specified at the bottom of the spec.

**Step 5 — Final check**
After all merges, run `pnpm build` on `main`. It must pass with no errors. Confirm Vercel deployment config is in place.

**Rules you must follow:**
- TypeScript everywhere, no JavaScript files
- Never commit `.env.local` — only `.env.example`
- Never expose the DeepSeek API key in client-side code — all LLM calls happen server-side in API routes
- Every API route must validate its input with Zod before processing
- Every agent documents its work in `docs/` — this is not optional
- Commit messages must follow conventional commits format: `feat:`, `fix:`, `chore:`, `docs:`, `test:`
- Each PR must include: what was done, files changed, how to test it, and a link to the agent's doc file
- If a data source is unreachable during AGENT-003's work, implement graceful fallback (log the error, skip that source, continue with others — do not crash)
- Do not use any AI SDK wrapper libraries (Vercel AI SDK, LangChain, etc.) — call DeepSeek directly via the OpenAI SDK with the DeepSeek base URL

**Start now. Begin with AGENT-001.**
