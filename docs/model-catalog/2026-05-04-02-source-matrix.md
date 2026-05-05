# Model Catalog Source Matrix

Date accessed: 2026-05-05

This file records the source policy for the curated catalog. The TypeScript catalog stores the normalized values used by the app; this document keeps the research trail readable.

## Source Policy

- Prefer official provider docs or official pricing/model pages.
- Store standard, non-batch, non-cache token prices in USD per 1M tokens.
- Where a provider lists tiered prices by prompt length, use the lowest standard tier as the display price and record the tiering in notes.
- Where a model is open weight but has no universal API price, use a named hosted provider price and include that host in the display name.
- Deprecated or retired models can be included when people still search for or compare them, but the notes must say so.
- Thinking/reasoning variants are separate catalog rows when providers expose them as separate API ids, modes, or pricing surfaces.
- During benchmark refresh, live source metadata wins for non-null context and pricing fields; catalog values fill missing fields and canonicalize names/providers.
- Catalog rows should be updated when provider docs change.
- Source structure belongs in `src/data/curated/sources.json`: page URLs, leaderboard tabs, source category labels, downstream benchmark applicability, view modes, filters, score ranges, price ranges, context ranges, page stats, and extraction caveats. Benchmark definitions should reference what a score means; the source registry should preserve how the source exposes that information.

## Benchmark Source Registries

| Source | Registered URLs | Notes |
|---|---|---|
| Arena.ai | https://arena.ai/leaderboard, https://arena.ai/leaderboard/text, https://arena.ai/leaderboard/code, https://arena.ai/leaderboard/vision, https://arena.ai/leaderboard/document, https://arena.ai/leaderboard/search, https://arena.ai/leaderboard/text-to-image, https://arena.ai/leaderboard/image-edit, https://arena.ai/leaderboard/text-to-video, https://arena.ai/leaderboard/image-to-video, https://arena.ai/leaderboard/video-edit | Arena is stored as a page-and-options source registry. The overview page exposes all leaderboard pages; dedicated pages retain source category labels, rank-by options, license filters, score ranges, vote counts, model counts, and page-specific caveats. Ranking/pareto views, price ranges, and context ranges are recorded only on pages that expose them. |

## Provider Sources

| Provider | Source URLs | Notes |
|---|---|---|
| Anthropic | https://platform.claude.com/docs/en/about-claude/pricing, https://platform.claude.com/docs/en/about-claude/models/overview, https://platform.claude.com/docs/en/about-claude/model-deprecations | Claude 4.7, 4.6, 4.5, 4.1, 4, Sonnet, Haiku, and older Claude 3 variants. Base pricing excludes caching, batch, data residency, fast mode, and tools. |
| Google Gemini | https://ai.google.dev/gemini-api/docs/pricing, https://ai.google.dev/gemini-api/docs/models, https://cloud.google.com/vertex-ai/generative-ai/pricing | Gemini API is used for current 2.5 and 2.0 prices. Vertex legacy rows are used only for older 1.5/1.0 models. |
| DeepSeek | https://api-docs.deepseek.com/quick_start/pricing/ | DeepSeek docs changed to V4 on 2026-04-26 pricing. The catalog uses the current `deepseek-v4-flash` and `deepseek-v4-pro` rows rather than stale V3.2 values. |
| Moonshot AI / Kimi | https://platform.kimi.ai/docs/models, https://platform.kimi.ai/docs/pricing/chat, https://platform.kimi.ai/docs/pricing/chat-k26, https://platform.kimi.ai/docs/pricing/chat-k25, https://platform.kimi.ai/docs/pricing/chat-k2 | Kimi K2.6, K2.5, K2, and Moonshot V1 context windows and token prices. Moonshot V1 CNY prices are converted to USD in the catalog notes only when necessary. |
| Alibaba Qwen | https://www.alibabacloud.com/help/en/model-studio/models, https://www.alibabacloud.com/help/en/model-studio/model-pricing | Qwen has region-specific and tiered pricing. The catalog uses Global deployment when available, with notes for tiering. |
| Z.AI / Zhipu GLM | https://docs.z.ai/guides/overview/pricing, https://docs.z.ai/guides/llm/glm-5.1, https://docs.z.ai/guides/llm/glm-5, https://docs.z.ai/guides/llm/glm-4.7, https://docs.z.ai/guides/llm/glm-4.6, https://docs.z.ai/guides/llm/glm-4.5 | Adds GLM 5.x and 4.x popular hosted models. |
| Mistral AI | https://docs.mistral.ai/models/model-cards/mistral-medium-3-1-25-08, https://docs.mistral.ai/models/model-cards/mistral-small-3-2-25-06, https://docs.mistral.ai/models/model-cards/ministral-3-8b-25-12 | Official model cards include context and pricing. |
| Cohere | https://docs.cohere.com/docs/command-a, https://docs.cohere.com/v1/docs/command-r7b, https://docs.cohere.com/docs/command-r, https://docs.cohere.com/docs/command-r-plus | Command A and still-used Command R family. |
| AI21 | https://www.ai21.com/pricing/, https://docs.ai21.com/docs/jamba-foundation-models | Jamba Mini and Jamba Large. |
| xAI | https://docs.x.ai/developers/models?cluster=us-west-1 | xAI docs confirm model IDs and context behavior. Pricing was not clearly exposed in the crawler, so only high-confidence official values should be committed. |
| Meta Llama hosted on Groq | https://groq.com/pricing, https://console.groq.com/docs/model/llama-3.1-8b-instant | Meta does not set a universal hosted API price. The catalog uses Groq-hosted Llama rows. |
| OpenAI | https://openai.com/api/pricing/, https://developers.openai.com/api/docs/models | Included as baseline coverage for popular current and older OpenAI models already likely present in benchmark sources. |

## Coverage Added

The implementation catalog should include at least these families:

- Claude Opus, Sonnet, and Haiku active and older variants.
- Gemini 3.1 preview, Gemini 2.5, Gemini 2.0, and older Gemini 1.5/1.0 variants.
- DeepSeek V4 plus V3.2 chat/reasoner API modes.
- Kimi K2.6, K2.5, K2, and Moonshot V1.
- Qwen3, Qwen3.5, Qwen Plus/Flash/Max, Qwen Coder, and thinking mode rows.
- GLM 5 and GLM 4 variants.
- Mistral Medium, Small, and Ministral.
- Cohere Command A/R/R+.
- AI21 Jamba.
- Groq-hosted Llama.
- OpenAI GPT-5.x, GPT-4.1, GPT-4o, low-cost mini/nano baselines, and reasoning rows such as o3/o4-mini.

The committed catalog target is at least 70 rows; the implementation currently keeps this guarded by unit tests rather than relying on manual counting.
