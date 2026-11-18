import { describe, it, expect } from "vitest";

import {
  diamondTotal,
  passQuantity,
  sortStorefrontProducts,
  type OrderableProduct,
} from "@/lib/product-order";

function product(
  name: string,
  category: OrderableProduct["category"],
  bonus = ""
): OrderableProduct {
  return { name, bonus, category };
}

describe("passQuantity()", () => {
  it("reads the multiplier before the name", () => {
    expect(passQuantity(product("3x Weekly Diamond Pass", "weekly-pass"))).toBe(3);
    expect(passQuantity(product("10x Weekly Diamond Pass", "weekly-pass"))).toBe(10);
  });

  it("reads the multiplier after the name", () => {
    expect(passQuantity(product("Weekly Diamond Pass x5", "weekly-pass"))).toBe(5);
  });

  it("defaults a single pass to 1", () => {
    expect(passQuantity(product("Weekly Diamond Pass", "weekly-pass"))).toBe(1);
    expect(passQuantity(product("Twilight Pass", "twilight-pass"))).toBe(1);
    expect(passQuantity(product("Starlight Member", "starlight"))).toBe(1);
  });
});

describe("diamondTotal()", () => {
  it("adds the bonus diamonds to the base amount", () => {
    expect(diamondTotal(product("78 Diamonds", "diamonds", "8 Diamonds"))).toBe(86);
    expect(diamondTotal(product("625 Diamonds", "diamonds", "81 Diamonds"))).toBe(706);
    expect(diamondTotal(product("7740 Diamonds", "diamonds", "1548 Bonus"))).toBe(9288);
  });

  it("accepts a bare numeric bonus", () => {
    expect(diamondTotal(product("156 Diamonds", "diamonds", "16"))).toBe(172);
  });

  it("applies a package multiplier to the whole diamond total", () => {
    expect(diamondTotal(product("2x 78 Diamonds", "diamonds"))).toBe(156);
    expect(diamondTotal(product("3x 78 Diamonds", "diamonds", "8 Diamonds"))).toBe(258);
    expect(diamondTotal(product("78 Diamonds x2", "diamonds"))).toBe(156);
  });

  it("ignores promo text that is not a diamond amount", () => {
    expect(diamondTotal(product("Weekly Diamond Pass", "weekly-pass", "Save 60%"))).toBe(0);
  });
});

describe("sortStorefrontProducts()", () => {
  it("puts passes first and diamonds after them", () => {
    const sorted = sortStorefrontProducts([
      product("78 Diamonds", "diamonds", "8 Diamonds"),
      product("Twilight Pass", "twilight-pass"),
      product("Weekly Diamond Pass", "weekly-pass"),
    ]);

    expect(sorted.map((p) => p.name)).toEqual([
      "Weekly Diamond Pass",
      "Twilight Pass",
      "78 Diamonds",
    ]);
  });

  it("orders passes from lowest to highest quantity", () => {
    const sorted = sortStorefrontProducts([
      product("10x Weekly Diamond Pass", "weekly-pass"),
      product("Weekly Diamond Pass", "weekly-pass"),
      product("3x Weekly Diamond Pass", "weekly-pass"),
      product("5x Weekly Diamond Pass", "weekly-pass"),
    ]);

    expect(sorted.map(passQuantity)).toEqual([1, 3, 5, 10]);
  });

  it("orders diamonds by base + bonus, not by the base number alone", () => {
    const sorted = sortStorefrontProducts([
      product("100 Diamonds", "diamonds"),
      product("156 Diamonds", "diamonds", "16 Diamonds"),
      product("78 Diamonds", "diamonds", "8 Diamonds"),
      product("90 Diamonds", "diamonds"),
    ]);

    // 78+8=86 < 90 < 100 < 156+16=172
    expect(sorted.map((p) => p.name)).toEqual([
      "78 Diamonds",
      "90 Diamonds",
      "100 Diamonds",
      "156 Diamonds",
    ]);
  });

  it("keeps bundles after diamonds and preserves their supplier order", () => {
    const sorted = sortStorefrontProducts([
      product("Starter Bundle", "bundle"),
      product("78 Diamonds", "diamonds", "8 Diamonds"),
      product("Mega Bundle", "bundle"),
      product("Weekly Diamond Pass", "weekly-pass"),
    ]);

    expect(sorted.map((p) => p.name)).toEqual([
      "Weekly Diamond Pass",
      "78 Diamonds",
      "Starter Bundle",
      "Mega Bundle",
    ]);
  });

  it("does not mutate the input array", () => {
    const input = [
      product("78 Diamonds", "diamonds", "8 Diamonds"),
      product("Weekly Diamond Pass", "weekly-pass"),
    ];
    const snapshot = [...input];

    sortStorefrontProducts(input);

    expect(input).toEqual(snapshot);
  });
});
