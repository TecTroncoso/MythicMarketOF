import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/mlbb/lookup/route";
import type { LookupResult } from "@/lib/mlbb/client";

// Module mocks (hoisted before imports). Default per-test setup happens in beforeEach.
vi.mock("@/lib/mlbb/client", () => ({
  lookupPlayer: vi.fn(),
}));
vi.mock("@/lib/cache", () => ({
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({
  mlbbLookupRateLimiter: { limit: vi.fn() },
}));

import { lookupPlayer } from "@/lib/mlbb/client";
import { cacheGet, cacheSet } from "@/lib/cache";
import { mlbbLookupRateLimiter } from "@/lib/rate-limit";

const mockedLookupPlayer = vi.mocked(lookupPlayer);
const mockedCacheGet = vi.mocked(cacheGet);
const mockedCacheSet = vi.mocked(cacheSet);
const mockedLimit = vi.mocked(mlbbLookupRateLimiter.limit);

beforeEach(() => {
  vi.clearAllMocks();
  // Defaults: rate limit OK, cache miss, lookup returns a valid result.
  mockedLimit.mockResolvedValue({ success: true, reset: 0 } as never);
  mockedCacheGet.mockResolvedValue(null);
  mockedCacheSet.mockResolvedValue(undefined);
  mockedLookupPlayer.mockResolvedValue({
    nickname: "TestPlayer",
    country: "PH",
  } as LookupResult);
});

// Build a POST request to /api/mlbb/lookup.
const buildRequest = (body: string | object, ip = "127.0.0.1") => {
  const raw = typeof body === "string" ? body : JSON.stringify(body);
  return new Request("http://localhost/api/mlbb/lookup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: raw,
  });
};

describe("POST /api/mlbb/lookup", () => {
  it("returns 400 INVALID_JSON when body is not valid JSON", async () => {
    const res = await POST(buildRequest("{not-json"));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toMatchObject({
      success: false,
      error: "INVALID_JSON",
    });
  });

  it("returns 400 VALIDATION_ERROR when userId has non-digits", async () => {
    const res = await POST(
      buildRequest({ userId: "abc12345", zoneId: "10012" })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toMatchObject({
      success: false,
      error: "VALIDATION_ERROR",
    });
    expect(typeof data.message).toBe("string");
    expect(mockedLookupPlayer).not.toHaveBeenCalled();
  });

  it("returns 400 VALIDATION_ERROR when zoneId is too short", async () => {
    const res = await POST(buildRequest({ userId: "12345678", zoneId: "12" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toMatchObject({
      success: false,
      error: "VALIDATION_ERROR",
    });
    expect(mockedLookupPlayer).not.toHaveBeenCalled();
  });

  it("returns 429 RATE_LIMITED when the rate limiter rejects the IP", async () => {
    mockedLimit.mockResolvedValueOnce({ success: false, reset: 0 } as never);
    const res = await POST(buildRequest({ userId: "12345678", zoneId: "10012" }));
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data).toMatchObject({
      success: false,
      error: "RATE_LIMITED",
    });
    expect(mockedCacheGet).not.toHaveBeenCalled();
    expect(mockedLookupPlayer).not.toHaveBeenCalled();
  });

  it("returns cached:true on cache hit and does not call upstream", async () => {
    mockedCacheGet.mockResolvedValueOnce({
      nickname: "CachedNick",
      country: "ID",
      cachedAt: 1,
    });
    const res = await POST(buildRequest({ userId: "12345678", zoneId: "10012" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({
      success: true,
      data: {
        userId: "12345678",
        zoneId: "10012",
        nickname: "CachedNick",
        country: "ID",
        cached: true,
      },
    });
    expect(mockedLookupPlayer).not.toHaveBeenCalled();
    expect(mockedCacheSet).not.toHaveBeenCalled();
  });

  it("returns cached:false on cache miss + lookup success, and writes 24h cache", async () => {
    const res = await POST(buildRequest({ userId: "12345678", zoneId: "10012" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({
      success: true,
      data: {
        userId: "12345678",
        zoneId: "10012",
        nickname: "TestPlayer",
        country: "PH",
        cached: false,
      },
    });
    expect(mockedLookupPlayer).toHaveBeenCalledTimes(1);
    expect(mockedLookupPlayer).toHaveBeenCalledWith("12345678", "10012");
    expect(mockedCacheSet).toHaveBeenCalledTimes(1);
    const [key, value, ttl] = mockedCacheSet.mock.calls[0]!;
    expect(key).toBe("mlbb:lookup:12345678:10012");
    expect(value).toMatchObject({ nickname: "TestPlayer", country: "PH" });
    expect(typeof (value as { cachedAt: number }).cachedAt).toBe("number");
    expect(ttl).toBe(86_400);
  });

  it("returns 200 success:false LOOKUP_FAILED on cache miss + lookup fail, with 5min negative cache", async () => {
    mockedLookupPlayer.mockResolvedValueOnce(null);
    const res = await POST(buildRequest({ userId: "12345678", zoneId: "10012" }));
    // Intentionally 200, not 4xx — soft failure per spec REQ-1.4.
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toMatchObject({
      success: false,
      error: "LOOKUP_FAILED",
    });
    expect(mockedCacheSet).toHaveBeenCalledTimes(1);
    const [key, value, ttl] = mockedCacheSet.mock.calls[0]!;
    expect(key).toBe("mlbb:lookup:12345678:10012");
    expect(value).toMatchObject({ nickname: "", country: "" });
    expect(ttl).toBe(300);
  });

  it("treats negative cache (nickname === '') as a miss and re-fetches upstream", async () => {
    // First request: upstream fails, negative cache is stored.
    mockedLookupPlayer.mockResolvedValueOnce(null);
    const first = await POST(
      buildRequest({ userId: "12345678", zoneId: "10012" })
    );
    expect(first.status).toBe(200);
    expect((await first.json()).error).toBe("LOOKUP_FAILED");
    expect(mockedLookupPlayer).toHaveBeenCalledTimes(1);
    expect(mockedCacheSet).toHaveBeenCalledTimes(1);

    // Second request: cache returns the negative entry — route must NOT short-circuit.
    mockedCacheGet.mockResolvedValueOnce({
      nickname: "",
      country: "",
      cachedAt: 0,
    });
    // Upstream recovers this time.
    mockedLookupPlayer.mockResolvedValueOnce({
      nickname: "Recovered",
      country: "PH",
    } as LookupResult);
    const second = await POST(
      buildRequest({ userId: "12345678", zoneId: "10012" })
    );
    expect(second.status).toBe(200);
    const data = await second.json();
    expect(data).toMatchObject({
      success: true,
      data: { nickname: "Recovered", cached: false },
    });
    expect(mockedLookupPlayer).toHaveBeenCalledTimes(2);
    // Second request wrote the success cache with 24h TTL.
    const [key, , ttl] = mockedCacheSet.mock.calls[1]!;
    expect(key).toBe("mlbb:lookup:12345678:10012");
    expect(ttl).toBe(86_400);
  });
});
