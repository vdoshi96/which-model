# Manual Curated Catalog Refresh Runbook

Date: 2026-05-04

Use this runbook when refreshing recommendation data. Recommendations now come from the curated JSON catalog and deterministic ranking code, not from a nightly live ranking refresh.

## Scope

- Update `src/data/curated/models.json` for model metadata, pricing, context windows, status, aliases, and source notes.
- Update `src/data/curated/benchmark-definitions.json` when adding or revising benchmark definitions.
- Update `src/data/curated/sources.json` when adding a new benchmark/provider source or when an existing source adds leaderboard pages, tabs, filters, category options, rank views, score ranges, pricing ranges, or context ranges.
- Update `src/data/curated/scores.json` when adding or revising source-backed benchmark or prior scores.
- Keep changes small enough that reviewers can trace each data edit back to a source.

## Browser Use Setup Reminder

- Start from a clean working tree view with only the intended refresh files changed.
- Use Browser Use for source research and UI verification so the viewed pages and app paths are explicit.
- Keep source tabs grouped by provider docs, pricing docs, model docs, and benchmark pages.
- Capture screenshots or copied visible page facts when a value is likely to be questioned in review.
- Record every consulted URL in the source note for the affected row.

## Official Provider Pages Checklist

- Open the provider's official model list or model overview page.
- Open the official pricing page for token input/output prices.
- Open the official context-window or model-card page when context is not shown on the pricing page.
- Open official deprecation, retirement, or migration pages before changing model status.
- Confirm whether pricing is standard, batch, cache, prompt-length tiered, regional, hosted, preview, or enterprise-only.
- Confirm model IDs and aliases from official API docs, not only marketing names.
- Prefer stable public docs over blog posts unless a launch post is the only official source.
- Add or update `lastVerified` with the refresh date for every row touched.

## Benchmark Pages Checklist

- Open the benchmark's official leaderboard or release page.
- For Arena.ai, start at `https://arena.ai/leaderboard`, then inspect each dedicated leaderboard page under the overview: Text, Code, Vision, Document, Search, Text to Image, Image Edit, Text to Video, Image to Video, and Video Edit.
- Confirm the benchmark name, category, score scale, date, and whether higher scores are better.
- Capture page-level options in `sources.json` before extracting scores: ranking/pareto views when present, model/lab rank-by tabs, source category labels, downstream benchmark applicability, hidden category counts, license filters, score ranges, price ranges, and context ranges when exposed.
- Check whether the row is exact, estimated, or a catalog prior.
- Capture the model display name exactly as the benchmark presents it, then map it to the catalog model ID.
- Record benchmark limitations when they affect interpretation.
- Do not use benchmark evidence for a category it does not directly measure.
- Keep creative, coding, reasoning, tool-use, long-context, speed, and cost-efficiency evidence separate.

## Source Note Template

Use this template in refresh notes or PR descriptions for each material data change:

```markdown
### <model or benchmark id>

- Changed fields:
- Previous value:
- New value:
- Source URLs:
- Visible source facts:
- Accessed on:
- Notes and caveats:
- Reviewer focus:
```

## JSON Edit Checklist

- Edit JSON with stable ordering and trailing-comma-free syntax.
- Keep model IDs stable unless the provider changed the canonical API ID.
- Add aliases for common provider names, API IDs, and benchmark display names.
- Keep `status`, `provider`, `contextWindow`, pricing fields, and `lastVerified` consistent with the source notes.
- Use `sources.json` to store page structure and extraction options. Source pages should keep stable page IDs, URLs, page stats, filters, option counts, and notes about hidden or grouped options.
- Use `benchmark-definitions.json` for benchmark meaning and limitations.
- Use `scores.json` only for scores that can be traced to a benchmark, source-backed derived value, or clearly labeled catalog prior.
- Avoid silent deletes. If removing a model or score, explain why in the refresh notes and PR checklist.
- Re-run validation after every meaningful batch of JSON edits.

## Validation Commands

Run these from the repository root:

```bash
corepack pnpm typecheck
corepack pnpm jest --runInBand
corepack pnpm build
git diff --check
```

If the refresh is intentionally docs-only, record that app tests were not run and why. For data changes, all commands above should pass before review.

## Browser Use UI Verification Steps

1. Start the app with `corepack pnpm dev`.
2. Open `/` and confirm the home page loads without an error overlay.
3. Open `/results?task=write+a+song` and confirm recommendations render with evidence, cost/context metadata, and no runtime errors.
4. Open `/results?task=build+a+coding+agent` and confirm coding-oriented recommendations render with evidence and no runtime errors.
5. Open `/compare?models=GPT-5.5%2CClaude+Opus+4.7&task=write+a+song` and confirm compare metadata, scores, and missing-evidence notes render coherently.
6. Check the browser console for errors on each path.
7. If a page depends on auth or environment values, note the account/environment used in the PR.

## PR Checklist

- The PR title identifies the refresh date and scope.
- The PR summary lists changed providers, model families, benchmark IDs, and affected categories.
- Each changed price, context window, status, model ID, alias, or benchmark score links to an official source or named benchmark page.
- The PR explains any catalog prior changes and why they are appropriate.
- The PR calls out removed rows or scores.
- The PR includes validation command results.
- The PR includes Browser Use path verification results.
- The PR includes residual risks, especially volatile pricing, preview model details, and benchmark coverage gaps.
- The PR is reviewed before merge; manual refreshes should not silently change ranking behavior without review.
