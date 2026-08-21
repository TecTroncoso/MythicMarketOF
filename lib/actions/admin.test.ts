import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks: declared at module top so Vitest hoists them before imports.
// ---------------------------------------------------------------------------

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

const mockWhere = vi.fn();
const mockSet = vi.fn(() => ({ where: mockWhere }));
const mockUpdate = vi.fn(() => ({ set: mockSet }));
vi.mock("@/lib/db", () => ({
  db: { update: mockUpdate },
}));

const mockRevalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

const mockGetAdminOrders = vi.fn();
vi.mock("@/lib/admin-orders", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/admin-orders")>()),
  getAdminOrders: mockGetAdminOrders,
}));

// Import after mocks (dynamic, so the factory variables are initialized).
const { setOrderStatus, searchAdminOrders } = await import("./admin");
import { orders } from "@/lib/db/schema";
import type { AdminOrderRow } from "@/lib/admin-orders";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fd = (obj: Record<string, string>): FormData => {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) f.append(k, v);
  return f;
};

const validForm = () => fd({ orderId: "o1", status: "paid" });

const setSession = (user: { id: string; email: string; role: "user" | "admin" } | null) =>
  mockAuth.mockResolvedValueOnce(user ? { user: { ...user, name: "Ana" } } : null);

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({
    user: { id: "a1", role: "admin", email: "admin@x.com" },
  });
  mockWhere.mockResolvedValue(undefined);
  mockGetAdminOrders.mockResolvedValue({
    orders: [],
    stats: { totalCount: 0, totalAmountCents: 0, pendingCount: 0, paidCount: 0, cancelledCount: 0 },
  });
});

// ---------------------------------------------------------------------------
// setOrderStatus()
// ---------------------------------------------------------------------------

describe("setOrderStatus()", () => {
  it("returns an auth error when there is no session", async () => {
    setSession(null);
    const result = await setOrderStatus(validForm());
    expect(result).toEqual({ error: "No autorizado." });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("rejects non-admin users without touching the database", async () => {
    setSession({ id: "u2", email: "bob@x.com", role: "user" });
    const result = await setOrderStatus(validForm());
    expect(result).toEqual({ error: "No autorizado." });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("updates the order status and revalidates the admin page", async () => {
    const result = await setOrderStatus(validForm());

    expect(result).toEqual({ success: true });
    expect(mockUpdate).toHaveBeenCalledWith(orders);
    expect(mockSet).toHaveBeenCalledWith({ status: "paid" });
    expect(mockWhere).toHaveBeenCalledWith(expect.anything());
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin");
  });

  it("accepts the cancelled status", async () => {
    const result = await setOrderStatus(fd({ orderId: "o1", status: "cancelled" }));
    expect(result).toEqual({ success: true });
    expect(mockSet).toHaveBeenCalledWith({ status: "cancelled" });
  });

  it("rejects an invalid status value without touching the database", async () => {
    const result = await setOrderStatus(fd({ orderId: "o1", status: "shipped" }));
    expect(result).toEqual({ error: "El estado de la orden no es válido." });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("rejects a missing order id", async () => {
    const result = await setOrderStatus(fd({ status: "paid" }));
    expect(result).toEqual({ error: "Falta el identificador de la orden." });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns a friendly failure when the DB update throws", async () => {
    mockWhere.mockRejectedValueOnce(new Error("db down"));
    const result = await setOrderStatus(validForm());
    expect(result).toEqual({ error: "No se pudo actualizar la orden. Intentá de nuevo." });
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// searchAdminOrders()
// ---------------------------------------------------------------------------

const FIXTURE_ROW: AdminOrderRow = {
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
};

describe("searchAdminOrders()", () => {
  it("rejects when there is no session without calling getAdminOrders", async () => {
    mockAuth.mockResolvedValueOnce(null);
    await expect(searchAdminOrders({})).rejects.toThrow("No autorizado.");
    expect(mockGetAdminOrders).not.toHaveBeenCalled();
  });

  it("rejects non-admin users without calling getAdminOrders", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "u1", role: "user" } });
    await expect(searchAdminOrders({})).rejects.toThrow("No autorizado.");
    expect(mockGetAdminOrders).not.toHaveBeenCalled();
  });

  it("re-sanitizes dirty filters before querying", async () => {
    const result = await searchAdminOrders({
      q: "  a%b_c  ",
      status: "shipped",
      productId: "999",
    });

    expect(result).toEqual({
      orders: [],
      stats: { totalCount: 0, totalAmountCents: 0, pendingCount: 0, paidCount: 0, cancelledCount: 0 },
    });
    expect(mockGetAdminOrders).toHaveBeenCalledTimes(1);
    expect(mockGetAdminOrders).toHaveBeenCalledWith({ q: "abc" });
  });

  it("passes valid filters through unchanged", async () => {
    const valid = {
      status: "paid",
      from: "2026-08-18",
      to: "2026-08-20",
      productId: "1",
      q: "ana@x.com",
    };

    await searchAdminOrders(valid);
    expect(mockGetAdminOrders).toHaveBeenCalledWith(valid);
  });

  it("returns the query result unchanged", async () => {
    const fixture = {
      orders: [FIXTURE_ROW],
      stats: {
        totalCount: 42,
        totalAmountCents: 1148,
        pendingCount: 3,
        paidCount: 38,
        cancelledCount: 1,
      },
    };
    mockGetAdminOrders.mockResolvedValueOnce(fixture);

    const result = await searchAdminOrders({});
    expect(result).toEqual(fixture);
  });
});