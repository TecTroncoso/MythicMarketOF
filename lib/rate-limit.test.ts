import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { randomUUID } from "node:crypto";

// Helper: unique identifier per test to dodge the module-level Map cache.
const mkId = () => `u-${randomUUID()}`;

// Track calls to the mocked Ratelimit.limit so we can assert on demand.
const limitCalls: Array<{ identifier: string; result: { success: boolean; reset: number } }> = [];

// Mock @upstash/ratelimit: a controllable class with a `limit(identifier)` method.
vi.mock("@upstash/ratelimit", () => {
  // `slidingWindow` is a factory used by the production code to configure
  // the limiter; the mock passes through the args so the test can read them.
  const slidingWindow = (requests: number, windowStr: string | number) => ({
    requests,
    windowStr,
  });
  return {
    Ratelimit: class {
      limit: (identifier: string) => Promise<{ success: boolean; reset: number }>;
      static slidingWindow = slidingWindow;
      constructor(config: { redis: unknown; limiter: unknown; prefix?: string }) {
        const max = (config.limiter as { requests: number }).requests;
        const rawWindow = (config.limiter as { windowStr: string | number }).windowStr;
        const windowNum =
          typeof rawWindow === "string"
            ? rawWindow.match(/(\d+)/)?.[1] ?? "60"
            : String(rawWindow);
        const windowMsNum = parseInt(windowNum, 10) * 1000;
        this.limit = async (identifier: string) => {
          const existing = limitCalls.filter((c) => c.identifier === identifier);
          if (existing.length >= max) {
            const reset = Date.now() + windowMsNum;
            limitCalls.push({ identifier, result: { success: false, reset } });
            return { success: false, reset };
          }
          const reset = Date.now() + windowMsNum;
          limitCalls.push({ identifier, result: { success: true, reset } });
          return { success: true, reset };
        };
      }
    },
  };
});

vi.mock("@upstash/redis", () => {
  return {
    Redis: class {
      constructor(_opts: unknown) {}
    },
  };
});

beforeEach(() => {
  limitCalls.length = 0;
  // Default: env vars present -> code goes through the Redis path.
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://fake.upstash.io");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "fake-token");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

// Import dynamically so the env stubbing above takes effect.
const importRateLimit = () => import("@/lib/rate-limit");

describe("rate-limit (Redis path)", () => {
  it("returns success on the first call within the window", async () => {
    const { authRateLimiter } = await importRateLimit();
    const id = mkId();
    const result = await authRateLimiter.limit(id);
    expect(result.success).toBe(true);
    expect(typeof result.reset).toBe("number");
  });

  it("returns failure after exceeding the limit (5/60s)", async () => {
    const { authRateLimiter } = await importRateLimit();
    const id = mkId();
    for (let i = 0; i < 5; i++) {
      const r = await authRateLimiter.limit(id);
      expect(r.success).toBe(true);
    }
    const sixth = await authRateLimiter.limit(id);
    expect(sixth.success).toBe(false);
    expect(typeof sixth.reset).toBe("number");
  });

  it("keeps separate buckets for distinct identifiers", async () => {
    const { authRateLimiter } = await importRateLimit();
    const idA = mkId();
    const idB = mkId();
    for (let i = 0; i < 5; i++) {
      await authRateLimiter.limit(idA);
    }
    // idA is now exhausted. idB should still succeed.
    const resultB = await authRateLimiter.limit(idB);
    expect(resultB.success).toBe(true);
  });
});

describe("rate-limit (in-memory fallback path)", () => {
  const importInMemory = async () => {
    vi.resetModules();
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    return import("@/lib/rate-limit");
  };

  it("returns success on first call when Redis env is absent", async () => {
    const { authRateLimiter } = await importInMemory();
    const id = mkId();
    const result = await authRateLimiter.limit(id);
    expect(result.success).toBe(true);
  });

  it("returns failure after exceeding 5 calls in the in-memory path", async () => {
    const { authRateLimiter } = await importInMemory();
    const id = mkId();
    for (let i = 0; i < 5; i++) {
      const r = await authRateLimiter.limit(id);
      expect(r.success).toBe(true);
    }
    const sixth = await authRateLimiter.limit(id);
    expect(sixth.success).toBe(false);
  });

  it("decays the window after the configured duration elapses", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    const { authRateLimiter } = await importInMemory();
    const id = mkId();

    // Exhaust the bucket.
    for (let i = 0; i < 5; i++) {
      await authRateLimiter.limit(id);
    }
    const blocked = await authRateLimiter.limit(id);
    expect(blocked.success).toBe(false);

    // Advance past the 60s window.
    vi.advanceTimersByTime(60_000);

    const afterWindow = await authRateLimiter.limit(id);
    expect(afterWindow.success).toBe(true);
  });
});

describe("rate-limit exported limiters", () => {
  it("exports authRateLimiter, checkoutRateLimiter, and mlbbLookupRateLimiter", async () => {
    const mod = await importRateLimit();
    expect(mod.authRateLimiter).toBeDefined();
    expect(mod.checkoutRateLimiter).toBeDefined();
    expect(mod.mlbbLookupRateLimiter).toBeDefined();
    expect(typeof mod.authRateLimiter.limit).toBe("function");
    expect(typeof mod.checkoutRateLimiter.limit).toBe("function");
    expect(typeof mod.mlbbLookupRateLimiter.limit).toBe("function");
  });
});
