// Admin query layer: orders joined with the owning user's email.
// Kept free of "server-only" imports so Vitest can exercise it directly.
// All filters are defensive: the page pre-sanitizes searchParams via
// sanitizeAdminFilters(), and getAdminOrders re-validates every guard so
// callers can never inject invalid SQL fragments.

import { and, count, desc, eq, gte, like, lte, or, sql, sum, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, users } from "@/lib/db/schema";
import { getProductById } from "@/lib/catalog";

const ADMIN_ORDER_STATUSES = ["pending", "paid", "cancelled"] as const;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_ORDERS = 200;
const MAX_QUERY_LENGTH = 80;

export interface AdminOrderFilters {
  status?: string;
  from?: string;
  to?: string;
  productId?: string;
  q?: string;
}

export interface AdminOrderRow {
  orderNumber: string;
  createdAt: Date;
  email: string;
  productName: string;
  mlbbUserId: string;
  zoneId: string;
  amountCents: number;
  currency: string;
  paymentMethod: string;
  status: string;
  id: string;
}

export interface AdminStats {
  totalCount: number;
  totalAmountCents: number;
  pendingCount: number;
  paidCount: number;
  cancelledCount: number;
}

/** Read a single string value from searchParams (arrays -> first element). */
function readParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
): string | undefined {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

/** Normalize a LIKE search term: trim, cap length, strip SQL wildcards. */
function cleanSearchTerm(value: string): string {
  return value.trim().replace(/[%_]/g, "").slice(0, MAX_QUERY_LENGTH);
}

/**
 * Guarded start-of-day Date for a YYYY-MM-DD string, or undefined when the
 * value is malformed (regex fail) or not a real calendar date (isNaN fail).
 */
function startOfDay(value: string): Date | undefined {
  if (!DATE_PATTERN.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Guarded end-of-day Date (23:59:59.999) for a YYYY-MM-DD string. */
function endOfDay(value: string): Date | undefined {
  if (!DATE_PATTERN.test(value)) return undefined;
  const date = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function sanitizeAdminFilters(
  searchParams: Record<string, string | string[] | undefined>
): AdminOrderFilters {
  const filters: AdminOrderFilters = {};

  const status = readParam(searchParams, "status");
  if (status === "pending" || status === "paid" || status === "cancelled") {
    filters.status = status;
  }

  const from = readParam(searchParams, "from");
  if (from && DATE_PATTERN.test(from)) filters.from = from;

  const to = readParam(searchParams, "to");
  if (to && DATE_PATTERN.test(to)) filters.to = to;

  const productId = readParam(searchParams, "productId");
  if (productId && getProductById(productId)) filters.productId = productId;

  const q = readParam(searchParams, "q");
  const cleaned = q ? cleanSearchTerm(q) : "";
  if (cleaned) filters.q = cleaned;

  return filters;
}

export async function getAdminOrders(filters: AdminOrderFilters): Promise<{
  orders: AdminOrderRow[];
  stats: AdminStats;
}> {
  const conditions: SQL[] = [];

  if (filters.status === "pending" || filters.status === "paid" || filters.status === "cancelled") {
    conditions.push(eq(orders.status, filters.status));
  }

  const from = filters.from ? startOfDay(filters.from) : undefined;
  if (from) conditions.push(gte(orders.createdAt, from));

  const to = filters.to ? endOfDay(filters.to) : undefined;
  if (to) conditions.push(lte(orders.createdAt, to));

  if (filters.productId && getProductById(filters.productId)) {
    conditions.push(eq(orders.productId, filters.productId));
  }

  const q = filters.q ? cleanSearchTerm(filters.q) : "";
  if (q) {
    const pattern = `%${q}%`;
    const searchCondition = or(
      like(users.email, pattern),
      like(orders.orderNumber, pattern),
      like(orders.mlbbUserId, pattern)
    );
    if (searchCondition) conditions.push(searchCondition);
  }

  const [rows, statsRows] = await Promise.all([
    db
      .select({
        orderNumber: orders.orderNumber,
        createdAt: orders.createdAt,
        email: users.email,
        productName: orders.productName,
        mlbbUserId: orders.mlbbUserId,
        zoneId: orders.zoneId,
        amountCents: orders.amountCents,
        currency: orders.currency,
        paymentMethod: orders.paymentMethod,
        status: orders.status,
        id: orders.id,
      })
      .from(orders)
      .innerJoin(users, eq(orders.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt))
      .limit(MAX_ORDERS),
    db
      .select({
        totalCount: count(),
        // Drizzle types sqlite sum() as string | null; SQLite returns a number
        // for integer columns, so coerce defensively.
        totalAmount: sum(orders.amountCents),
        pendingCount: sql<number>`count(*) filter (where ${eq(orders.status, "pending")})`,
        paidCount: sql<number>`count(*) filter (where ${eq(orders.status, "paid")})`,
        cancelledCount: sql<number>`count(*) filter (where ${eq(orders.status, "cancelled")})`,
      })
      .from(orders)
      .innerJoin(users, eq(orders.userId, users.id))
      .where(and(...conditions)),
  ]);

  // Stats come from the aggregate query, never from the limited 200-row list.
  const statsRow = statsRows[0];

  return {
    orders: rows.map((row) => ({
      orderNumber: row.orderNumber,
      createdAt: row.createdAt,
      email: row.email ?? "",
      productName: row.productName,
      mlbbUserId: row.mlbbUserId,
      zoneId: row.zoneId,
      amountCents: row.amountCents,
      currency: row.currency,
      paymentMethod: row.paymentMethod,
      status: row.status,
      id: row.id,
    })),
    stats: {
      totalCount: statsRow?.totalCount ?? 0,
      totalAmountCents: Number(statsRow?.totalAmount ?? 0),
      pendingCount: statsRow?.pendingCount ?? 0,
      paidCount: statsRow?.paidCount ?? 0,
      cancelledCount: statsRow?.cancelledCount ?? 0,
    },
  };
}