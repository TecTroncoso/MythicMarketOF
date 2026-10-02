import { describe, it, expect, vi, beforeEach } from "vitest";

// Covers the READ path of getStoreProducts: the Next.js Data Cache (free on
// Vercel, no Upstash) that shields Turso from every storefront mount, search
// keystroke and checkout read. The mock emulates unstable_cache with a real
// in-memory store keyed by keyParts, plus revalidateTag as a spy.

vi.mock("@/lib/db", () => ({ db: {} }));

const { mockGetLatest, mockGetCombos, mockGetMarkups, mockRevalidateTag } = vi.hoisted(() => ({
  mockGetLatest: vi.fn(),
  mockGetCombos: vi.fn(),
  mockGetMarkups: vi.fn(),
  mockRevalidateTag: vi.fn(),
}));

const cacheStore = new Map<string, unknown>();
const cacheTags: Record<string, string[]> = {};

vi.mock("next/cache", () => ({
  unstable_cache: (
    fn: () => Promise<unknown>,
    keyParts: string[],
    opts?: { revalidate?: number; tags?: string[] }
  ) => {
    if (opts?.tags) cacheTags[keyParts.join("|")] = opts.tags;
    return async () => {
      const key = keyParts.join("|");
      if (cacheStore.has(key)) return cacheStore.get(key);
      const value = await fn();
      cacheStore.set(key, value);
      return value;
    };
  },
  revalidateTag: mockRevalidateTag,
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

describe("getStoreProducts() Data Cache behaviour", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cacheStore.clear();
    for (const key of Object.keys(cacheTags)) delete cacheTags[key];
    mockGetLatest.mockResolvedValue(SNAPSHOT);
    mockGetCombos.mockResolvedValue([]);
    mockGetMarkups.mockResolvedValue(new Map());
  });

  it("builds from Turso on a miss and reuses the Data Cache on a hit", async () => {
    const first = await getStoreProducts("mlbb");
    expect(first).not.toBeNull();
    expect(first![0]).toMatchObject({ id: "78-diamonds-8-bonus", priceUsdCents: 129 });
    expect(mockGetLatest).toHaveBeenCalledTimes(1);

    // Second call for the same game: served from the cache, Turso untouched.
    const second = await getStoreProducts("mlbb");
    expect(second).toEqual(first);
    expect(mockGetLatest).toHaveBeenCalledTimes(1);
  });

  it("registers the tag 'catalog:<game>' so admin actions can purge it", async () => {
    await getStoreProducts("mlbb");
    expect(cacheTags["store-catalog|mlbb"]).toEqual(["catalog:mlbb"]);
  });

  it("returns null (static fallback) when the game has no snapshot; the TTL bounds staleness", async () => {
    mockGetLatest.mockResolvedValueOnce(null);
    const result = await getStoreProducts("mlbb");
    expect(result).toBeNull();
    // unstable_cache also caches the null — the 60s TTL is the staleness bound
    // until the first scrape lands. No bug: documented in store-catalog.ts.
  });
});

describe("invalidateStoreCatalog()", () => {
  it("purges the catalog tag via revalidateTag", async () => {
    await invalidateStoreCatalog("mlbb");
    expect(mockRevalidateTag).toHaveBeenCalledWith("catalog:mlbb");
  });
});
