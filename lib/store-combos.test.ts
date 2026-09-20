import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// DB is mocked: getStoreCombos() reads rows and parses their JSON payload
// defensively — a corrupt row must never break the storefront.

const mockWhere = vi.fn();
const mockFrom = vi.fn(() => ({ where: mockWhere }));
vi.mock("@/lib/db", () => ({
  db: { select: () => ({ from: mockFrom }) },
}));

const { getStoreCombos } = await import("@/lib/store-combos");

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getStoreCombos()", () => {
  it("parses valid combo rows", async () => {
    mockWhere.mockResolvedValueOnce([
      {
        id: "c1",
        name: "3x Weekly Diamond Pass",
        components: JSON.stringify([{ packageName: "Weekly Diamond Pass", qty: 3 }]),
      },
    ]);
    const combos = await getStoreCombos("mlbb");
    expect(combos).toEqual([
      {
        id: "c1",
        name: "3x Weekly Diamond Pass",
        components: [{ packageName: "Weekly Diamond Pass", qty: 3 }],
      },
    ]);
  });

  it("skips rows with corrupt or empty components", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockWhere.mockResolvedValueOnce([
      { id: "bad-json", name: "roto", components: "{not json" },
      { id: "empty", name: "vacio", components: "[]" },
      { id: "bad-qty", name: "qty cero", components: JSON.stringify([{ packageName: "X", qty: 0 }]) },
      { id: "ok", name: "bueno", components: JSON.stringify([{ packageName: "X", qty: 2 }]) },
    ]);
    const combos = await getStoreCombos("mlbb");
    expect(combos.map((c) => c.id)).toEqual(["ok"]);
    consoleSpy.mockRestore();
  });

  it("returns [] when the table read fails (migration pending)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockWhere.mockRejectedValueOnce(new Error("no such table: store_combos"));
    const combos = await getStoreCombos("mlbb");
    expect(combos).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
  });
});
