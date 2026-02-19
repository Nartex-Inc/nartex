// src/lib/rate-limit.ts
// In-memory sliding window rate limiter (zero dependencies)

import { NextResponse } from "next/server";

const store = new Map<string, number[]>();

const MAX_KEYS = 10_000;

interface RateLimitResult {
  success: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Sliding window rate limiter.
 * Prunes expired timestamps on each call; evicts all expired entries
 * when the map exceeds MAX_KEYS.
 */
export function rateLimit({
  key,
  limit,
  windowMs,
}: {
  key: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;

  // Lazy cleanup when store grows too large
  if (store.size > MAX_KEYS) {
    for (const [k, timestamps] of store) {
      const filtered = timestamps.filter((t) => t > cutoff);
      if (filtered.length === 0) {
        store.delete(k);
      } else {
        store.set(k, filtered);
      }
    }
  }

  const timestamps = (store.get(key) ?? []).filter((t) => t > cutoff);

  if (timestamps.length >= limit) {
    const oldestInWindow = timestamps[0];
    const retryAfterMs = oldestInWindow + windowMs - now;
    return { success: false, remaining: 0, retryAfterMs };
  }

  timestamps.push(now);
  store.set(key, timestamps);

  return {
    success: true,
    remaining: limit - timestamps.length,
    retryAfterMs: 0,
  };
}

/**
 * Extract client IP from request headers (CloudFront → ALB → ECS chain).
 */
export function getClientIp(request: Request): string {
  const headers = new Headers(request.headers);
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    // First IP in the chain is the real client
    return forwarded.split(",")[0].trim();
  }
  return headers.get("x-real-ip") ?? "unknown";
}

/**
 * Returns a 429 NextResponse with Retry-After header and French message.
 */
export function rateLimitResponse(retryAfterMs: number): NextResponse {
  const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
  return NextResponse.json(
    {
      success: false,
      error: "Trop de requêtes. Veuillez réessayer plus tard.",
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    }
  );
}
