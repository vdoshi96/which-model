# Decisions

## 2026-05-13: Scoped Recommendations

Recommendation candidates are restricted to the user-selected provider/model scope. Provider groups and individual models are a union, so selecting `OpenAI` plus `DeepSeek V4 Pro` means any OpenAI model or that specific DeepSeek model.

Rationale: users are asking "which of my available models should I use," not "which model on the internet is best."

## 2026-05-13: Three Recommendation Modes

The API returns three slots for each task:

- `no_holds_barred`: highest quality/task fit, cost ignored.
- `balanced`: task fit with cost efficiency included.
- `budget`: cheapest practical model above a quality floor.

Rationale: this maps directly to the user's requested decision styles and avoids forcing one blended score to answer three different buying questions.

## 2026-05-13: Effective Catalog

Recommendations use curated JSON plus live DB benchmark rows from the refresh cache. Curated JSON remains the stable fallback; refreshed rows add new models and measured scores.

Rationale: weekly autonomous ingestion should affect the app without requiring a code deploy, but curated priors and metadata still provide reviewable coverage.

## 2026-05-13: Weekly Refresh

Vercel Cron runs `/api/cron/refresh-benchmarks` weekly instead of daily. The route is protected by `CRON_SECRET`.

Rationale: benchmark and pricing movement matters, but this app does not need to hit third-party sources for every user query.
