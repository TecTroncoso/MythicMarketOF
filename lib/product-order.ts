// Storefront display order for the Select Top-Up grid.
//
// Supplier snapshots arrive in arbitrary order and mix passes with diamond
// packages. The storefront shows:
//   1. passes (weekly, twilight, starlight), ascending by pass quantity;
//   2. diamond packages, ascending by TOTAL diamonds (base + bonus);
//   3. bundles/combos, keeping their original relative order.
//
// Pure helpers so the grid and Vitest share the exact same rules.

import type { ProductCategory } from "@/lib/catalog";

export interface OrderableProduct {
  name: string;
  bonus: string;
  category: ProductCategory;
}

const PASS_CATEGORIES: ReadonlySet<ProductCategory> = new Set([
  "weekly-pass",
  "twilight-pass",
  "starlight",
]);

/** Tie-break between passes with the same quantity (weekly -> twilight -> starlight). */
const PASS_CATEGORY_RANK: Partial<Record<ProductCategory, number>> = {
  "weekly-pass": 0,
  "twilight-pass": 1,
  starlight: 2,
};

function firstNumber(text: string): number | null {
  const match = text.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function isPass(category: ProductCategory): boolean {
  return PASS_CATEGORIES.has(category);
}

/**
 * Passes contained in a package: "3x Weekly Diamond Pass" -> 3,
 * "Weekly Diamond Pass" -> 1. Handles the multiplier before the name
 * ("3x ...") and after it ("... x3").
 */
export function passQuantity(product: OrderableProduct): number {
  const leading = product.name.match(/^\s*(\d+)\s*x\b/i);
  if (leading) return Number(leading[1]);
  const trailing = product.name.match(/\bx\s*(\d+)\b/i);
  if (trailing) return Number(trailing[1]);
  return firstNumber(product.name) ?? 1;
}

/**
 * Total diamonds granted by a package: base + bonus. A leading/trailing
 * multiplier is applied to the whole package ("2x 78 Diamonds" -> 156).
 * Promo text such as "Save 60%" is not a diamond amount and is ignored;
 * "8 Diamonds" or "8 Bonus" counts as 8.
 */
export function diamondTotal(product: OrderableProduct): number {
  const name = product.name.trim();
  let quantity = 1;
  let baseText = name;

  const leading = name.match(/^(\d+)\s*x\s*(.+)$/i);
  const trailing = leading ? null : name.match(/^(.*?)\s*x\s*(\d+)$/i);
  if (leading) {
    quantity = Number(leading[1]);
    baseText = leading[2];
  } else if (trailing) {
    quantity = Number(trailing[2]);
    baseText = trailing[1];
  }

  const base = firstNumber(baseText) ?? 0;
  const bonusText = product.bonus.trim();
  const hasBonusAmount =
    /\d/.test(bonusText) && !/%|save|off|discount/i.test(bonusText);
  const bonus = hasBonusAmount ? firstNumber(bonusText) ?? 0 : 0;
  return (base + bonus) * quantity;
}

function rank(product: OrderableProduct): number {
  if (isPass(product.category)) return 0;
  if (product.category === "diamonds") return 1;
  return 2;
}

function compareNames(a: OrderableProduct, b: OrderableProduct): number {
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

function compareProducts(a: OrderableProduct, b: OrderableProduct): number {
  const rankDiff = rank(a) - rank(b);
  if (rankDiff !== 0) return rankDiff;

  if (isPass(a.category) && isPass(b.category)) {
    const quantityDiff = passQuantity(a) - passQuantity(b);
    if (quantityDiff !== 0) return quantityDiff;
    const categoryDiff =
      (PASS_CATEGORY_RANK[a.category] ?? 0) -
      (PASS_CATEGORY_RANK[b.category] ?? 0);
    if (categoryDiff !== 0) return categoryDiff;
    return compareNames(a, b);
  }

  if (a.category === "diamonds" && b.category === "diamonds") {
    const totalDiff = diamondTotal(a) - diamondTotal(b);
    if (totalDiff !== 0) return totalDiff;
    return compareNames(a, b);
  }

  // Bundles/combos keep the supplier order (stable sort).
  return 0;
}

/**
 * Returns a NEW array with the storefront order. The input is never mutated.
 */
export function sortStorefrontProducts<T extends OrderableProduct>(
  products: readonly T[]
): T[] {
  return products
    .map((product, index) => ({ product, index }))
    .sort(
      (a, b) => compareProducts(a.product, b.product) || a.index - b.index
    )
    .map(({ product }) => product);
}
