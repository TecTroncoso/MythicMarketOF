import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// DB mocked: getItemMarkups() must degrade to an empty map on failure so the
// storefront keeps pricing with the game defaults.

const mockWhere = vi.fn();
const mockFrom = vi.fn(() => ({ where: mockWhere }));
vi.mock("@/lib/db", () => ({
  db: { select: () => ({ from: mockFrom }) },
}));

const { getItemMarkups, itemMarkupFor } = await import("@/lib/item-markups");

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getItemMarkups()", () => {
  it("keyes overrides by itemKey", async () => {
    mockWhere.mockResolvedValueOnce([
      { itemKey: "78-diamonds-8-bonus", markupUsd: 0.03, markupEur: 0.04 },
      { itemKey: "combo-abc", markupUsd: 0.1, markupEur: 0.1 },
    ]);
    const map = await getItemMarkups("mlbb");
    expect(map.get("78-diamonds-8-bonus")).toEqual({ markupUsd: 0.03, markupEur: 0.04 });
    expect(map.get("combo-abc")).toEqual({ markupUsd: 0.1, markupEur: 0.1 });
    expect(map.size).toBe(2);
  });

  it("returns an empty map when the read fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockWhere.mockRejectedValueOnce(new Error("no such table: item_markups"));
    const map = await getItemMarkups("mlbb");
    expect(map.size).toBe(0);
    expect(consoleSpy).toHaveBeenCalled();
  });
});

describe("itemMarkupFor()", () => {
  it("returns the item's own markup when present", () => {
    const map = new Map([["p1", { markupUsd: 0.02, markupEur: 0.09 }]]);
    expect(itemMarkupFor("p1", map)).toEqual({ markupUsd: 0.02, markupEur: 0.09 });
  });

  it("falls back to ZERO (sell at cost) when the item has no markup", () => {
    expect(itemMarkupFor("p1", new Map())).toEqual({ markupUsd: 0, markupEur: 0 });
    expect(itemMarkupFor("p1", undefined)).toEqual({ markupUsd: 0, markupEur: 0 });
  });
});
