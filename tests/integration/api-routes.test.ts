
export {};

const mockLimit = jest.fn();
const mockAuth = jest.fn();
const mockInterpretTask = jest.fn();
const mockModelFindMany = jest.fn();
const mockQueryCreate = jest.fn();

jest.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

jest.mock("@/lib/rateLimit", () => ({
  assertRateLimit: mockLimit,
  buildRateLimitKey: jest.fn(
    (userId: string, ipAddress: string) => `user:${userId}:ip:${ipAddress}`,
  ),
  getClientIp: jest.fn(() => "203.0.113.10"),
  RateLimitError: class RateLimitError extends Error {},
}));

jest.mock("@/lib/deepseek", () => ({
  interpretTask: mockInterpretTask,
}));

jest.mock("@/lib/db", () => ({
  getPrisma: jest.fn(() => ({
    model: { findMany: mockModelFindMany },
    query: { create: mockQueryCreate },
  })),
}));

describe("recommend and compare API routes", () => {
  beforeEach(() => {
    jest.resetModules();
    mockAuth.mockReset().mockResolvedValue({
      user: {
        id: "user_1",
        isAdmin: false,
        username: "valid_user",
      },
    });
    mockLimit.mockReset().mockResolvedValue(undefined);
    mockInterpretTask.mockReset().mockResolvedValue({
      refused: false,
      dimensions: {
        reasoning: 1,
        coding: 0,
        math: 0,
        instruction_following: 0,
        overall: 0,
        speed: 0,
        cost_efficiency: 0,
      },
      summary: "Reasoning is the main requirement.",
    });
    mockModelFindMany.mockReset().mockResolvedValue([
      {
        name: "Model A",
        provider: "Provider",
        contextWindow: 128000,
        costInputPer1M: 1,
        costOutputPer1M: 2,
        scores: [
          {
            source: "livebench",
            dimension: "reasoning",
            score: 0.9,
            rawLabel: null,
          },
        ],
      },
    ]);
    mockQueryCreate.mockReset().mockResolvedValue({});
  });

  it("rejects recommendation requests when the user is not signed in", async () => {
    mockAuth.mockResolvedValue(null);
    const { POST } = await import("@/app/api/recommend/route");

    const response = await POST(
      new Request("http://localhost/api/recommend", {
        method: "POST",
        body: JSON.stringify({ task: "Pick a coding model." }),
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "Sign in to ask questions.",
    });
    expect(mockLimit).not.toHaveBeenCalled();
    expect(mockInterpretTask).not.toHaveBeenCalled();
  });

  it("returns ranked recommendations and logs the query", async () => {
    const { POST } = await import("@/app/api/recommend/route");

    const response = await POST(
      new Request("http://localhost/api/recommend", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.10" },
        body: JSON.stringify({ task: "Pick a model for legal reasoning." }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.taskSummary).toBe("Reasoning is the main requirement.");
    expect(body.recommendations[0]).toEqual(
      expect.objectContaining({
        rank: 1,
        model: expect.objectContaining({ name: "GPT-5.5" }),
        evidenceCount: expect.any(Number),
        contributions: expect.arrayContaining([
          expect.objectContaining({ label: "reasoning" }),
        ]),
        rationale: expect.any(String),
      }),
    );
    expect(mockLimit).toHaveBeenCalledWith("user:user_1:ip:203.0.113.10");
    expect(mockQueryCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        taskText: "Pick a model for legal reasoning.",
        ipAddress: "203.0.113.10",
        userId: "user_1",
      }),
    });
  });

  it("applies recommendation preferences before ranking", async () => {
    mockInterpretTask.mockResolvedValue({
      refused: false,
      dimensions: {
        reasoning: 0,
        coding: 1,
        math: 0,
        instruction_following: 0,
        overall: 0,
        speed: 0,
        cost_efficiency: 0,
      },
      summary: "A coding task where implementation quality matters.",
    });
    const { POST } = await import("@/app/api/recommend/route");

    const response = await POST(
      new Request("http://localhost/api/recommend", {
        method: "POST",
        body: JSON.stringify({
          task: "Build a simple integration cheaply.",
          preferences: { costSensitive: true },
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.dimensions.cost_efficiency).toBeGreaterThanOrEqual(0.75);
    expect(body.recommendations[0].contributions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "cost_efficiency" }),
      ]),
    );
  });

  it("applies long-context preferences before ranking", async () => {
    mockInterpretTask.mockResolvedValue({
      refused: false,
      dimensions: {
        reasoning: 0,
        coding: 1,
        math: 0,
        instruction_following: 0,
        overall: 0,
        speed: 0,
        cost_efficiency: 0,
      },
      summary: "A coding task with long files.",
    });
    const { POST } = await import("@/app/api/recommend/route");

    const response = await POST(
      new Request("http://localhost/api/recommend", {
        method: "POST",
        body: JSON.stringify({
          task: "Build an agent over a huge repository.",
          preferences: { needsLongContext: true },
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.dimensions.long_context).toBe(1);
    expect(
      body.recommendations.every(
        (entry: { model: { contextWindow: number | null } }) =>
          (entry.model.contextWindow ?? 0) >= 1_000_000,
      ),
    ).toBe(true);
  });

  it("does not return hosted models when local-only is selected", async () => {
    mockInterpretTask.mockResolvedValue({
      refused: false,
      dimensions: {
        reasoning: 0,
        coding: 1,
        math: 0,
        instruction_following: 0,
        overall: 0,
        speed: 0,
        cost_efficiency: 0,
      },
      summary: "A coding task that must stay local.",
    });
    mockModelFindMany.mockResolvedValue([
      {
        name: "Hosted Model",
        provider: "Provider",
        contextWindow: 128000,
        costInputPer1M: 1,
        costOutputPer1M: 2,
        scores: [
          {
            source: "catalog_prior",
            dimension: "coding",
            score: 90,
            rawLabel: "Coding prior",
          },
        ],
      },
    ]);
    const { POST } = await import("@/app/api/recommend/route");

    const response = await POST(
      new Request("http://localhost/api/recommend", {
        method: "POST",
        body: JSON.stringify({
          task: "Pick a local-only coding model.",
          preferences: { localOnly: true },
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.recommendations).toEqual([]);
  });

  it("prefers frontier models when frontier candidates are available", async () => {
    mockInterpretTask.mockResolvedValue({
      refused: false,
      dimensions: {
        reasoning: 0,
        coding: 1,
        math: 0,
        instruction_following: 0,
        overall: 0,
        speed: 0,
        cost_efficiency: 0,
      },
      summary: "A coding task.",
    });
    const { POST } = await import("@/app/api/recommend/route");

    const response = await POST(
      new Request("http://localhost/api/recommend", {
        method: "POST",
        body: JSON.stringify({
          task: "Build a coding workflow.",
          preferences: { preferFrontier: true },
        }),
      }),
    );
    const body = await response.json();
    const recommendationNames = body.recommendations.map(
      (entry: { model: { name: string } }) => entry.model.name,
    );

    expect(response.status).toBe(200);
    expect(recommendationNames).toContain("GPT-5.5");
    expect(recommendationNames).toContain("Claude Opus 4.7");
    expect(recommendationNames).not.toContain("GPT-4.1");
  });

  it("returns curated catalog models from the model catalog API", async () => {
    mockModelFindMany.mockResolvedValue([
      {
        name: "Benchmark Only Model",
        provider: "Bench Labs",
        contextWindow: 64000,
        costInputPer1M: 0.4,
        costOutputPer1M: 1.2,
        scores: [{ id: "score-1" }],
      },
      {
        name: "Old Unbenchmarked Artifact",
        provider: "Unknown",
        contextWindow: null,
        costInputPer1M: null,
        costOutputPer1M: null,
        scores: [],
      },
      {
        name: "https://huggingface.co/Qwen/Qwen3-Coder-480B-A35B-Instruct",
        provider: "Alibaba",
        contextWindow: null,
        costInputPer1M: null,
        costOutputPer1M: null,
        scores: [{ id: "score-2" }],
      },
    ]);
    const { GET } = await import("@/app/api/models/route");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      models: expect.arrayContaining([
        expect.objectContaining({
          name: "GPT-5.5",
          provider: "OpenAI",
          hasBenchmarks: true,
        }),
        expect.objectContaining({
          name: "Claude Sonnet 4.6",
          provider: "Anthropic",
          contextWindow: 1_000_000,
          costInputPer1M: 3,
          costOutputPer1M: 15,
          hasBenchmarks: true,
        }),
      ]),
    });
    expect(
      body.models.some(
        (model: { name: string }) => model.name === "Benchmark Only Model",
      ),
    ).toBe(false);
    expect(
      body.models.some(
        (model: { name: string }) => model.name === "Old Unbenchmarked Artifact",
      ),
    ).toBe(false);
    expect(
      body.models.some((model: { name: string }) =>
        model.name.startsWith("https://huggingface.co/"),
      ),
    ).toBe(false);
    expect(mockModelFindMany).not.toHaveBeenCalled();
  });

  it("lets the admin request recommendations without consuming rate limit quota", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "admin",
        isAdmin: true,
        username: "admin",
      },
    });
    const { POST } = await import("@/app/api/recommend/route");

    const response = await POST(
      new Request("http://localhost/api/recommend", {
        method: "POST",
        body: JSON.stringify({ task: "Pick a coding model." }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockLimit).not.toHaveBeenCalled();
    expect(mockInterpretTask).toHaveBeenCalled();
  });

  it("does not use live DB rows as the recommendation authority", async () => {
    mockModelFindMany.mockResolvedValue([
      {
        name: "Catalog Only",
        provider: "Provider",
        contextWindow: 128000,
        costInputPer1M: 1,
        costOutputPer1M: 2,
        scores: [],
      },
      {
        name: "Benchmarked Model",
        provider: "Provider",
        contextWindow: 128000,
        costInputPer1M: 1,
        costOutputPer1M: 2,
        scores: [
          {
            source: "livebench",
            dimension: "reasoning",
            score: 0.8,
            rawLabel: null,
          },
        ],
      },
    ]);
    const { POST } = await import("@/app/api/recommend/route");

    const response = await POST(
      new Request("http://localhost/api/recommend", {
        method: "POST",
        body: JSON.stringify({ task: "Pick a reasoning model." }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(
      body.recommendations.some(
        (entry: { model: { name: string } }) =>
          entry.model.name === "Benchmarked Model",
      ),
    ).toBe(false);
  });

  it("returns catalog evidence instead of live benchmark artifacts", async () => {
    mockInterpretTask.mockResolvedValue({
      refused: false,
      dimensions: {
        reasoning: 1,
        coding: 1,
        math: 0,
        instruction_following: 0,
        overall: 0,
        speed: 0,
        cost_efficiency: 0,
      },
      summary: "This task needs both reasoning and coding.",
    });
    const { POST } = await import("@/app/api/recommend/route");

    const response = await POST(
      new Request("http://localhost/api/recommend", {
        method: "POST",
        body: JSON.stringify({ task: "Pick a coding model for UI work." }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.recommendations[0].benchmarksUsed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "catalog-coding-prior",
          provenance: "editorial_prior",
        }),
      ]),
    );
  });

  it("uses curated frontier priors and metadata for broad creative recommendations", async () => {
    mockInterpretTask.mockResolvedValue({
      refused: false,
      dimensions: {
        reasoning: 0.2,
        coding: 0,
        math: 0,
        instruction_following: 0.7,
        overall: 0.9,
        speed: 0,
        cost_efficiency: 0,
      },
      summary: "Song writing needs broad quality and instruction following.",
    });
    mockModelFindMany.mockResolvedValue([
      {
        name: "deepseek-ai/DeepSeek-R1-0528",
        provider: "deepseek-ai",
        contextWindow: null,
        costInputPer1M: null,
        costOutputPer1M: null,
        scores: [
          {
            source: "hf_leaderboard",
            dimension: "overall",
            score: 85,
            rawLabel: "HF Leaderboard",
          },
          {
            source: "hf_leaderboard",
            dimension: "reasoning",
            score: 85,
            rawLabel: "HF Leaderboard",
          },
        ],
      },
    ]);
    const { POST } = await import("@/app/api/recommend/route");

    const response = await POST(
      new Request("http://localhost/api/recommend", {
        method: "POST",
        body: JSON.stringify({ task: "write a song" }),
      }),
    );
    const body = await response.json();
    const topNames = body.recommendations
      .slice(0, 5)
      .map((recommendation: { model: { name: string } }) => recommendation.model.name);

    expect(response.status).toBe(200);
    expect(topNames).toContain("GPT-5.5");
    expect(topNames).toContain("Claude Opus 4.7");
    expect(topNames[0]).not.toBe("deepseek-ai/DeepSeek-R1-0528");
    expect(body.recommendations[0]).toMatchObject({
      model: expect.objectContaining({
        contextWindow: expect.any(Number),
        costInputPer1M: expect.any(Number),
        costOutputPer1M: expect.any(Number),
      }),
      evidenceCount: expect.any(Number),
      benchmarksUsed: expect.arrayContaining([
        expect.objectContaining({ source: "catalog-overall-prior" }),
      ]),
    });
  });

  it("uses catalog metadata in recommendations", async () => {
    mockModelFindMany.mockResolvedValue([
      {
        name: "gemini-2.5-flash",
        provider: "Google Live",
        contextWindow: 999999,
        costInputPer1M: 9,
        costOutputPer1M: 10,
        scores: [
          {
            source: "livebench",
            dimension: "reasoning",
            score: 0.8,
            rawLabel: null,
          },
        ],
      },
    ]);
    const { POST } = await import("@/app/api/recommend/route");

    const response = await POST(
      new Request("http://localhost/api/recommend", {
        method: "POST",
        body: JSON.stringify({ task: "Pick a reasoning model." }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.recommendations[0]).toEqual(
      expect.objectContaining({
        model: expect.objectContaining({
          name: "GPT-5.5",
          provider: "OpenAI",
          contextWindow: 1_000_000,
          costInputPer1M: 5,
          costOutputPer1M: 30,
        }),
      }),
    );
  });

  it("returns HTTP 400 when DeepSeek refuses the task", async () => {
    mockInterpretTask.mockResolvedValue({
      refused: true,
      reason: "Not an LLM selection task.",
    });
    const { POST } = await import("@/app/api/recommend/route");

    const response = await POST(
      new Request("http://localhost/api/recommend", {
        method: "POST",
        body: JSON.stringify({ task: "write me a poem" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Not an LLM selection task.",
    });
  });

  it("returns HTTP 429 when rate limiting fires", async () => {
    const { RateLimitError } = await import("@/lib/rateLimit");

    mockLimit.mockRejectedValue(new RateLimitError("Rate limit exceeded. Try again later."));
    const { POST } = await import("@/app/api/recommend/route");

    const response = await POST(
      new Request("http://localhost/api/recommend", {
        method: "POST",
        body: JSON.stringify({ task: "Pick a coding model." }),
      }),
    );

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      error: "Rate limit exceeded. Try again later.",
    });
    expect(mockInterpretTask).not.toHaveBeenCalled();
  });

  it("returns HTTP 503 when DeepSeek fails", async () => {
    mockInterpretTask.mockRejectedValue(new Error("upstream unavailable"));
    const { POST } = await import("@/app/api/recommend/route");

    const response = await POST(
      new Request("http://localhost/api/recommend", {
        method: "POST",
        body: JSON.stringify({ task: "Pick a coding model." }),
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Task interpretation is temporarily unavailable. Try again shortly.",
    });
  });

  it("returns compared catalog models with null missing category scores", async () => {
    const { POST } = await import("@/app/api/compare/route");

    const response = await POST(
      new Request("http://localhost/api/compare", {
        method: "POST",
        body: JSON.stringify({
          task: "Pick a reasoning model.",
          modelNames: ["GPT-5.5", "Claude Opus 4.7"],
        }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.models[0]).toEqual(
      expect.objectContaining({
        name: "GPT-5.5",
        scores: expect.objectContaining({
          reasoning: expect.any(Number),
          creative_writing: null,
        }),
        weightedScore: expect.any(Number),
        evidenceCount: expect.any(Number),
        provenanceSummary: expect.objectContaining({
          editorial_prior: expect.any(Number),
        }),
        rationale: expect.stringContaining("editorial prior"),
      }),
    );
    expect(body.models[1]).toEqual(
      expect.objectContaining({
        name: "Claude Opus 4.7",
        weightedScore: expect.any(Number),
      }),
    );
    expect(mockModelFindMany).not.toHaveBeenCalled();
    expect(mockLimit).toHaveBeenCalledWith("user:user_1:ip:203.0.113.10");
    expect(mockQueryCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ipAddress: "203.0.113.10",
        taskText: "Pick a reasoning model.",
        userId: "user_1",
      }),
    });
  });

  it("compares catalog models with metadata and evidence", async () => {
    const { POST } = await import("@/app/api/compare/route");

    const response = await POST(
      new Request("http://localhost/api/compare", {
        method: "POST",
        body: JSON.stringify({
          task: "Pick a reasoning model.",
          modelNames: ["GPT-5.5", "Claude Sonnet 4.6"],
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      models: [
        expect.objectContaining({
          name: "GPT-5.5",
          weightedScore: expect.any(Number),
        }),
        expect.objectContaining({
          name: "Claude Sonnet 4.6",
          provider: "Anthropic",
          contextWindow: 1_000_000,
          costInputPer1M: 3,
          weightedScore: expect.any(Number),
          evidenceCount: 7,
          scores: expect.objectContaining({
            reasoning: expect.any(Number),
            creative_writing: null,
          }),
        }),
      ],
    });
  });

  it("compares catalog-only frontier models with curated priors for broad creative tasks", async () => {
    mockInterpretTask.mockResolvedValue({
      refused: false,
      dimensions: {
        reasoning: 0.2,
        coding: 0,
        math: 0,
        instruction_following: 0.7,
        overall: 0.9,
        speed: 0,
        cost_efficiency: 0,
      },
      summary: "Song writing needs broad quality and instruction following.",
    });
    mockModelFindMany.mockResolvedValue([]);
    const { POST } = await import("@/app/api/compare/route");

    const response = await POST(
      new Request("http://localhost/api/compare", {
        method: "POST",
        body: JSON.stringify({
          task: "write a song",
          modelNames: ["GPT-5.5", "Claude Opus 4.7"],
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.models).toEqual([
      expect.objectContaining({
        name: "GPT-5.5",
        contextWindow: 1_000_000,
        scores: expect.objectContaining({
          overall: expect.any(Number),
          instruction_following: expect.any(Number),
        }),
        weightedScore: expect.any(Number),
      }),
      expect.objectContaining({
        name: "Claude Opus 4.7",
        contextWindow: 1_000_000,
        scores: expect.objectContaining({
          overall: expect.any(Number),
          instruction_following: expect.any(Number),
        }),
        weightedScore: expect.any(Number),
      }),
    ]);
    expect(body.models[0].weightedScore).toBeGreaterThan(80);
    expect(body.models[1].weightedScore).toBeGreaterThan(80);
  });

  it("uses catalog aliases when comparing a catalog display name", async () => {
    const { POST } = await import("@/app/api/compare/route");

    const response = await POST(
      new Request("http://localhost/api/compare", {
        method: "POST",
        body: JSON.stringify({
          task: "Pick a reasoning model.",
          modelNames: ["claude-sonnet-4-6", "GPT-5.5"],
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      models: [
        expect.objectContaining({
          name: "Claude Sonnet 4.6",
          provider: "Anthropic",
          contextWindow: 1000000,
          costInputPer1M: 3,
          costOutputPer1M: 15,
          scores: expect.objectContaining({ reasoning: expect.any(Number) }),
          weightedScore: expect.any(Number),
        }),
        expect.objectContaining({
          name: "GPT-5.5",
          weightedScore: expect.any(Number),
        }),
      ],
    });
  });

  it("uses catalog metadata in comparisons", async () => {
    const { POST } = await import("@/app/api/compare/route");

    const response = await POST(
      new Request("http://localhost/api/compare", {
        method: "POST",
        body: JSON.stringify({
          task: "Pick a reasoning model.",
          modelNames: ["Gemini 3.1 Pro Preview", "GPT-5.5"],
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      models: [
        expect.objectContaining({
          name: "Gemini 3.1 Pro Preview",
          provider: "Google",
          contextWindow: 1_048_576,
          costInputPer1M: 2,
          costOutputPer1M: 12,
          weightedScore: expect.any(Number),
        }),
        expect.objectContaining({
          name: "GPT-5.5",
          weightedScore: expect.any(Number),
        }),
      ],
    });
  });

  it("rejects comparison when a requested model is not in the curated catalog", async () => {
    const { POST } = await import("@/app/api/compare/route");

    const response = await POST(
      new Request("http://localhost/api/compare", {
        method: "POST",
        body: JSON.stringify({
          task: "Pick a reasoning model.",
          modelNames: ["Model A", "GPT-5.5"],
        }),
      }),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: "One or more requested models were not found.",
    });
    expect(mockQueryCreate).not.toHaveBeenCalled();
  });

  it("requires at least two models for comparison before calling DeepSeek", async () => {
    const { POST } = await import("@/app/api/compare/route");

    const response = await POST(
      new Request("http://localhost/api/compare", {
        method: "POST",
        body: JSON.stringify({
          task: "Pick a reasoning model.",
          modelNames: ["Model A"],
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid comparison request." });
    expect(mockLimit).not.toHaveBeenCalled();
    expect(mockInterpretTask).not.toHaveBeenCalled();
  });
});
