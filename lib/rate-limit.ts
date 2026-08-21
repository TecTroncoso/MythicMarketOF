import { Ratelimit } from "@upstash/ratelimit";
import { getRedisClient } from "@/lib/redis";

export interface RateLimiter {
  limit(identifier: string): Promise<{ success: boolean; reset: number }>;
}

// Fallback in-memory simple para desarrollo cuando no hay Redis
const memoryBuckets = new Map<string, number[]>();

function createInMemoryLimiter(requests: number, windowSeconds: number): RateLimiter {
  const windowMs = windowSeconds * 1000;
  return {
    limit: async (identifier: string) => {
      const now = Date.now();
      const windowStart = now - windowMs;

      let timestamps = memoryBuckets.get(identifier) ?? [];
      timestamps = timestamps.filter((t) => t > windowStart);

      if (timestamps.length >= requests) {
        memoryBuckets.set(identifier, timestamps);
        return { success: false, reset: timestamps[0] + windowMs };
      }

      timestamps.push(now);
      memoryBuckets.set(identifier, timestamps);
      return { success: true, reset: now + windowMs };
    },
  };
}

function getLimiter(requests: number, windowSeconds: number): RateLimiter {
  const redis = getRedisClient();
  if (redis) {
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(requests, `${windowSeconds} s`),
      analytics: true,
      prefix: "@upstash/ratelimit",
    });
  }
  return createInMemoryLimiter(requests, windowSeconds);
}

export const checkoutRateLimiter = getLimiter(5, 60);
export const authRateLimiter = getLimiter(5, 60);
// Login recibe un presupuesto mayor (10/min) porque los intentos válidos —
// incluídos los exitosos — también consumen cuota; 5/min bloqueaba a usuarios
// legítimos con varios dispositivos. El registro mantiene 5/min.
export const loginRateLimiter = getLimiter(10, 60);
export const mlbbLookupRateLimiter = getLimiter(30, 60);
