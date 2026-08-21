import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks: declared at module top so Vitest hoists them before imports.
// The route dynamically imports @react-pdf/renderer and @/lib/invoice-pdf,
// so mocking the renderer keeps the PDF generation hermetic.
// ---------------------------------------------------------------------------

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

const mockFindFirst = vi.fn();
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      orders: { findFirst: mockFindFirst },
    },
  },
}));

const mockRenderToBuffer = vi.fn();
vi.mock("@react-pdf/renderer", () => ({
  renderToBuffer: mockRenderToBuffer,
}));

// Import after mocks.
const { GET } = await import("./route");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ORDER = {
  id: "o1",
  orderNumber: "MM-ABC23456",
  userId: "u1",
  productId: "1",
  productName: "86 Diamonds",
  amountCents: 149,
  currency: "USD",
  mlbbUserId: "12345678",
  zoneId: "10012",
  status: "pending",
  createdAt: new Date("2026-08-18T12:00:00Z"),
};

const callGet = (id: string = "o1") =>
  GET(new Request("http://localhost/api/orders/o1/invoice"), {
    params: Promise.resolve({ id }),
  });

const setUser = (user: { id: string; email?: string } | null) =>
  mockAuth.mockResolvedValueOnce(
    user ? { user: { ...user, name: "Ana", role: "user" } } : null
  );

beforeEach(() => {
  vi.clearAllMocks();
  mockRenderToBuffer.mockResolvedValue(Buffer.from("PDF"));
});

// ---------------------------------------------------------------------------
// GET /api/orders/[id]/invoice
// ---------------------------------------------------------------------------

describe("GET /api/orders/[id]/invoice", () => {
  it("returns 401 when unauthenticated", async () => {
    setUser(null);
    const res = await callGet();
    expect(res.status).toBe(401);
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  it("returns 404 when the order does not exist", async () => {
    setUser({ id: "u1", email: "ana@x.com" });
    mockFindFirst.mockResolvedValueOnce(undefined);
    const res = await callGet();
    expect(res.status).toBe(404);
  });

  it("returns 403 when the order belongs to another user", async () => {
    setUser({ id: "u2", email: "bob@x.com" });
    mockFindFirst.mockResolvedValueOnce(ORDER);
    const res = await callGet();
    expect(res.status).toBe(403);
    expect(mockRenderToBuffer).not.toHaveBeenCalled();
  });

  it("returns 200 with a PDF for the owner's order", async () => {
    setUser({ id: "u1", email: "ana@x.com" });
    mockFindFirst.mockResolvedValueOnce(ORDER);
    const res = await callGet();

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toContain(
      `factura-${ORDER.orderNumber}.pdf`
    );
    expect(await res.text()).toBe("PDF");
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.anything() })
    );
  });
});