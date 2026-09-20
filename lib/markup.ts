// Retail markup primitives. PURE module: safe for both client and server
// bundles (Imported by admin panel client components). Do NOT import db or
// anything server-only from here.

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
