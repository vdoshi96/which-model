
export {};

const mockLimit = jest.fn();
const mockInterpretTask = jest.fn();
const mockModelFindMany = jest.fn();
const mockQueryCreate = jest.fn();

jest.mock("@/lib/rateLimit", () => ({
  assertRateLimit: mockLimit,
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
    expect(await response.json()).toMatchObject({
      taskSummary: "Reasoning is the main requirement.",
      recommendations: [
        {
          rank: 1,
          model: { name: "Model A" },
          score: 0.9,
        },
      ],
    });
    expect(mockQueryCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        taskText: "Pick a model for legal reasoning.",
        ipAddress: "203.0.113.10",
      }),
    });
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

  it("returns compared models with null missing dimension scores", async () => {
    mockModelFindMany.mockResolvedValue([
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
      {
        name: "Model B",
        provider: "Provider",
        contextWindow: 32000,
        costInputPer1M: 0.5,
        costOutputPer1M: 1,
        scores: [
          {
            source: "livebench",
            dimension: "reasoning",
            score: 0.7,
            rawLabel: null,
          },
        ],
      },
    ]);
    const { POST } = await import("@/app/api/compare/route");

    const response = await POST(
      new Request("http://localhost/api/compare", {
        method: "POST",
        body: JSON.stringify({
          task: "Pick a reasoning model.",
          modelNames: ["Model A", "Model B"],
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      models: [
        {
          name: "Model A",
          scores: {
            reasoning: 0.9,
            coding: null,
          },
          weightedScore: 0.9,
        },
        {
          name: "Model B",
          weightedScore: 0.7,
        },
      ],
    });
    expect(mockModelFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { name: { in: ["Model A", "Model B"] } },
      }),
    );
  });

  it("rejects comparison when fewer than two requested models are found", async () => {
    const { POST } = await import("@/app/api/compare/route");

    const response = await POST(
      new Request("http://localhost/api/compare", {
        method: "POST",
        body: JSON.stringify({
          task: "Pick a reasoning model.",
          modelNames: ["Model A", "Missing Model"],
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
