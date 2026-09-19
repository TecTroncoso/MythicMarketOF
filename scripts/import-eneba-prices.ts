/**
 * Imports a supplier scraper output (scrapers/output/ml_diamonds_results.json,
 * produced by scrapers/eneba_mlbb.py for the MLBB game) into the
 * supplier_price_snapshots / supplier_price_rows tables. The game is taken
 * from the JSON metadata (metadata.game), defaulting to "mlbb".
 *
 * Usage: npm run import-eneba -- [path-to-json]
 *   Defaults to ./scrapers/output/ml_diamonds_results.json when no path is
 *   given.
 *
 * Every run creates a new snapshot so the admin can always see the latest
 * price list; old snapshots are kept for history.
 */
import "dotenv/config";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { readFile } from "node:fs/promises";

// Load .env.local too (Next.js convention) — dotenv/config alone reads .env.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../.env.local") });

import {
  importSupplierPrices,
  parseEnebaResultsPayload,
} from "../lib/supplier-prices";

async function main() {
  const jsonPath = path.resolve(
    __dirname,
    "..",
    process.argv[2] ?? "scrapers/output/ml_diamonds_results.json"
  );

  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(jsonPath, "utf-8"));
  } catch (error) {
    console.error(`No se pudo leer o parsear ${jsonPath}:`, error);
    process.exit(1);
  }

  const parsed = parseEnebaResultsPayload(raw);
  const snapshotId = await importSupplierPrices(parsed);

  console.log(
    `✅ Snapshot ${snapshotId} importado [juego: ${parsed.game}]: ${parsed.rows.length} paquetes ` +
      `(${parsed.currencies.join(", ") || "sin monedas"}) scrapeados el ` +
      parsed.scrapedAt.toISOString()
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
