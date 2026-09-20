// Live storefront catalog: the Select Top-Up grid is fed by the LATEST
// supplier price snapshot (same rows shown in /admin/precios/[game]) instead
// of the static lib/catalog.ts list. Each supplier row becomes a store
// product whose sale price is its checkout cost marked up per currency
// (lib/pricing-settings.ts):
//
//   LATAM buyers see checkoutUsdCents * (1 + markupUsd)  — charged in USD
//   EU buyers    see checkoutEurCents * (1 + markupEur)  — charged in EUR
//
// buildStoreProducts() is pure so Vitest can exercise it without a DB;
// getStoreProducts() adds the snapshot + settings reads. Callers fall back
// to the static catalog when this returns null (no snapshot / DB error).

import type { ProductCategory } from "@/lib/catalog";
import { itemMarkupFor, getItemMarkups, type ItemMarkupMap } from "@/lib/item-markups";
import { applyMarkupCents, getPricingSettings, type GamePricingSettings } from "@/lib/pricing-settings";
import { getStoreCombos, type StoreComboDef } from "@/lib/store-combos";
import { getLatestSupplierSnapshot } from "@/lib/supplier-prices";

/** Minimal row shape the pure builder needs (subset of SupplierPriceRow). */
export interface SupplierCostRow {
  packageName: string;
  checkoutUsdCents: number | null;
  checkoutEurCents: number | null;
}

export interface StoreProduct {
  /** URL/order-safe stable id derived from the package name. */
  id: string;
  /** Display name ("78 Diamonds"). */
  name: string;
  /** Bonus suffix matching the static catalog contract ("8 Diamonds" | ""). */
  bonus: string;
  /** Full supplier package name ("78 Diamonds + 8 Bonus") — stored in orders. */
  label: string;
  image: string;
  category: ProductCategory;
  /** Sale price in integer cents, markup already applied. Null = not for sale in that currency. */
  priceUsdCents: number | null;
  priceEurCents: number | null;
}

const PASS_IMAGES: Partial<Record<ProductCategory, string>> = {
  "weekly-pass": "/products/pass1.png",
  "twilight-pass": "/products/pass5.png",
  starlight: "/products/pass3.png",
  bundle: "/products/baul6.png",
};

/** Diamond box art escalates with the base package size. */
const DIAMOND_ART: { maxPieces: number; image: string }[] = [
  { maxPieces: 100, image: "/products/diamantes.png" },
  { maxPieces: 200, image: "/products/baul.png" },
  { maxPieces: 300, image: "/products/baul1.png" },
  { maxPieces: 500, image: "/products/baul2.png" },
  { maxPieces: 800, image: "/products/baul3.png" },
  { maxPieces: 1500, image: "/products/baul4.png" },
  { maxPieces: 2500, image: "/products/baul5.png" },
];

function categorize(name: string): ProductCategory {
  const lower = name.toLowerCase();
  if (lower.includes("twilight")) return "twilight-pass";
  if (lower.includes("weekly")) return "weekly-pass";
  if (lower.includes("starlight")) return "starlight";
  if (lower.includes("bundle") || lower.includes("baul") || lower.includes("chest")) {
    return "bundle";
  }
  return "diamonds";
}

function imageFor(category: ProductCategory, name: string): string {
  if (category !== "diamonds") {
    return PASS_IMAGES[category] ?? "/products/diamantes.png";
  }
  const base = Number(name.match(/[\d\s]+/)?.[0]?.replace(/\s/g, ""));
  const tier = DIAMOND_ART.find((t) => Number.isFinite(base) && base <= t.maxPieces);
  return tier?.image ?? "/products/baul6.png";
}

/**
 * "78 Diamonds + 8 Bonus" -> "78-diamonds-8-bonus". Exported so every layer
 * (store builder, admin UI, markup overrides) derives the SAME product id.
 */
export function slugifyPackageName(packageName: string): string {
  return (
    packageName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "paquete"
  );
}

/** "78 Diamonds + 8 Bonus" -> "78-diamonds-8-bonus"; collisions get "-2"… */
function slugify(packageName: string, taken: Set<string>): string {
  const base = slugifyPackageName(packageName);
  let slug = base;
  let n = 2;
  while (taken.has(slug)) {
    slug = `${base}-${n}`;
    n += 1;
  }
  taken.add(slug);
  return slug;
}

/**
 * Maps supplier rows to sellable products. Rows without any checkout price
 * (neither USD nor EUR) are dropped: there is no way to sell them in either
 * region. Markup is applied at build time so the UI and the checkout share
 * the exact same cent amounts.
 */
export function buildStoreProducts(
  rows: SupplierCostRow[],
  settings: GamePricingSettings,
  itemMarkups?: ItemMarkupMap
): StoreProduct[] {
  const taken = new Set<string>();
  const products: StoreProduct[] = [];

  for (const row of rows) {
    if (row.checkoutUsdCents === null && row.checkoutEurCents === null) continue;

    const [name, rawBonus] = row.packageName.split("+").map((part) => part.trim());
    const category = categorize(row.packageName);
    const id = slugify(row.packageName, taken);
    // Per-item markup when the admin fine-tuned this package; otherwise the
    // game-level default.
    const markup = itemMarkupFor(id, itemMarkups, settings);
    products.push({
      id,
      name: name ?? row.packageName,
      // "8 Bonus" -> "8 Diamonds" to match the static catalog bonus contract
      // ("+ 8 Bonus" is re-derived by the UI from it).
      bonus: rawBonus ? rawBonus.replace(/bonus/i, "Diamonds") : "",
      label: row.packageName,
      image: imageFor(category, name ?? ""),
      category,
      priceUsdCents:
        row.checkoutUsdCents === null
          ? null
          : applyMarkupCents(row.checkoutUsdCents, markup.markupUsd),
      priceEurCents:
        row.checkoutEurCents === null
          ? null
          : applyMarkupCents(row.checkoutEurCents, markup.markupEur),
    });
  }

  return products;
}

/**
 * Sums a combo's component checkout costs. Returns null for a currency when
 * any component is missing from the snapshot or unpriced in that currency —
 * an unpriceable combo is unsellable there rather than mispriced.
 */
function comboCostCents(
  components: StoreComboDef["components"],
  rows: SupplierCostRow[],
  pick: (row: SupplierCostRow) => number | null
): number | null {
  let total = 0;
  for (const component of components) {
    const row = rows.find((r) => r.packageName === component.packageName);
    const cost = row ? pick(row) : null;
    if (cost === null) return null;
    total += cost * component.qty;
  }
  return total;
}

/**
 * Admin-defined combos become sellable products priced by summing their
 * components' CURRENT checkout costs, then marked-up like any other product.
 * Combos of same-category components inherit that category (and its art);
 * mixed sets land in "bundle".
 */
export function buildComboProducts(
  rows: SupplierCostRow[],
  combos: StoreComboDef[],
  settings: GamePricingSettings,
  itemMarkups?: ItemMarkupMap
): StoreProduct[] {
  const products: StoreProduct[] = [];

  for (const combo of combos) {
    if (combo.components.length === 0) continue;

    const costUsd = comboCostCents(combo.components, rows, (r) => r.checkoutUsdCents);
    const costEur = comboCostCents(combo.components, rows, (r) => r.checkoutEurCents);
    if (costUsd === null && costEur === null) continue;

    const id = `combo-${combo.id}`;
    const markup = itemMarkupFor(id, itemMarkups, settings);

    const categories = new Set(
      combo.components.map((c) => categorize(c.packageName))
    );
    const category: ProductCategory =
      categories.size === 1 ? [...categories][0] : "bundle";
    const image =
      categories.size === 1
        ? imageFor(category, combo.components[0]?.packageName ?? "")
        : (PASS_IMAGES.bundle ?? "/products/baul6.png");

    products.push({
      // "combo-" prefix keeps admin combos collision-free with package slugs.
      id,
      name: combo.name,
      bonus: "",
      label: combo.name,
      image,
      category,
      priceUsdCents:
        costUsd === null ? null : applyMarkupCents(costUsd, markup.markupUsd),
      priceEurCents:
        costEur === null ? null : applyMarkupCents(costEur, markup.markupEur),
    });
  }

  return products;
}

/**
 * Live products for a game from its newest supplier snapshot, or null when
 * the game has no imported prices yet (or the read fails) — callers then fall
 * back to the static catalog. Admin combos are appended after the plain
 * supplier packages.
 */
export async function getStoreProducts(game: string): Promise<StoreProduct[] | null> {
  try {
    const [latest, settings, combos, itemMarkups] = await Promise.all([
      getLatestSupplierSnapshot(game),
      getPricingSettings(game),
      getStoreCombos(game),
      getItemMarkups(game),
    ]);
    if (!latest) return null;
    const products = [
      ...buildStoreProducts(latest.rows, settings, itemMarkups),
      ...buildComboProducts(latest.rows, combos, settings, itemMarkups),
    ];
    return products.length > 0 ? products : null;
  } catch (error) {
    console.error(`No se pudo construir el catálogo live de "${game}":`, error);
    return null;
  }
}
