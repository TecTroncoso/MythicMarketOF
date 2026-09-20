// Per-game retail pricing settings. The storefront never sells at supplier
// cost: every checkout price is marked up by a per-currency factor that the
// admin edits from /admin/precios/[game].
//
//   saleCents = supplierCheckoutCents * (1 + markup)
//
// `markupUsd` feeds the LATAM region (charged in US$), `markupEur` feeds the
// EU region (charged in €). Values are stored as fractions (0.05 = 5%).

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pricingSettings } from "@/lib/db/schema";

export interface GamePricingSettings {
  markupUsd: number;
  markupEur: number;
}

// 5% mirrors the historical markup baked into the static catalog prices.
export const DEFAULT_PRICING_SETTINGS: GamePricingSettings = {
  markupUsd: 0.05,
  markupEur: 0.05,
};

/**
 * Sale price in integer cents after applying the markup. Rounds to the
 * nearest cent so the storefront never exposes fractional cents.
 */
export function applyMarkupCents(cents: number, markup: number): number {
  return Math.round(cents * (1 + markup));
}

/**
 * Reads the settings row for a game, falling back to the defaults when no
 * row exists yet (fresh DB) or when the table is unavailable (migration not
 * applied yet). The fallback keeps the storefront working instead of failing
 * the whole checkout on a settings read.
 */
export async function getPricingSettings(
  game: string
): Promise<GamePricingSettings> {
  try {
    const [row] = await db
      .select()
      .from(pricingSettings)
      .where(eq(pricingSettings.game, game))
      .limit(1);

    if (!row) return DEFAULT_PRICING_SETTINGS;
    return { markupUsd: row.markupUsd, markupEur: row.markupEur };
  } catch (error) {
    console.error(`No se pudieron leer los markups de "${game}", usando valores por defecto:`, error);
    return DEFAULT_PRICING_SETTINGS;
  }
}
