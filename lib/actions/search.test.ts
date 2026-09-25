import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks hoisted before imports.

vi.mock("next/headers", () => ({
  headers: () => Promise.resolve({ get: () => "127.0.0.1" }),
}));

const mockSearchRateLimit = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  searchRateLimiter: { limit: mockSearchRateLimit },
  checkoutRateLimiter: { limit: vi.fn() },
  authRateLimiter: { limit: vi.fn() },
  loginRateLimiter: { limit: vi.fn() },
  mlbbLookupRateLimiter: { limit: vi.fn() },
}));

const mockGetStoreProducts = vi.fn();
vi.mock("@/lib/store-catalog", () => ({
  getStoreProducts: mockGetStoreProducts,
}));

const { searchStore } = await import("@/lib/actions/search");

const LIVE = [
  {
    id: "78-diamonds-8-bonus",
    name: "78 Diamonds",
    bonus: "8 Diamonds",
    label: "78 Diamonds + 8 Bonus",
    image: "/products/diamantes.png",
    category: "diamonds" as const,
    priceUsdCents: 135,
    priceEurCents: 119,
  },
  {
    id: "weekly-diamond-pass",
    name: "Weekly Diamond Pass",
    bonus: "",
    label: "Weekly Diamond Pass",
    image: "/products/pass1.png",
    category: "weekly-pass" as const,
    priceUsdCents: 173,
    priceEurCents: 151,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchRateLimit.mockResolvedValue({ success: true, reset: 0 });
  mockGetStoreProducts.mockResolvedValue(LIVE);
});

describe("searchStore()", () => {
  it("matches against the live catalog by name (case-insensitive)", async () => {
    const results = await searchStore("WEEKLY");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: "weekly-diamond-pass",
      label: "Weekly Diamond Pass",
      category: "weekly-pass",
      categoryLabel: "Weekly Pass",
    });
  });

  it("matches by category keyword", async () => {
    const results = await searchStore("pass");
    expect(results.map((r) => r.id)).toContain("weekly-diamond-pass");
  });

  it("returns [] for queries shorter than 2 chars and never hits the DB", async () => {
    expect(await searchStore("")).toEqual([]);
    expect(await searchStore("  ")).toEqual([]);
    expect(await searchStore("7")).toEqual([]);
    expect(mockGetStoreProducts).not.toHaveBeenCalled();
  });

  it("returns [] when the rate limiter blocks the IP", async () => {
    mockSearchRateLimit.mockResolvedValueOnce({ success: false, reset: 0 });
    expect(await searchStore("diamonds")).toEqual([]);
  });

  it("falls back to the static catalog when there is no live snapshot", async () => {
    mockGetStoreProducts.mockResolvedValueOnce(null);
    const results = await searchStore("twilight");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ id: "7", name: "Twilight Pass" });
    // Static catalog synthesizes the full label from name + bonus.
    expect(results[0].label).toBe("Twilight Pass");
  });

  it("caps results at 6", async () => {
    mockGetStoreProducts.mockResolvedValueOnce(
      Array.from({ length: 9 }, (_, i) => ({
        id: `p-${i}`,
        name: `Diamonds Pack ${i}`,
        bonus: "",
        label: `Diamonds Pack ${i}`,
        image: "/products/diamantes.png",
        category: "diamonds" as const,
        priceUsdCents: 100,
        priceEurCents: 90,
      }))
    );
    const results = await searchStore("diamonds");
    expect(results).toHaveLength(6);
  });
});
