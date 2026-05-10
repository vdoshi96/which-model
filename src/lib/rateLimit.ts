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

export function buildRateLimitKey(userId: string, ipAddress: string): string {
  return `user:${userId}:ip:${ipAddress}`;
}

export function buildSignupRateLimitKey(ipAddress: string): string {
  return `signup:ip:${ipAddress}`;
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

export async function assertRateLimit(key: string): Promise<void> {
  const result = await getRateLimiter().limit(key);

  if (!result.success) {
    throw new RateLimitError();
  }
}
