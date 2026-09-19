import { describe, it, expect, vi } from "vitest";

// The module imports @/lib/db (which would build a libsql client without
// env vars in tests); only the pure parser is exercised here.
vi.mock("@/lib/db", () => ({ db: {} }));

const { parseEnebaResultsPayload } = await import("./supplier-prices");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function buildPayload(results: unknown[] = [{}], metadata: unknown = {}) {
  return { metadata, results };
}

function validRow(overrides: Record<string, unknown> = {}) {
  return {
    Paquete: "78 Diamonds + 8 Bonus",
    Precio_Catalogo_BRL: "6.65",
    Precio_Catalogo_USD: "1.35",
    Precio_Catalogo_EUR: "1.41",
    "Cashback_%": "10",
    Precio_Checkout_BRL: "6.65",
    Cashback_Checkout_BRL: "0.67",
    Precio_Checkout_USD: "1.29",
    Cashback_Checkout_USD: "0.13",
    Precio_Checkout_EUR: "1.13",
    Cashback_Checkout_EUR: "0.11",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// parseEnebaResultsPayload()
// ---------------------------------------------------------------------------

describe("parseEnebaResultsPayload()", () => {
  it("converts price strings to integer cents and keeps row order", () => {
    const payload = buildPayload([
      validRow({ Paquete: "Weekly Diamond Pass" }),
      validRow({ Paquete: "78 Diamonds + 8 Bonus" }),
    ]);

    const parsed = parseEnebaResultsPayload(payload);

    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]).toMatchObject({
      packageName: "Weekly Diamond Pass",
      position: 0,
      catalogBrlCents: 665,
      checkoutBrlCents: 665,
      cashbackBrlCents: 67,
      catalogUsdCents: 135,
      checkoutUsdCents: 129,
      cashbackUsdCents: 13,
      catalogEurCents: 141,
      checkoutEurCents: 113,
      cashbackEurCents: 11,
      cashbackPercent: 10,
    });
    expect(parsed.rows[1].position).toBe(1);
  });

  it("maps failed checkouts (empty strings) to null, not NaN", () => {
    const row = validRow({
      Precio_Checkout_BRL: "",
      Cashback_Checkout_BRL: "",
      "Cashback_%": "",
    });

    const [parsed] = parseEnebaResultsPayload(buildPayload([row])).rows;

    expect(parsed.checkoutBrlCents).toBeNull();
    expect(parsed.cashbackBrlCents).toBeNull();
    expect(parsed.cashbackPercent).toBeNull();
    // Catalog prices still parse fine.
    expect(parsed.catalogBrlCents).toBe(665);
  });

  it("skips rows without any price instead of failing the whole import", () => {
    const priceless = { Paquete: "Paquete sin precios" };
    const parsed = parseEnebaResultsPayload(
      buildPayload([priceless, validRow()])
    );

    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].packageName).toBe("78 Diamonds + 8 Bonus");
  });

  it("reads snapshot metadata with safe fallbacks", () => {
    const parsed = parseEnebaResultsPayload(
      buildPayload([validRow()], {
        provider: "ScrapingAnt",
        checkout_region: "BR",
        currencies: ["BRL", "USD", 42],
        timestamp_utc: "2026-09-19T06:37:41.654481+00:00",
      })
    );

    expect(parsed.provider).toBe("ScrapingAnt");
    expect(parsed.region).toBe("BR");
    expect(parsed.currencies).toEqual(["BRL", "USD"]);
    expect(parsed.scrapedAt.toISOString()).toBe("2026-09-19T06:37:41.654Z");
  });

  it("reads the game from metadata and defaults to mlbb", () => {
    const withGame = parseEnebaResultsPayload(
      buildPayload([validRow()], { game: "MLBB" })
    );
    expect(withGame.game).toBe("mlbb");

    const withoutGame = parseEnebaResultsPayload(buildPayload([validRow()]));
    expect(withoutGame.game).toBe("mlbb");
  });

  it("falls back to now when the timestamp is missing or invalid", () => {
    const before = Date.now();
    const parsed = parseEnebaResultsPayload(
      buildPayload([validRow()], { timestamp_utc: "no-es-una-fecha" })
    );
    const after = Date.now();

    expect(parsed.scrapedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(parsed.scrapedAt.getTime()).toBeLessThanOrEqual(after);
  });

  it("rejects payloads that are not objects or lack a results array", () => {
    expect(() => parseEnebaResultsPayload(null)).toThrow();
    expect(() => parseEnebaResultsPayload("json")).toThrow();
    expect(() => parseEnebaResultsPayload([validRow()])).toThrow();
    expect(() => parseEnebaResultsPayload({})).toThrow(/results/);
  });

  it("rejects payloads whose rows contain no prices at all", () => {
    expect(() =>
      parseEnebaResultsPayload(buildPayload([{ Paquete: "Sin precios" }]))
    ).toThrow(/ninguna fila/);
  });
});
