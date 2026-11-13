import { describe, it, expect, vi } from "vitest";

// The pure builder is tested without a DB; the module chain pulls in
// @/lib/db (libsql client) through the async helpers, so it is stubbed here.
vi.mock("@/lib/db", () => ({ db: {} }));

import { applyMarkupCents } from "@/lib/markup";
import {
  buildComboProducts,
  buildStoreProducts,
  type SupplierCostRow,
} from "@/lib/store-catalog";
import type { StoreComboDef } from "@/lib/store-combos";

// Fixture shaped like the real scraper output (scrapers/output/*.json after
// parsing), with checkout prices in integer cents.
const ROWS: SupplierCostRow[] = [
  { packageName: "78 Diamonds + 8 Bonus", checkoutUsdCents: 129, checkoutEurCents: 113, checkoutArsCents: 200000 },
  { packageName: "Weekly Diamond Pass", checkoutUsdCents: 165, checkoutEurCents: 144, checkoutArsCents: 255000 },
  { packageName: "156 Diamonds + 16 Bonus", checkoutUsdCents: 258, checkoutEurCents: 225, checkoutArsCents: 400000 },
  { packageName: "Twilight Pass", checkoutUsdCents: 852, checkoutEurCents: 742, checkoutArsCents: 1320000 },
  { packageName: "7740 Diamonds + 1548 Bonus", checkoutUsdCents: 12912, checkoutEurCents: 11246, checkoutArsCents: 20000000 },
  // No checkout price at all: the package cannot be sold in any region.
  { packageName: "Starlight Member", checkoutUsdCents: null, checkoutEurCents: null, checkoutArsCents: null },
];

// No game-level default markup anymore: items without an explicit override
// sell AT COST. The 5% used across these fixtures is an item override map.
const PER_ITEM_5 = new Map([
  ["78-diamonds-8-bonus", { markupUsd: 0.05, markupEur: 0.05, markupArs: 0 }],
  ["weekly-diamond-pass", { markupUsd: 0.05, markupEur: 0.05, markupArs: 0 }],
  ["156-diamonds-16-bonus", { markupUsd: 0.05, markupEur: 0.05, markupArs: 0 }],
  ["twilight-pass", { markupUsd: 0.05, markupEur: 0.05, markupArs: 0 }],
  ["7740-diamonds-1548-bonus", { markupUsd: 0.05, markupEur: 0.05, markupArs: 0 }],
]);

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
  const products = buildStoreProducts(ROWS, PER_ITEM_5);

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
    expect(diamonds?.priceArsCents).toBe(200000); // ARS sale price (no markup)
  });

  it("applies the ARS markup to the Argentine sale price", () => {
    const withArsMarkup = buildStoreProducts(
      ROWS,
      new Map([["78-diamonds-8-bonus", { markupUsd: 0, markupEur: 0, markupArs: 0.05 }]])
    );
    const diamonds = withArsMarkup.find((p) => p.id === "78-diamonds-8-bonus");
    expect(diamonds?.priceArsCents).toBe(210000); // 200000 * 1.05
  });

  it("sells AT COST for any item without its own markup", () => {
    const noMarkups = buildStoreProducts(ROWS, new Map());
    const diamonds = noMarkups.find((p) => p.id === "78-diamonds-8-bonus");
    expect(diamonds?.priceUsdCents).toBe(129); // == supplier checkout cost
    expect(diamonds?.priceEurCents).toBe(113);
    expect(diamonds?.priceArsCents).toBe(200000);
  });

  it("applies a per-item markup override only to that package", () => {
    // "78 Diamonds": 2% USD / 10% EUR for this package only.
    const overrides = new Map([
      ["78-diamonds-8-bonus", { markupUsd: 0.02, markupEur: 0.1, markupArs: 0 }],
    ]);
    const withOverrides = buildStoreProducts(ROWS, overrides);
    const tuned = withOverrides.find((p) => p.id === "78-diamonds-8-bonus");
    expect(tuned?.priceUsdCents).toBe(132); // 129 * 1.02
    expect(tuned?.priceEurCents).toBe(124); // 113 * 1.10 -> 124.3
    // Other packages have no markup: they sell at cost.
    const untouched = withOverrides.find((p) => p.id === "156-diamonds-16-bonus");
    expect(untouched?.priceUsdCents).toBe(258);
  });

  it("keeps a region unsellable when its checkout price is missing", () => {
    const usdOnly = buildStoreProducts(
      [{ packageName: "100 Diamonds", checkoutUsdCents: 200, checkoutEurCents: null, checkoutArsCents: null }]
    );
    expect(usdOnly[0]?.priceUsdCents).toBe(200); // no markup -> at cost
    expect(usdOnly[0]?.priceEurCents).toBeNull();
    expect(usdOnly[0]?.priceArsCents).toBeNull();
  });

  it("keeps selling a package that only has an ARS checkout price", () => {
    const arsOnly = buildStoreProducts(
      [{ packageName: "100 Diamonds", checkoutUsdCents: null, checkoutEurCents: null, checkoutArsCents: 310000 }]
    );
    expect(arsOnly).toHaveLength(1);
    expect(arsOnly[0]?.priceArsCents).toBe(310000);
    expect(arsOnly[0]?.priceUsdCents).toBeNull();
  });

  it("generates unique ids when two packages share a name", () => {
    const dupes = buildStoreProducts(
      [
        { packageName: "78 Diamonds + 8 Bonus", checkoutUsdCents: 129, checkoutEurCents: 113 },
        { packageName: "78 Diamonds + 8 Bonus", checkoutUsdCents: 130, checkoutEurCents: 114 },
      ]
    );
    expect(dupes[0]?.id).toBe("78-diamonds-8-bonus");
    expect(dupes[1]?.id).toBe("78-diamonds-8-bonus-2");
  });

  it("falls back to a generic image for pass categories without art", () => {
    const bundle = buildStoreProducts(
      [{ packageName: "Special Bundle x5", checkoutUsdCents: 500, checkoutEurCents: 450 }]
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

  it("sums component checkout costs with quantities, then applies the combo's markup", () => {
    // 3x Weekly Diamond Pass (165 USD / 144 EUR / 255000 ARS each)
    // = 495 USD / 432 EUR / 765000 ARS
    // With the combo's own 5%: 495*1.05 = 519.75 -> 520 ; 432*1.05 = 453.6 -> 454
    const [combo] = buildComboProducts(
      ROWS,
      [makeCombo([{ packageName: "Weekly Diamond Pass", qty: 3 }], "3x Weekly Diamond Pass")],
      new Map([["combo-abc123", { markupUsd: 0.05, markupEur: 0.05, markupArs: 0.05 }]])
    );
    expect(combo).toMatchObject({
      id: "combo-abc123",
      name: "3x Weekly Diamond Pass",
      label: "3x Weekly Diamond Pass",
      priceUsdCents: 520,
      priceEurCents: 454,
      priceArsCents: 803250, // 765000 * 1.05 = 803250
    });
  });

  it("combines different packages into a mixed bundle (at cost without markup)", () => {
    // 1x Weekly (165 USD) + 2x 78 Diamonds (129 USD each) = 423 USD
    const [combo] = buildComboProducts(
      ROWS,
      [makeCombo([
        { packageName: "Weekly Diamond Pass", qty: 1 },
        { packageName: "78 Diamonds + 8 Bonus", qty: 2 },
      ])]
    );
    expect(combo.priceUsdCents).toBe(423); // no combo markup -> at cost
    // Components span two categories -> lands in "bundle".
    expect(combo.category).toBe("bundle");
    expect(combo.image).toBe("/products/baul6.png");
  });

  it("keeps the component category and art when every component matches", () => {
    const [combo] = buildComboProducts(
      ROWS,
      [makeCombo([{ packageName: "Twilight Pass", qty: 2 }])]
    );
    expect(combo.category).toBe("twilight-pass");
    expect(combo.image).toBe("/products/pass5.png");
  });

  it("is unsellable in a currency when a component lacks that price", () => {
    const rows: SupplierCostRow[] = [
      { packageName: "USD only pack", checkoutUsdCents: 500, checkoutEurCents: null, checkoutArsCents: null },
    ];
    const [combo] = buildComboProducts(rows, [makeCombo([{ packageName: "USD only pack", qty: 2 }])]);
    expect(combo.priceUsdCents).toBe(1000); // 500 * 2, no markup
    expect(combo.priceEurCents).toBeNull();
    expect(combo.priceArsCents).toBeNull();
  });

  it("drops combos whose components are not in the latest snapshot", () => {
    const combos = buildComboProducts(
      ROWS,
      [makeCombo([{ packageName: "Paquete eliminado", qty: 1 }])]
    );
    expect(combos).toEqual([]);
  });

  it("ignores combos with an empty component list", () => {
    expect(buildComboProducts(ROWS, [makeCombo([])])).toEqual([]);
  });

  it("applies the combo's own per-currency markup", () => {
    // At cost it would be 495 USD / 432 EUR; with 10%: 545 / 475.
    const [combo] = buildComboProducts(
      ROWS,
      [makeCombo([{ packageName: "Weekly Diamond Pass", qty: 3 }], "3x Weekly")],
      new Map([["combo-abc123", { markupUsd: 0.1, markupEur: 0.1, markupArs: 0 }]])
    );
    expect(combo.priceUsdCents).toBe(545); // 495 * 1.10 = 544.5 -> 545
    expect(combo.priceEurCents).toBe(475); // 432 * 1.10 = 475.2 -> 475
  });
});
