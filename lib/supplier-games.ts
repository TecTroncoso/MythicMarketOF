// Games that have supplier price tracking. Pure data — safe for both client
// and server bundles. When a new game gets a price scraper, add it here and
// register its script in lib/scrapers.ts.

export interface SupplierGame {
  /** Stable id used in URLs (/admin/precios/<id>), DB rows and the API. */
  id: string;
  name: string;
  shortName: string;
  image: string;
  /** Where the storefront sells this game's top-ups. */
  topUpPath: string;
}

export const SUPPLIER_GAMES: SupplierGame[] = [
  {
    id: "mlbb",
    name: "Mobile Legends: Bang Bang",
    shortName: "MLBB",
    image: "/mlbb.png",
    topUpPath: "/topup/mlbb",
  },
];

export function getSupplierGame(id: string): SupplierGame | undefined {
  return SUPPLIER_GAMES.find((game) => game.id === id);
}
