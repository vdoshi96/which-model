import {
  applyCatalogMetadata,
  findCatalogModel,
  listCatalogModels,
} from "@/lib/modelCatalog";
import type { NormalizedBenchmarkRecord } from "@/lib/benchmarkSources/types";

describe("curated model catalog", () => {
  it("contains at least 70 curated models", () => {
    expect(listCatalogModels().length).toBeGreaterThanOrEqual(70);
  });

  it("finds models by API alias and exposes source-backed metadata", () => {
    const model = findCatalogModel("claude-sonnet-4-6");

    expect(model).toMatchObject({
      name: "Claude Sonnet 4.6",
      provider: "Anthropic",
      contextWindow: 1_000_000,
      costInputPer1M: 3,
      costOutputPer1M: 15,
      lastVerified: "2026-05-04",
    });
    expect(model?.sourceUrls).toContain(
      "https://platform.claude.com/docs/en/about-claude/pricing",
    );
  });

  it("applies catalog metadata without mutating the benchmark record", () => {
    const record: NormalizedBenchmarkRecord = {
      modelName: "gemini-2.5-flash",
      provider: "Unknown",
      source: "livebench",
      dimension: "coding",
      score: 82,
      rawLabel: "Coding",
    };

    const enriched = applyCatalogMetadata(record);

    expect(enriched).toMatchObject({
      modelName: "Gemini 2.5 Flash",
      provider: "Google",
      contextWindow: 1_048_576,
      costInputPer1M: 0.3,
      costOutputPer1M: 2.5,
    });
    expect(record).toEqual({
      modelName: "gemini-2.5-flash",
      provider: "Unknown",
      source: "livebench",
      dimension: "coding",
      score: 82,
      rawLabel: "Coding",
    });
  });

  it("preserves source-provided non-null context and cost fields when canonicalizing aliases", () => {
    const record: NormalizedBenchmarkRecord = {
      modelName: "gemini-2.5-flash",
      provider: "Unknown",
      source: "livebench",
      dimension: "coding",
      score: 82,
      rawLabel: "Coding",
      contextWindow: 999_999,
      costInputPer1M: 9,
      costOutputPer1M: 10,
    };

    const enriched = applyCatalogMetadata(record);

    expect(enriched).toMatchObject({
      modelName: "Gemini 2.5 Flash",
      provider: "Google",
      contextWindow: 999_999,
      costInputPer1M: 9,
      costOutputPer1M: 10,
    });
  });

  it("includes named thinking and reasoning variants or API aliases", () => {
    const identifiers = listCatalogModels().flatMap((model) => [
      model.name,
      model.apiId,
      ...model.aliases,
    ]);

    expect(identifiers).toEqual(
      expect.arrayContaining([
        "DeepSeek V3.2 Reasoner",
        "Qwen Plus Thinking",
        "o3",
      ]),
    );
  });

  it("resolves legacy and older dated model variants", () => {
    expect(findCatalogModel("claude-opus-4-1-20250805")).toMatchObject({
      name: "Claude Opus 4.1",
      provider: "Anthropic",
    });
  });

  it("covers the missing provider families and popular legacy baselines", () => {
    const providers = Array.from(
      new Set(listCatalogModels().map((model) => model.provider)),
    );
    const modelNames = listCatalogModels().map((model) => model.name);

    expect(providers).toEqual(
      expect.arrayContaining([
        "Anthropic",
        "Google",
        "Moonshot AI",
        "DeepSeek",
        "Alibaba Cloud",
        "GroqCloud",
        "Mistral AI",
        "Cohere",
        "AI21",
        "OpenAI",
      ]),
    );
    expect(modelNames).toEqual(
      expect.arrayContaining([
        "Claude Sonnet 4.6",
        "Gemini 2.5 Pro",
        "Kimi K2.6",
        "DeepSeek V4 Pro",
        "Qwen3-Max",
        "Meta Llama 3.3 70B Versatile on Groq",
        "GPT-4o",
      ]),
    );
  });
});
