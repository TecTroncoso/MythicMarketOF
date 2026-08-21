import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SQL } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Mocks: declared at module top so Vitest hoists them before imports.
// db.select() is dispatched by the select config: the orders query selects
// row fields (orderNumber...), the stats query selects aggregates
// (totalCount...). Each chain terminal resolves to its own fixture rows.
// ---------------------------------------------------------------------------

const ORDERS_ROWS = [
  {
    orderNumber: "MM-ABC23456",
    createdAt: new Date("2026-08-18T12:00:00Z"),
    email: "ana@x.com",
    productName: "86 Diamonds",
    mlbbUserId: "12345678",
    zoneId: "10012",
    amountCents: 149,
    currency: "USD",
    paymentMethod: "paypal",
    status: "pending",
    id: "o1",
  },
  {
    orderNumber: "MM-DEF78901",
    createdAt: new Date("2026-08-17T10:00:00Z"),
    email: null,
    productName: "Twilight Pass",
    mlbbUserId: "87654321",
    zoneId: "20034",
    amountCents: 999,
    currency: "EUR",
    paymentMethod: "pix",
    status: "paid",
    id: "o2",
  },
];

const STATS_ROW = {
  totalCount: 42,
  // Drizzle types sqlite sum() as string | null — fixtures cover all three.
  totalAmount: 1148 as number | string | null,
  pendingCount: 3,
  paidCount: 38,
  cancelledCount: 1,
};

const limitFn = vi.fn(async () => ORDERS_ROWS);
const orderByFn = vi.fn(() => ({ limit: limitFn }));
const ordersWhereFn = vi.fn((_conditions: unknown[]) => ({ orderBy: orderByFn }));
const innerJoinFn = vi.fn((_table: unknown, _condition: unknown) => ({
  where: ordersWhereFn,
}));
const ordersFromFn = vi.fn(() => ({ innerJoin: innerJoinFn }));

const statsInnerJoinFn = vi.fn((_table: unknown, _condition: unknown) => ({
  where: statsWhereFn,
}));
const statsWhereFn = vi.fn(async (_conditions: unknown[]) => [STATS_ROW]);
const statsFromFn = vi.fn(() => ({ innerJoin: statsInnerJoinFn }));

const mockSelect = vi.fn((config: Record<string, unknown>) => ({
  from: "orderNumber" in config ? ordersFromFn : statsFromFn,
}));

vi.mock("@/lib/db", () => ({
  db: { select: mockSelect },
}));

// Import after mocks (dynamic, so the factory variables are initialized).
const { getAdminOrders, sanitizeAdminFilters } = await import("./admin-orders");
import { orders, users } from "@/lib/db/schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Serialize a drizzle SQL condition into (sql, params) using a minimal
 * dialect config — lets tests assert on the real generated SQL fragments.
 */
function serialize(cond: unknown): { sql: string; params: unknown[] } {
  return (cond as SQL).toQuery({
    casing: { getColumnCasing: (column: { name: string }) => column.name },
    escapeName: (name: string) => `"${name}"`,
    escapeParam: () => "?",
    inlineParams: false,
    paramStartIndex: { value: 0 },
  } as never);
}

/** Where argument received by the orders-list query (and() result or undefined). */
function listWhereArg(): unknown {
  return ordersWhereFn.mock.calls[0]?.[0];
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// sanitizeAdminFilters()
// ---------------------------------------------------------------------------

describe("sanitizeAdminFilters()", () => {
  it("keeps only whitelisted statuses and reads the first element of arrays", () => {
    expect(sanitizeAdminFilters({ status: "pending" })).toEqual({ status: "pending" });
    expect(sanitizeAdminFilters({ status: "paid" })).toEqual({ status: "paid" });
    expect(sanitizeAdminFilters({ status: "cancelled" })).toEqual({ status: "cancelled" });
    expect(sanitizeAdminFilters({ status: "shipped" })).toEqual({});
    expect(sanitizeAdminFilters({ status: ["paid", "pending"] })).toEqual({ status: "paid" });
  });

  it("accepts YYYY-MM-DD dates and drops malformed ones", () => {
    expect(sanitizeAdminFilters({ from: "2026-08-18", to: "2026-08-20" })).toEqual({
      from: "2026-08-18",
      to: "2026-08-20",
    });
    expect(sanitizeAdminFilters({ from: "18-08-2026" })).toEqual({});
    expect(sanitizeAdminFilters({ to: "2026/08/20" })).toEqual({});
    expect(sanitizeAdminFilters({ from: "2026-8-1" })).toEqual({});
  });

  it("keeps known product ids and ignores unknown ones", () => {
    expect(sanitizeAdminFilters({ productId: "1" })).toEqual({ productId: "1" });
    expect(sanitizeAdminFilters({ productId: "8" })).toEqual({ productId: "8" });
    expect(sanitizeAdminFilters({ productId: "999" })).toEqual({});
  });

  it("trims, strips LIKE wildcards and caps q at 80 chars", () => {
    expect(sanitizeAdminFilters({ q: "  ana@x.com  " })).toEqual({ q: "ana@x.com" });
    expect(sanitizeAdminFilters({ q: "a%b_c" })).toEqual({ q: "abc" });
    expect(sanitizeAdminFilters({ q: "x".repeat(100) })).toEqual({ q: "x".repeat(80) });
    expect(sanitizeAdminFilters({ q: "   " })).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// getAdminOrders()
// ---------------------------------------------------------------------------

describe("getAdminOrders()", () => {
  it("queries orders joined with users, ordered by date, limited to 200", async () => {
    const result = await getAdminOrders({});

    expect(mockSelect).toHaveBeenCalledTimes(2);
    expect(ordersFromFn).toHaveBeenCalledWith(orders);
    expect(innerJoinFn).toHaveBeenCalledWith(users, expect.anything());
    expect(orderByFn).toHaveBeenCalledTimes(1);
    expect(limitFn).toHaveBeenCalledWith(200);
    expect(result.orders).toHaveLength(2);
  });

  it("passes no conditions when there are no filters", async () => {
    await getAdminOrders({});
    expect(listWhereArg()).toBeUndefined();
  });

  it("adds an eq condition for a whitelisted status filter", async () => {
    await getAdminOrders({ status: "pending" });

    const sql = serialize(listWhereArg());
    expect(sql.sql).toContain('"status"');
    expect(sql.sql).toContain("=");
    expect(sql.params).toEqual(["pending"]);
  });

  it("ignores a non-whitelisted status", async () => {
    await getAdminOrders({ status: "shipped" });
    expect(listWhereArg()).toBeUndefined();
  });

  it("ignores invalid calendar dates without crashing", async () => {
    // "2026-99-99" matches the regex but is not a real date (isNaN).
    await getAdminOrders({ from: "2026-99-99", to: "2026-99-99" });
    expect(listWhereArg()).toBeUndefined();
  });

  it("adds gte/lte conditions for valid from/to dates", async () => {
    await getAdminOrders({ from: "2026-08-18", to: "2026-08-20" });

    const sql = serialize(listWhereArg());
    expect(sql.sql).toContain(">=");
    expect(sql.sql).toContain("<=");
    expect(sql.params).toEqual([
      new Date("2026-08-18T00:00:00.000Z").getTime(),
      new Date("2026-08-20T23:59:59.999Z").getTime(),
    ]);
  });

  it("strips LIKE wildcards from q and builds a 3-way or() over email, orderNumber and mlbbUserId", async () => {
    await getAdminOrders({ q: "a%b_c" });

    const sql = serialize(listWhereArg());
    expect(sql.sql.toLowerCase()).toContain("or");
    expect(sql.params).toEqual(["%abc%", "%abc%", "%abc%"]);
  });

  it("ignores q that is empty after sanitization", async () => {
    await getAdminOrders({ q: "%%%___" });
    expect(listWhereArg()).toBeUndefined();
  });

  it("adds an eq condition for a known productId and ignores unknown ids", async () => {
    await getAdminOrders({ productId: "1" });
    expect(serialize(listWhereArg()).params).toEqual(["1"]);

    await getAdminOrders({ productId: "999" });
    expect(ordersWhereFn.mock.calls[1]?.[0]).toBeUndefined();
  });

  it("returns the joined email in the row shape and falls back to empty string", async () => {
    const result = await getAdminOrders({});

    expect(result.orders[0]).toMatchObject({
      orderNumber: "MM-ABC23456",
      email: "ana@x.com",
      productName: "86 Diamonds",
      mlbbUserId: "12345678",
      zoneId: "10012",
      amountCents: 149,
      currency: "USD",
      paymentMethod: "paypal",
      status: "pending",
      id: "o1",
    });
    expect(result.orders[1].email).toBe("");
  });

  it("computes stats from the aggregate query, not from the limited rows", async () => {
    const result = await getAdminOrders({});

    expect(result.stats).toEqual({
      totalCount: 42,
      totalAmountCents: 1148,
      pendingCount: 3,
      paidCount: 38,
      cancelledCount: 1,
    });
  });

  it("coerces the sum result to a number and treats null sums as zero", async () => {
    // drizzle types sqlite sum() as string | null — assert the coercion.
    statsWhereFn.mockResolvedValueOnce([{ ...STATS_ROW, totalAmount: "9876" }]);
    const asString = await getAdminOrders({});
    expect(asString.stats.totalAmountCents).toBe(9876);

    statsWhereFn.mockResolvedValueOnce([{ ...STATS_ROW, totalAmount: null }]);
    const asNull = await getAdminOrders({});
    expect(asNull.stats.totalAmountCents).toBe(0);
  });

  it("applies the same where to the list and the stats queries", async () => {
    await getAdminOrders({ status: "paid" });

    const listSql = serialize(ordersWhereFn.mock.calls[0]?.[0]);
    const statsSql = serialize(statsWhereFn.mock.calls[0]?.[0]);
    expect(statsSql.sql).toBe(listSql.sql);
    expect(statsSql.params).toEqual(listSql.params);
  });

  it("joins users on the stats query too (the q filter references user.email)", async () => {
    // Regression: the stats query previously had NO join, so any search (q)
    // crashed in production with "no such column: user.email".
    await getAdminOrders({ q: "ana" });

    expect(statsInnerJoinFn).toHaveBeenCalledWith(users, expect.anything());
    expect(statsWhereFn).toHaveBeenCalledTimes(1);
  });
});