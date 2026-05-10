
export {};

const mockLimit = jest.fn();

jest.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow: jest.Mock = jest.fn((limit: number, window: string) => ({
      limit,
      window,
    }));

    limit = mockLimit;

    constructor(public readonly config: unknown) {}
  },
}));

jest.mock("@/lib/redis", () => ({
  getRedis: jest.fn(() => ({ kind: "redis" })),
}));

describe("rate limiting", () => {
  beforeEach(() => {
    jest.resetModules();
    mockLimit.mockReset();
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

  it("builds a stable per-user per-IP rate limit key", async () => {
    const { buildRateLimitKey } = await import("@/lib/rateLimit");

    expect(buildRateLimitKey("user_1", "203.0.113.10")).toBe(
      "user:user_1:ip:203.0.113.10",
    );
  });

  it("builds a signup-specific IP rate limit key", async () => {
    const { buildSignupRateLimitKey } = await import("@/lib/rateLimit");

    expect(buildSignupRateLimitKey("203.0.113.10")).toBe(
      "signup:ip:203.0.113.10",
    );
  });

  it("throws the public rate limit error when Upstash denies the IP", async () => {
    mockLimit.mockResolvedValue({ success: false });
    const { assertRateLimit } = await import("@/lib/rateLimit");

    await expect(assertRateLimit("203.0.113.10")).rejects.toThrow(
      "Rate limit exceeded. Try again later.",
    );
    expect(mockLimit).toHaveBeenCalledWith("203.0.113.10");
  });
});
