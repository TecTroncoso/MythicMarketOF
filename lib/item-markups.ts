// Per-item retail markups (server-side). Each sellable item of a game can
// override the game-level defaults from lib/pricing-settings.ts, so cheap
// and expensive packages do not have to share one flat percentage. The key
// is the storefront product id: the package slug ("78-diamonds-8-bonus") for
// supplier rows, or "combo-<uuid>" for admin combos — the same id that lands
// on orders.productId.

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { itemMarkups } from "@/lib/db/schema";
import type { GamePricingSettings } from "@/lib/markup";

export type ItemMarkupMap = Map<string, GamePricingSettings>;

/**
 * All markups of a game keyed by storefront product id. Returns an EMPTY map
 * when the table read fails: the worst case is every item priced with the
 * game defaults, never a broken storefront.
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
 * Markup for one item: its own override when set, otherwise the game-level
 * default.
 */
export function itemMarkupFor(
  key: string,
  overrides: ItemMarkupMap | undefined,
  defaults: GamePricingSettings
): GamePricingSettings {
  return overrides?.get(key) ?? defaults;
}
