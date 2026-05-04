import { beforeEach, describe, expect, it, vi } from "vitest";

const limitMock = vi.fn();
const interpretTaskMock = vi.fn();
const modelFindManyMock = vi.fn();
const queryCreateMock = vi.fn();

vi.mock("@/lib/rateLimit", () => ({
  assertRateLimit: limitMock,
  getClientIp: vi.fn(() => "203.0.113.10"),
  RateLimitError: class RateLimitError extends Error {},
}));

vi.mock("@/lib/deepseek", () => ({
  interpretTask: interpretTaskMock,
}));

vi.mock("@/lib/db", () => ({
  getPrisma: vi.fn(() => ({
    model: { findMany: modelFindManyMock },
    query: { create: queryCreateMock },
  })),
}));

describe("recommend and compare API routes", () => {
  beforeEach(() => {
    vi.resetModules();
    limitMock.mockReset().mockResolvedValue(undefined);
    interpretTaskMock.mockReset().mockResolvedValue({
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
    modelFindManyMock.mockReset().mockResolvedValue([
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
    queryCreateMock.mockReset().mockResolvedValue({});
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
    expect(queryCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        taskText: "Pick a model for legal reasoning.",
        ipAddress: "203.0.113.10",
      }),
    });
  });

  it("returns HTTP 400 when DeepSeek refuses the task", async () => {
    interpretTaskMock.mockResolvedValue({
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

  it("returns HTTP 503 when DeepSeek fails", async () => {
    interpretTaskMock.mockRejectedValue(new Error("upstream unavailable"));
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
      ],
    });
    expect(modelFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { name: { in: ["Model A", "Model B"] } },
      }),
    );
  });
});
