// Supplier price layer for the Eneba scraper output (scrapers/eneba_mlbb.py
// -> scrapers/output/ml_diamonds_results.json). parseEnebaResultsPayload() is
// a pure function so
// Vitest can exercise it without a DB. importSupplierPrices() persists one
// snapshot plus its rows, and getLatestSupplierSnapshot() feeds the admin
// price list. Money is stored as integer cents, same as orders.amountCents.

import { desc, eq, max } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  supplierPriceRows,
  supplierPriceSnapshots,
  type SupplierPriceRow,
  type SupplierPriceSnapshot,
} from "@/lib/db/schema";

const DEFAULT_GAME = "mlbb";

export interface ParsedSupplierRow {
  packageName: string;
  position: number;
  catalogBrlCents: number | null;
  checkoutBrlCents: number | null;
  cashbackBrlCents: number | null;
  catalogUsdCents: number | null;
  checkoutUsdCents: number | null;
  cashbackUsdCents: number | null;
  catalogEurCents: number | null;
  checkoutEurCents: number | null;
  cashbackEurCents: number | null;
  cashbackPercent: number | null;
}

export interface ParsedSupplierSnapshot {
  game: string;
  scrapedAt: Date;
  provider: string | null;
  region: string | null;
  currencies: string[];
  rows: ParsedSupplierRow[];
}

/** "6.65" -> 665; "", undefined, or non-numeric -> null. */
function toCents(value: unknown): number | null {
  if (typeof value === "string" && value.trim() === "") return null;
  if (typeof value !== "string" && typeof value !== "number") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100);
}

function toPercent(value: unknown): number | null {
  if (typeof value === "string" && value.trim() === "") return null;
  if (typeof value !== "string" && typeof value !== "number") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function toSnapshotDate(value: unknown): Date {
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

/**
 * Validates the scraper JSON and converts every price string to cents.
 * Throws when the payload shape is unrecognizable; rows missing every price
 * are skipped rather than failing the whole import.
 */
export function parseEnebaResultsPayload(raw: unknown): ParsedSupplierSnapshot {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("El JSON del scraper debe ser un objeto.");
  }

  const payload = raw as Record<string, unknown>;
  const metadata = (
    typeof payload.metadata === "object" && payload.metadata !== null
      ? payload.metadata
      : {}
  ) as Record<string, unknown>;

  if (!Array.isArray(payload.results)) {
    throw new Error("El JSON del scraper no tiene un array `results`.");
  }

  const rows: ParsedSupplierRow[] = [];
  for (const entry of payload.results) {
    if (typeof entry !== "object" || entry === null) continue;
    const record = entry as Record<string, unknown>;
    const packageName = toNullableString(record["Paquete"]);
    if (!packageName) continue;

    const row: ParsedSupplierRow = {
      packageName,
      position: rows.length,
      catalogBrlCents: toCents(record["Precio_Catalogo_BRL"]),
      checkoutBrlCents: toCents(record["Precio_Checkout_BRL"]),
      cashbackBrlCents: toCents(record["Cashback_Checkout_BRL"]),
      catalogUsdCents: toCents(record["Precio_Catalogo_USD"]),
      checkoutUsdCents: toCents(record["Precio_Checkout_USD"]),
      cashbackUsdCents: toCents(record["Cashback_Checkout_USD"]),
      catalogEurCents: toCents(record["Precio_Catalogo_EUR"]),
      checkoutEurCents: toCents(record["Precio_Checkout_EUR"]),
      cashbackEurCents: toCents(record["Cashback_Checkout_EUR"]),
      cashbackPercent: toPercent(record["Cashback_%"]),
    };

    const hasAnyPrice = [
      row.catalogBrlCents,
      row.checkoutBrlCents,
      row.catalogUsdCents,
      row.checkoutUsdCents,
      row.catalogEurCents,
      row.checkoutEurCents,
    ].some((value) => value !== null);
    if (hasAnyPrice) rows.push(row);
  }

  if (rows.length === 0) {
    throw new Error("El JSON del scraper no contiene ninguna fila con precios.");
  }

  const currencies = Array.isArray(metadata.currencies)
    ? metadata.currencies.filter(
        (currency): currency is string => typeof currency === "string"
      )
    : [];

  return {
    game: toNullableString(metadata.game)?.toLowerCase() ?? DEFAULT_GAME,
    scrapedAt: toSnapshotDate(metadata.timestamp_utc),
    provider: toNullableString(metadata.provider),
    region: toNullableString(metadata.checkout_region),
    currencies,
    rows,
  };
}

/** Inserts one snapshot + all its rows. Returns the new snapshot id. */
export async function importSupplierPrices(
  parsed: ParsedSupplierSnapshot
): Promise<string> {
  const snapshotId = crypto.randomUUID();

  await db.insert(supplierPriceSnapshots).values({
    id: snapshotId,
    game: parsed.game,
    scrapedAt: parsed.scrapedAt,
    provider: parsed.provider,
    region: parsed.region,
    currencies: JSON.stringify(parsed.currencies),
    totalPackages: parsed.rows.length,
  });

  if (parsed.rows.length > 0) {
    await db.insert(supplierPriceRows).values(
      parsed.rows.map((row) => ({ ...row, snapshotId }))
    );
  }

  return snapshotId;
}

export interface LatestSupplierSnapshot {
  snapshot: SupplierPriceSnapshot;
  rows: SupplierPriceRow[];
}

/**
 * Latest snapshot for a game by scrape date, or null when the game has no
 * imported data yet.
 */
export async function getLatestSupplierSnapshot(
  game: string
): Promise<LatestSupplierSnapshot | null> {
  const [snapshot] = await db
    .select()
    .from(supplierPriceSnapshots)
    .where(eq(supplierPriceSnapshots.game, game))
    .orderBy(desc(supplierPriceSnapshots.scrapedAt))
    .limit(1);

  if (!snapshot) return null;

  const rows = await db
    .select()
    .from(supplierPriceRows)
    .where(eq(supplierPriceRows.snapshotId, snapshot.id))
    .orderBy(supplierPriceRows.position);

  return { snapshot, rows };
}

export interface SupplierGameOverviewEntry {
  game: string;
  lastScrapedAt: Date;
}

/**
 * One entry per game that has at least one snapshot, with the newest scrape
 * date. Feeds the game selector cards in /admin/precios.
 */
export async function getSupplierGamesOverview(): Promise<SupplierGameOverviewEntry[]> {
  const rows = await db
    .select({
      game: supplierPriceSnapshots.game,
      lastScrapedAt: max(supplierPriceSnapshots.scrapedAt),
    })
    .from(supplierPriceSnapshots)
    .groupBy(supplierPriceSnapshots.game);

  return rows
    .map((row) => {
      // Drizzle types max() on a timestamp_ms column as Date | null, but the
      // driver returns the raw integer; coerce either representation.
      const value: unknown = row.lastScrapedAt;
      const date =
        value instanceof Date ? value : new Date(value as string | number);
      return { game: row.game, lastScrapedAt: date };
    })
    .filter((entry) => !Number.isNaN(entry.lastScrapedAt.getTime()));
}
