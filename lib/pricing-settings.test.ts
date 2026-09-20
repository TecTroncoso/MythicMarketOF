import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// The DB is mocked: getPricingSettings() must never leak a Drizzle error to
// the storefront; it falls back to the defaults instead.

const mockLimit = vi.fn();
const mockWhere = vi.fn(() => ({ limit: mockLimit }));
const mockFrom = vi.fn(() => ({ where: mockWhere }));
vi.mock("@/lib/db", () => ({
  db: { select: () => ({ from: mockFrom }) },
}));

const { getPricingSettings, DEFAULT_PRICING_SETTINGS } = await import(
  "@/lib/pricing-settings"
);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getPricingSettings()", () => {
  it("returns the stored markups when the game has a row", async () => {
    mockLimit.mockResolvedValueOnce([{ markupUsd: 0.08, markupEur: 0.12 }]);
    const settings = await getPricingSettings("mlbb");
    expect(settings).toEqual({ markupUsd: 0.08, markupEur: 0.12 });
  });

  it("falls back to the defaults when there is no row yet", async () => {
    mockLimit.mockResolvedValueOnce([]);
    const settings = await getPricingSettings("mlbb");
    expect(settings).toEqual(DEFAULT_PRICING_SETTINGS);
  });

  it("falls back to the defaults when the table read fails (e.g. migration pending)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockLimit.mockRejectedValueOnce(new Error("no such table: pricing_settings"));
    const settings = await getPricingSettings("mlbb");
    expect(settings).toEqual(DEFAULT_PRICING_SETTINGS);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("defaults to a 5% markup on both currencies", () => {
    expect(DEFAULT_PRICING_SETTINGS).toEqual({ markupUsd: 0.05, markupEur: 0.05 });
  });
});
