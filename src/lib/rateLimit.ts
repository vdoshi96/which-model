import { Ratelimit } from "@upstash/ratelimit";

import { getRedis } from "@/lib/redis";

let limiter: Ratelimit | null = null;

export class RateLimitError extends Error {
  constructor(message = "Rate limit exceeded. Try again later.") {
    super(message);
    this.name = "RateLimitError";
  }
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "127.0.0.1";
}

export function getRateLimiter(): Ratelimit {
  if (!limiter) {
    limiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(5, "60 m"),
      analytics: true,
    });
  }

  return limiter;
}

export async function assertRateLimit(ipAddress: string): Promise<void> {
  const result = await getRateLimiter().limit(ipAddress);

  if (!result.success) {
    throw new RateLimitError();
  }
}
