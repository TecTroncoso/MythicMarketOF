import { describe, it, expect, vi, beforeEach } from "vitest";

// Covers the READ path of getStoreProducts: the Upstash/in-memory cache that
// shields Turso from every storefront mount, search keystroke and checkout.
// buildStoreProducts/buildComboProducts are covered by store-catalog.test.ts.

vi.mock("@/lib/db", () => ({ db: {} }));

const { mockCacheGet, mockCacheSet, mockCacheDelete, mockGetLatest, mockGetCombos, mockGetMarkups } =
  vi.hoisted(() => ({
    mockCacheGet: vi.fn(),
    mockCacheSet: vi.fn(),
    mockCacheDelete: vi.fn(),
    mockGetLatest: vi.fn(),
    mockGetCombos: vi.fn(),
    mockGetMarkups: vi.fn(),
  }));

vi.mock("@/lib/cache", () => ({
  cacheGet: mockCacheGet,
  cacheSet: mockCacheSet,
  cacheDelete: mockCacheDelete,
}));
vi.mock("@/lib/supplier-prices", () => ({ getLatestSupplierSnapshot: mockGetLatest }));
vi.mock("@/lib/store-combos", () => ({ getStoreCombos: mockGetCombos }));
vi.mock("@/lib/item-markups", () => ({
  getItemMarkups: mockGetMarkups,
  itemMarkupFor: (key: string, m?: Map<string, { markupUsd: number; markupEur: number }>) =>
    m?.get(key) ?? { markupUsd: 0, markupEur: 0 },
}));

const { getStoreProducts, invalidateStoreCatalog } = await import("@/lib/store-catalog");

const SNAPSHOT = {
  snapshot: { id: "s1", scrapedAt: new Date(), importedAt: new Date(), totalPackages: 1 },
  rows: [
    {
      id: "r1",
      snapshotId: "s1",
      packageName: "78 Diamonds + 8 Bonus",
      position: 0,
      catalogBrlCents: null,
      checkoutBrlCents: null,
      cashbackBrlCents: null,
      catalogUsdCents: null,
      checkoutUsdCents: 129,
      cashbackUsdCents: null,
      catalogEurCents: null,
      checkoutEurCents: 113,
      cashbackEurCents: null,
      cashbackPercent: 10,
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockCacheGet.mockResolvedValue(null);
  mockGetLatest.mockResolvedValue(SNAPSHOT);
  mockGetCombos.mockResolvedValue([]);
  mockGetMarkups.mockResolvedValue(new Map());
});

describe("getStoreProducts() cache behaviour", () => {
  it("serves from cache without touching Turso on a hit", async () => {
    const CACHED = [{ id: "78-diamonds-8-bonus", name: "78 Diamonds", label: "78 Diamonds + 8 Bonus", priceUsdCents: 129, priceEurCents: 113, image: "/products/diamantes.png", category: "diamonds", bonus: "8 Diamonds" }];
    mockCacheGet.mockResolvedValueOnce(CACHED);

    const result = await getStoreProducts("mlbb");

    expect(result).toEqual(CACHED);
    expect(mockCacheGet).toHaveBeenCalledWith("catalog:mlbb");
    expect(mockGetLatest).not.toHaveBeenCalled();
    expect(mockCacheSet).not.toHaveBeenCalled();
  });

  it("misses build from Turso and write back with TTL 60s", async () => {
    const result = await getStoreProducts("mlbb");

    expect(mockGetLatest).toHaveBeenCalledWith("mlbb");
    expect(result).not.toBeNull();
    expect(result![0]).toMatchObject({ id: "78-diamonds-8-bonus", priceUsdCents: 129 }); // markup 0 => at cost
    expect(mockCacheSet).toHaveBeenCalledWith("catalog:mlbb", result, 60);
  });

  it("returns null without caching when the game has no snapshot (fallback stays fast)", async () => {
    mockGetLatest.mockResolvedValueOnce(null);
    const result = await getStoreProducts("mlbb");
    expect(result).toBeNull();
    expect(mockCacheSet).not.toHaveBeenCalled();
  });
});

describe("invalidateStoreCatalog()", () => {
  it("deletes the game catalog cache entry", async () => {
    await invalidateStoreCatalog("mlbb");
    expect(mockCacheDelete).toHaveBeenCalledWith("catalog:mlbb");
  });
});
