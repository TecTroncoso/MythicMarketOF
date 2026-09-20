import { describe, it, expect, vi } from "vitest";

// The pure builder is tested without a DB; the module chain pulls in
// @/lib/db (libsql client) through the async helpers, so it is stubbed here.
vi.mock("@/lib/db", () => ({ db: {} }));

import { applyMarkupCents } from "@/lib/pricing-settings";
import {
  buildComboProducts,
  buildStoreProducts,
  type SupplierCostRow,
} from "@/lib/store-catalog";
import type { StoreComboDef } from "@/lib/store-combos";

// Fixture shaped like the real scraper output (scrapers/output/*.json after
// parsing), with checkout prices in integer cents.
const ROWS: SupplierCostRow[] = [
  { packageName: "78 Diamonds + 8 Bonus", checkoutUsdCents: 129, checkoutEurCents: 113 },
  { packageName: "Weekly Diamond Pass", checkoutUsdCents: 165, checkoutEurCents: 144 },
  { packageName: "156 Diamonds + 16 Bonus", checkoutUsdCents: 258, checkoutEurCents: 225 },
  { packageName: "Twilight Pass", checkoutUsdCents: 852, checkoutEurCents: 742 },
  { packageName: "7740 Diamonds + 1548 Bonus", checkoutUsdCents: 12912, checkoutEurCents: 11246 },
  // No checkout price at all: the package cannot be sold in any region.
  { packageName: "Starlight Member", checkoutUsdCents: null, checkoutEurCents: null },
];

const SETTINGS = { markupUsd: 0.05, markupEur: 0.05 };

describe("applyMarkupCents()", () => {
  it("applies the markup and rounds to whole cents", () => {
    expect(applyMarkupCents(129, 0.05)).toBe(135); // 135.45 -> 135
    expect(applyMarkupCents(100, 0.1)).toBe(110);
    expect(applyMarkupCents(113, 0.05)).toBe(119); // 118.65 -> 119
  });

  it("keeps the price with a zero markup", () => {
    expect(applyMarkupCents(129, 0)).toBe(129);
  });
});

describe("buildStoreProducts()", () => {
  const products = buildStoreProducts(ROWS, SETTINGS);

  it("drops rows without any checkout price", () => {
    expect(products).toHaveLength(5);
    expect(products.some((p) => p.name === "Starlight Member")).toBe(false);
  });

  it("splits package names into name + bonus using the static catalog contract", () => {
    const diamonds = products.find((p) => p.id === "78-diamonds-8-bonus");
    expect(diamonds).toBeDefined();
    expect(diamonds?.name).toBe("78 Diamonds");
    // "8 Bonus" is converted to the static catalog bonus format.
    expect(diamonds?.bonus).toBe("8 Diamonds");
    // ...while the full supplier name is kept for order records.
    expect(diamonds?.label).toBe("78 Diamonds + 8 Bonus");
  });

  it("leaves bonus empty for pass products", () => {
    const weekly = products.find((p) => p.id === "weekly-diamond-pass");
    expect(weekly).toMatchObject({ name: "Weekly Diamond Pass", bonus: "", category: "weekly-pass" });
  });

  it("derives the category from the package name", () => {
    expect(products.find((p) => p.id === "twilight-pass")?.category).toBe("twilight-pass");
    expect(products.find((p) => p.id === "weekly-diamond-pass")?.category).toBe("weekly-pass");
    expect(products.find((p) => p.id === "78-diamonds-8-bonus")?.category).toBe("diamonds");
  });

  it("picks package art by diamond amount", () => {
    expect(products.find((p) => p.id === "78-diamonds-8-bonus")?.image).toBe("/products/diamantes.png");
    expect(products.find((p) => p.id === "156-diamonds-16-bonus")?.image).toBe("/products/baul.png");
    expect(products.find((p) => p.id === "7740-diamonds-1548-bonus")?.image).toBe("/products/baul6.png");
    expect(products.find((p) => p.id === "weekly-diamond-pass")?.image).toBe("/products/pass1.png");
    expect(products.find((p) => p.id === "twilight-pass")?.image).toBe("/products/pass5.png");
  });

  it("applies the per-currency markup to the checkout costs", () => {
    const diamonds = products.find((p) => p.id === "78-diamonds-8-bonus");
    expect(diamonds?.priceUsdCents).toBe(135); // LATAM sale price
    expect(diamonds?.priceEurCents).toBe(119); // EU sale price
  });

  it("keeps a region unsellable when its checkout price is missing", () => {
    const usdOnly = buildStoreProducts(
      [{ packageName: "100 Diamonds", checkoutUsdCents: 200, checkoutEurCents: null }],
      SETTINGS
    );
    expect(usdOnly[0]?.priceUsdCents).toBe(210);
    expect(usdOnly[0]?.priceEurCents).toBeNull();
  });

  it("generates unique ids when two packages share a name", () => {
    const dupes = buildStoreProducts(
      [
        { packageName: "78 Diamonds + 8 Bonus", checkoutUsdCents: 129, checkoutEurCents: 113 },
        { packageName: "78 Diamonds + 8 Bonus", checkoutUsdCents: 130, checkoutEurCents: 114 },
      ],
      SETTINGS
    );
    expect(dupes[0]?.id).toBe("78-diamonds-8-bonus");
    expect(dupes[1]?.id).toBe("78-diamonds-8-bonus-2");
  });

  it("falls back to a generic image for pass categories without art", () => {
    const bundle = buildStoreProducts(
      [{ packageName: "Special Bundle x5", checkoutUsdCents: 500, checkoutEurCents: 450 }],
      SETTINGS
    );
    expect(bundle[0]?.category).toBe("bundle");
    expect(bundle[0]?.image).toBe("/products/baul6.png");
  });
});

describe("buildComboProducts()", () => {
  const makeCombo = (components: StoreComboDef["components"], name = "Mi combo"): StoreComboDef => ({
    id: "abc123",
    name,
    components,
  });

  it("sums component checkout costs with quantities, then applies the markup", () => {
    // 3x Weekly Diamond Pass (165 USD / 144 EUR each) = 495 USD / 432 EUR
    // With 5% markup: 495*1.05 = 519.75 -> 520 ; 432*1.05 = 453.6 -> 454
    const [combo] = buildComboProducts(
      ROWS,
      [makeCombo([{ packageName: "Weekly Diamond Pass", qty: 3 }], "3x Weekly Diamond Pass")],
      SETTINGS
    );
    expect(combo).toMatchObject({
      id: "combo-abc123",
      name: "3x Weekly Diamond Pass",
      label: "3x Weekly Diamond Pass",
      priceUsdCents: 520,
      priceEurCents: 454,
    });
  });

  it("combines different packages into a mixed bundle", () => {
    // 1x Weekly (165 USD) + 2x 78 Diamonds (129 USD each) = 423 USD
    const [combo] = buildComboProducts(
      ROWS,
      [makeCombo([
        { packageName: "Weekly Diamond Pass", qty: 1 },
        { packageName: "78 Diamonds + 8 Bonus", qty: 2 },
      ])],
      SETTINGS
    );
    expect(combo.priceUsdCents).toBe(Math.round(423 * 1.05));
    // Components span two categories -> lands in "bundle".
    expect(combo.category).toBe("bundle");
    expect(combo.image).toBe("/products/baul6.png");
  });

  it("keeps the component category and art when every component matches", () => {
    const [combo] = buildComboProducts(
      ROWS,
      [makeCombo([{ packageName: "Twilight Pass", qty: 2 }])],
      SETTINGS
    );
    expect(combo.category).toBe("twilight-pass");
    expect(combo.image).toBe("/products/pass5.png");
  });

  it("is unsellable in a currency when a component lacks that price", () => {
    const rows: SupplierCostRow[] = [
      { packageName: "USD only pack", checkoutUsdCents: 500, checkoutEurCents: null },
    ];
    const [combo] = buildComboProducts(rows, [makeCombo([{ packageName: "USD only pack", qty: 2 }])], SETTINGS);
    expect(combo.priceUsdCents).toBe(1050); // 500 * 2 = 1000, * 1.05 = 1050
    expect(combo.priceEurCents).toBeNull();
  });

  it("drops combos whose components are not in the latest snapshot", () => {
    const combos = buildComboProducts(
      ROWS,
      [makeCombo([{ packageName: "Paquete eliminado", qty: 1 }])],
      SETTINGS
    );
    expect(combos).toEqual([]);
  });

  it("ignores combos with an empty component list", () => {
    expect(buildComboProducts(ROWS, [makeCombo([])], SETTINGS)).toEqual([]);
  });
});
