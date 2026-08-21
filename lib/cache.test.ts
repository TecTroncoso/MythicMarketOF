import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock @upstash/redis: a controllable class with mocked get/set/del.
// The constructor records the instance for assertions on `ex` option, etc.
const redisInstances: Array<{
  set: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
}> = [];

vi.mock("@upstash/redis", () => {
  return {
    Redis: class {
      set = vi.fn(async () => "OK");
      get = vi.fn(async () => null);
      del = vi.fn(async () => 1);
      constructor(_opts: unknown) {
        redisInstances.push(this);
      }
    },
  };
});

beforeEach(() => {
  redisInstances.length = 0;
  // Default: env vars present -> code goes through the Redis path.
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://fake.upstash.io");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "fake-token");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

// Import dynamically so the env stubbing above takes effect.
// `vi.resetModules()` before each import so the module-level `redisClient`
// is re-initialized against the current env stubs (otherwise a previous test's
// in-memory init sticks and the Upstash branch never executes).
const importCache = () => {
  vi.resetModules();
  return import("@/lib/cache");
};

const importCacheInMemory = async () => {
  vi.resetModules();
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
  return import("@/lib/cache");
};

describe("cache (in-memory fallback path)", () => {
  it("cacheGet returns null when key is missing", async () => {
    const { cacheGet } = await importCacheInMemory();
    const result = await cacheGet<{ nickname: string }>("missing-key");
    expect(result).toBeNull();
  });

  it("cacheSet then cacheGet returns the value", async () => {
    const { cacheGet, cacheSet } = await importCacheInMemory();
    await cacheSet("key-1", { nickname: "TestPlayer", country: "PH" }, 60);
    const result = await cacheGet<{ nickname: string; country: string }>("key-1");
    expect(result).toEqual({ nickname: "TestPlayer", country: "PH" });
  });

  it("honors TTL: returns null after the entry expires", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    const { cacheGet, cacheSet } = await importCacheInMemory();
    await cacheSet("ttl-key", { v: 1 }, 1); // 1 second TTL
    const beforeExpiry = await cacheGet<{ v: number }>("ttl-key");
    expect(beforeExpiry).toEqual({ v: 1 });

    vi.advanceTimersByTime(2_000);

    const afterExpiry = await cacheGet<{ v: number }>("ttl-key");
    expect(afterExpiry).toBeNull();
  });

  it("cacheDelete removes a key", async () => {
    const { cacheGet, cacheSet, cacheDelete } = await importCacheInMemory();
    await cacheSet("delete-me", { v: 42 }, 60);
    expect(await cacheGet<{ v: number }>("delete-me")).toEqual({ v: 42 });
    await cacheDelete("delete-me");
    expect(await cacheGet<{ v: number }>("delete-me")).toBeNull();
  });
});

describe("cache (Upstash path)", () => {
  it("uses Upstash when env vars are set: get/set/del call the SDK", async () => {
    const { cacheGet, cacheSet, cacheDelete } = await importCache();
    expect(redisInstances.length).toBe(1);

    // Set
    await cacheSet("u-key", { nickname: "UpstashPlayer" }, 86_400);
    expect(redisInstances[0].set).toHaveBeenCalledWith(
      "u-key",
      { nickname: "UpstashPlayer" },
      { ex: 86_400 },
    );

    // Configure the mock to return a value, then get
    redisInstances[0].get.mockResolvedValueOnce({ nickname: "UpstashPlayer", country: "PH" });
    const got = await cacheGet<{ nickname: string; country: string }>("u-key");
    expect(got).toEqual({ nickname: "UpstashPlayer", country: "PH" });
    expect(redisInstances[0].get).toHaveBeenCalledWith("u-key");

    // Delete
    await cacheDelete("u-key");
    expect(redisInstances[0].del).toHaveBeenCalledWith("u-key");
  });

  it("Upstash set forwards the ex option equal to ttlSeconds", async () => {
    const { cacheSet } = await importCache();
    await cacheSet("k", { v: 1 }, 300);
    expect(redisInstances[0].set).toHaveBeenCalledWith("k", { v: 1 }, { ex: 300 });
  });
});

describe("cache exports", () => {
  it("exports cacheGet, cacheSet, cacheDelete as functions", async () => {
    const mod = await importCache();
    expect(typeof mod.cacheGet).toBe("function");
    expect(typeof mod.cacheSet).toBe("function");
    expect(typeof mod.cacheDelete).toBe("function");
  });
});
