import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks: declared at module top so Vitest hoists them before imports.
// lib/order-number (generateOrderNumber) stays REAL — it only needs node:crypto.
// ---------------------------------------------------------------------------

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

const mockCheckoutRateLimit = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  checkoutRateLimiter: { limit: mockCheckoutRateLimit },
  authRateLimiter: { limit: vi.fn() },
  loginRateLimiter: { limit: vi.fn() },
  mlbbLookupRateLimiter: { limit: vi.fn() },
}));

const mockInsertValues = vi.fn();
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));
vi.mock("@/lib/db", () => ({
  db: {
    insert: mockInsert,
  },
}));

const mockHeadersGet = vi.fn();
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve({ get: mockHeadersGet }),
}));

// Import after mocks.
const { processCheckout, getCheckoutContext } = await import("./checkout");
import type { CheckoutResult } from "./checkout";

// Narrows the discriminated union after asserting success, so success-only
// fields (orderNumber, message) are typed in the assertions below.
const assertSuccess = (result: CheckoutResult) => {
  expect(result.success).toBe(true);
  return result as Extract<CheckoutResult, { success: true }>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fd = (obj: Record<string, string>): FormData => {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) f.append(k, v);
  return f;
};

const validForm = () =>
  fd({
    userId: "12345678",
    zoneId: "10012",
    productId: "1",
    // mercadopago is a latam/USD method.
    paymentMethod: "mercadopago",
    paymentDetail: "compra@ejemplo.com",
    paymentRegion: "latam",
  });

const setUser = (user: { id: string; email: string }) =>
  mockAuth.mockResolvedValueOnce({ user: { ...user, name: "Ana", role: "user" } });

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: "u1", email: "ana@x.com", name: "Ana", role: "user" } });
  mockCheckoutRateLimit.mockResolvedValue({ success: true, reset: 0 });
  mockInsertValues.mockResolvedValue(undefined);
  mockHeadersGet.mockReturnValue(null);
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// processCheckout()
// ---------------------------------------------------------------------------

describe("processCheckout()", () => {
  it("returns an auth error when there is no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const result = await processCheckout(validForm());
    expect(result).toEqual({
      success: false,
      error: "Debes iniciar sesión para realizar una compra.",
    });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("persists a pending order and returns success with the order number", async () => {
    vi.useFakeTimers();
    try {
      const promise = processCheckout(validForm());
      await vi.advanceTimersByTimeAsync(1500);
      const result = assertSuccess(await promise);

      expect(result).toMatchObject({
        success: true,
        redirectUrl: "/dashboard",
      });
      expect(result.orderNumber).toMatch(/^MM-[A-HJ-NP-Z2-9]{8}$/);
      expect(result.message).toContain("Te enviamos el link de pago a tu email de Mercado Pago.");

      expect(mockInsert).toHaveBeenCalledTimes(1);
      const rowArg = mockInsertValues.mock.calls[0]?.[0];
      expect(rowArg).toMatchObject({
        orderNumber: result.orderNumber,
        userId: "u1",
        productId: "1",
        productName: "86 Diamonds",
        amountCents: 149,
        currency: "USD",
        paymentMethod: "mercadopago",
        paymentDetail: "compra@ejemplo.com",
        mlbbUserId: "12345678",
        zoneId: "10012",
        status: "pending",
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns a friendly failure when the DB insert throws", async () => {
    mockInsertValues.mockRejectedValueOnce(new Error("db down"));
    const result = await processCheckout(validForm());
    expect(result).toEqual({
      success: false,
      error: "No se pudo registrar la orden. Intentá de nuevo.",
    });
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// processCheckout() payment methods
// ---------------------------------------------------------------------------

describe("processCheckout() payment methods", () => {
  it("rejects a checkout without a payment method", async () => {
    const result = await processCheckout(
      fd({ userId: "12345678", zoneId: "10012", productId: "1" })
    );
    expect(result).toEqual({ success: false, error: "Debes seleccionar un método de pago." });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects an unknown payment method for the region", async () => {
    const result = await processCheckout(
      fd({ userId: "12345678", zoneId: "10012", productId: "1", paymentMethod: "bitcoin", paymentDetail: "x", paymentRegion: "latam" })
    );
    expect(result).toEqual({ success: false, error: "El método de pago no es válido para tu región." });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects an invalid payment region", async () => {
    const result = await processCheckout(
      fd({ userId: "12345678", zoneId: "10012", productId: "1", paymentMethod: "paypal", paymentDetail: "a@b.co", paymentRegion: "asia" })
    );
    expect(result).toEqual({ success: false, error: "La región de pago no es válida." });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects a method that does not belong to the region (sepa in latam)", async () => {
    const result = await processCheckout(
      fd({ userId: "12345678", zoneId: "10012", productId: "1", paymentMethod: "sepa", paymentDetail: "DE89370400440532013000", paymentRegion: "latam" })
    );
    expect(result).toEqual({ success: false, error: "El método de pago no es válido para tu región." });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects a sepa payment with an invalid IBAN without inserting", async () => {
    const result = await processCheckout(
      fd({ userId: "12345678", zoneId: "10012", productId: "1", paymentMethod: "sepa", paymentDetail: "1234", paymentRegion: "eu" })
    );
    expect(result).toEqual({ success: false, error: "Ingresá un IBAN válido." });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("stores a EUR sepa order with the converted amount and method instructions", async () => {
    vi.useFakeTimers();
    try {
      const promise = processCheckout(
        fd({
          userId: "12345678",
          zoneId: "10012",
          productId: "1",
          paymentMethod: "sepa",
          paymentDetail: "  DE89370400440532013000  ",
          paymentRegion: "eu",
        })
      );
      await vi.advanceTimersByTimeAsync(1500);
      const result = assertSuccess(await promise);

      expect(result).toMatchObject({
        success: true,
        redirectUrl: "/dashboard",
      });
      expect(result.message).toContain("Transferí");
      expect(result.message).toContain(result.orderNumber);

      expect(mockInsert).toHaveBeenCalledTimes(1);
      const rowArg = mockInsertValues.mock.calls[0]?.[0];
      expect(rowArg).toMatchObject({
        paymentMethod: "sepa",
        paymentDetail: "DE89370400440532013000",
        currency: "EUR",
        amountCents: 137,
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("charges paypal in EUR for eu buyers and in USD for latam buyers", async () => {
    vi.useFakeTimers();
    try {
      const euPromise = processCheckout(
        fd({ userId: "12345678", zoneId: "10012", productId: "1", paymentMethod: "paypal", paymentDetail: "ana@x.com", paymentRegion: "eu" })
      );
      await vi.advanceTimersByTimeAsync(1500);
      await euPromise;
      const euRow = mockInsertValues.mock.calls[0]?.[0];
      expect(euRow).toMatchObject({ paymentMethod: "paypal", currency: "EUR", amountCents: 137 });

      const latamPromise = processCheckout(
        fd({ userId: "12345678", zoneId: "10012", productId: "1", paymentMethod: "paypal", paymentDetail: "ana@x.com", paymentRegion: "latam" })
      );
      await vi.advanceTimersByTimeAsync(1500);
      await latamPromise;
      const latamRow = mockInsertValues.mock.calls[1]?.[0];
      expect(latamRow).toMatchObject({ paymentMethod: "paypal", currency: "USD", amountCents: 149 });
    } finally {
      vi.useRealTimers();
    }
  });

  it("stores a USD mercadopago order with the detail and instructions", async () => {
    vi.useFakeTimers();
    try {
      const promise = processCheckout(
        fd({
          userId: "12345678",
          zoneId: "10012",
          productId: "1",
          paymentMethod: "mercadopago",
          paymentDetail: "compra@ejemplo.com",
          paymentRegion: "latam",
        })
      );
      await vi.advanceTimersByTimeAsync(1500);
      const result = assertSuccess(await promise);

      expect(result).toMatchObject({
        success: true,
        redirectUrl: "/dashboard",
      });
      expect(result.message).toContain("Te enviamos el link de pago a tu email de Mercado Pago.");

      expect(mockInsert).toHaveBeenCalledTimes(1);
      const rowArg = mockInsertValues.mock.calls[0]?.[0];
      expect(rowArg).toMatchObject({
        paymentMethod: "mercadopago",
        paymentDetail: "compra@ejemplo.com",
        currency: "USD",
        amountCents: 149,
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("stores the trimmed payment detail for binance (email field)", async () => {
    vi.useFakeTimers();
    try {
      const promise = processCheckout(
        fd({ userId: "12345678", zoneId: "10012", productId: "1", paymentMethod: "binance", paymentDetail: "  compra@ejemplo.com  ", paymentRegion: "latam" })
      );
      await vi.advanceTimersByTimeAsync(1500);
      await promise;

      const rowArg = mockInsertValues.mock.calls[0]?.[0];
      expect(rowArg).toMatchObject({
        paymentMethod: "binance",
        paymentDetail: "compra@ejemplo.com",
        currency: "USD",
        amountCents: 149,
      });
    } finally {
      vi.useRealTimers();
    }
  });
});

// ---------------------------------------------------------------------------
// getCheckoutContext()
// ---------------------------------------------------------------------------

describe("getCheckoutContext()", () => {
  it("detects the EU region from the x-vercel-ip-country header", async () => {
    mockHeadersGet.mockReturnValueOnce("DE");

    const ctx = await getCheckoutContext();
    expect(ctx.region).toBe("eu");
    expect(ctx.currency).toBe("EUR");
    expect(ctx.symbol).toBe("€");
    expect(ctx.methods.map((m) => m.id)).toEqual(["paypal", "card", "sepa", "bizum", "n26", "revolut"]);
    expect(ctx.methods[0]).toMatchObject({
      id: "paypal",
      label: "PayPal",
      needsField: true,
      fieldLabel: "Email de PayPal",
      pattern: "^\\S+@\\S+\\.\\S+$",
    });
    expect(ctx.products.find((p) => p.id === "1")?.price).toBe(1.37);
  });

  it("falls back to latam when no country header is present", async () => {
    const ctx = await getCheckoutContext();
    expect(ctx.region).toBe("latam");
    expect(ctx.currency).toBe("USD");
    expect(ctx.symbol).toBe("US$");
    expect(ctx.methods.map((m) => m.id)).toEqual(["mercadopago", "paypal", "pix", "binance"]);
    expect(ctx.products.find((p) => p.id === "1")?.price).toBe(1.49);
  });
});