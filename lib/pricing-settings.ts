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
import { DEFAULT_PRICING_SETTINGS, type GamePricingSettings } from "@/lib/markup";

// The pure markup primitives live in lib/markup.ts (client-safe); consumers
// of that module must never pull this DB-backed file into a client bundle.
// This file re-exports them for its server-side consumers.
export {
  DEFAULT_PRICING_SETTINGS,
  applyMarkupCents,
  type GamePricingSettings,
} from "@/lib/markup";

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
