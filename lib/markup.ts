// Retail markup primitives. PURE module: safe for both client and server
// bundles (imported by admin panel client components). Do NOT import db or
// anything server-only from here.

export interface GamePricingSettings {
  markupUsd: number;
  markupEur: number;
}

// There is NO game-level default anymore: every sellable item carries its own
// markup (item_markups table). Items without an override sell at supplier
// cost (0%), and the admin panel flags them as "SIN MARKUP".
export const ZERO_MARKUP: GamePricingSettings = {
  markupUsd: 0,
  markupEur: 0,
};

/**
 * Sale price in integer cents after applying the markup. Rounds to the
 * nearest cent so the storefront never exposes fractional cents.
 */
export function applyMarkupCents(cents: number, markup: number): number {
  return Math.round(cents * (1 + markup));
}
