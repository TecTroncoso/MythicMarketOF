// Per-item retail markups (server-side). THE source of margin: every sellable
// item carries its own USD/EUR markup, so cheap and expensive packages never
// share one flat percentage. The key is the storefront product id: the
// package slug ("78-diamonds-8-bonus") for supplier rows, or "combo-<uuid>"
// for admin combos — the same id that lands on orders.productId.
// Items without a row sell at supplier cost (ZERO_MARKUP, 0%).

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { itemMarkups } from "@/lib/db/schema";
import { ZERO_MARKUP, type GamePricingSettings } from "@/lib/markup";

export type ItemMarkupMap = Map<string, GamePricingSettings>;

/**
 * All markups of a game keyed by storefront product id. Returns an EMPTY map
 * when the table read fails: the worst case is every item selling at cost,
 * never a broken storefront.
 */
export async function getItemMarkups(game: string): Promise<ItemMarkupMap> {
  try {
    const rows = await db
      .select()
      .from(itemMarkups)
      .where(eq(itemMarkups.game, game));
    return new Map(
      rows.map((row) => [
        row.itemKey,
        { markupUsd: row.markupUsd, markupEur: row.markupEur },
      ])
    );
  } catch (error) {
    console.error(`No se pudieron leer los markups por item de "${game}":`, error);
    return new Map();
  }
}

/**
 * Markup for one item: its own row when set, otherwise ZERO (sells at cost).
 */
export function itemMarkupFor(
  key: string,
  overrides: ItemMarkupMap | undefined
): GamePricingSettings {
  return overrides?.get(key) ?? ZERO_MARKUP;
}
