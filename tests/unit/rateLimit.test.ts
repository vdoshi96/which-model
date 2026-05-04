import { beforeEach, describe, expect, it, vi } from "vitest";

const limitMock = vi.fn();

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow = vi.fn((limit: number, window: string) => ({
      limit,
      window,
    }));

    limit = limitMock;

    constructor(public readonly config: unknown) {}
  },
}));

vi.mock("@/lib/redis", () => ({
  getRedis: vi.fn(() => ({ kind: "redis" })),
}));

describe("rate limiting", () => {
  beforeEach(() => {
    vi.resetModules();
    limitMock.mockReset();
  });

  it("extracts the first forwarded IP address", async () => {
    const { getClientIp } = await import("@/lib/rateLimit");

    const ip = getClientIp(
      new Request("http://localhost", {
        headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" },
      }),
    );

    expect(ip).toBe("203.0.113.10");
  });

  it("throws the public rate limit error when Upstash denies the IP", async () => {
    limitMock.mockResolvedValue({ success: false });
    const { assertRateLimit } = await import("@/lib/rateLimit");

    await expect(assertRateLimit("203.0.113.10")).rejects.toThrow(
      "Rate limit exceeded. Try again later.",
    );
    expect(limitMock).toHaveBeenCalledWith("203.0.113.10");
  });
});
