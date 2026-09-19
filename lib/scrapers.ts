// Server-only registry: which scraper script produces supplier prices for
// each game. The admin "update prices" button resolves the game id through
// this table — a game without an entry simply has no scrape button.

export interface ScraperConfig {
  /** Python script (relative to project root) that writes the results JSON. */
  script: string;
  /** JSON file (relative to project root) the script writes. */
  resultsFile: string;
  /** Human note shown in the UI, e.g. which provider/region it consumes. */
  description: string;
}

export const SUPPLIER_SCRAPERS: Record<string, ScraperConfig> = {
  mlbb: {
    script: "scrapers/eneba_mlbb.py",
    resultsFile: "scrapers/output/ml_diamonds_results.json",
    description: "Eneba vía ScrapingAnt (checkout Brasil)",
  },
};

export function getScraperForGame(gameId: string): ScraperConfig | undefined {
  return SUPPLIER_SCRAPERS[gameId];
}
