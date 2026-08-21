import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks: declared at module top so Vitest hoists them before imports.
// db.select() resolves the joined rows for getReviews; db.insert().values()
// resolves an inserted row for createReview.
// ---------------------------------------------------------------------------

const REVIEW_ROWS = [
  {
    id: "r1",
    rating: 5,
    text: "Excelente servicio",
    createdAt: new Date("2026-08-18T12:00:00Z"),
    name: "Ana",
    email: "ana@x.com",
  },
  {
    id: "r2",
    rating: 4,
    text: "Muy bueno",
    createdAt: new Date("2026-08-17T10:00:00Z"),
    name: null,
    email: "carlos@x.com",
  },
  {
    id: "r3",
    rating: 3,
    text: "Aceptable",
    createdAt: new Date("2026-08-16T09:00:00Z"),
    name: null,
    email: null,
  },
];

const limitFn = vi.fn(async () => REVIEW_ROWS);
const orderByFn = vi.fn(() => ({ limit: limitFn }));
const innerJoinFn = vi.fn((_table: unknown, _condition: unknown) => ({
  orderBy: orderByFn,
}));
const fromFn = vi.fn(() => ({ innerJoin: innerJoinFn }));

const mockSelect = vi.fn(() => ({ from: fromFn }));

const mockInsertValues = vi.fn();
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

vi.mock("@/lib/db", () => ({
  db: { select: mockSelect, insert: mockInsert },
}));

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

// Import after mocks (dynamic, so the factory variables are initialized).
const { getReviews, createReview } = await import("./reviews");
import { reviews, users } from "@/lib/db/schema";

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({
    user: { id: "u1", name: "Ana", email: "ana@x.com" },
  });
  mockInsertValues.mockResolvedValue([
    { id: "r-new", rating: 5, text: "Genial", createdAt: new Date(), userId: "u1" },
  ]);
});

// ---------------------------------------------------------------------------
// getReviews()
// ---------------------------------------------------------------------------

describe("getReviews()", () => {
  it("queries reviews joined with users, ordered by createdAt desc, limited to 50", async () => {
    const result = await getReviews();

    expect(mockSelect).toHaveBeenCalledTimes(1);
    expect(fromFn).toHaveBeenCalledWith(reviews);
    expect(innerJoinFn).toHaveBeenCalledWith(users, expect.anything());
    expect(orderByFn).toHaveBeenCalledTimes(1);
    expect(limitFn).toHaveBeenCalledWith(50);
    expect(result).toHaveLength(3);
  });

  it("maps displayName from the user name", async () => {
    const result = await getReviews();

    expect(result[0]).toMatchObject({
      id: "r1",
      rating: 5,
      text: "Excelente servicio",
      createdAt: new Date("2026-08-18T12:00:00Z"),
      displayName: "Ana",
    });
  });

  it("falls back to the email prefix when the user name is null", async () => {
    const result = await getReviews();

    expect(result[1].displayName).toBe("carlos");
  });

  it("falls back to 'Cliente' when both name and email are null", async () => {
    const result = await getReviews();

    expect(result[2].displayName).toBe("Cliente");
  });
});

// ---------------------------------------------------------------------------
// createReview()
// ---------------------------------------------------------------------------

describe("createReview()", () => {
  it("returns an auth error when there is no session and does not insert", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const result = await createReview({ rating: 5, text: "Genial" });

    expect(result).toEqual({ error: "Debés iniciar sesión para dejar una reseña." });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns an auth error when the session user has no id and does not insert", async () => {
    mockAuth.mockResolvedValueOnce({ user: { name: "Ana", email: "ana@x.com" } });

    const result = await createReview({ rating: 5, text: "Genial" });

    expect(result).toEqual({ error: "Debés iniciar sesión para dejar una reseña." });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it.each([0, 6, 2.5, "5", NaN])("rejects invalid rating %s", async (rating) => {
    const result = await createReview({ rating: rating as number, text: "Genial" });

    expect(result).toEqual({
      error: "La calificación debe ser un número entero entre 1 y 5.",
    });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects empty text without inserting", async () => {
    const result = await createReview({ rating: 5, text: "   " });

    expect(result).toEqual({ error: "El comentario no puede estar vacío." });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects text longer than 500 characters without inserting", async () => {
    const result = await createReview({ rating: 5, text: "a".repeat(501) });

    expect(result).toEqual({
      error: "El comentario no puede superar los 500 caracteres.",
    });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("trims the text, inserts with the session userId and returns the review", async () => {
    const result = await createReview({ rating: 4, text: "  Muy buen servicio  " });

    expect(result.error).toBeUndefined();
    expect(result.review).toMatchObject({
      rating: 4,
      text: "Muy buen servicio",
      displayName: "Ana",
    });
    expect(result.review?.createdAt).toBeInstanceOf(Date);
    expect(typeof result.review?.id).toBe("string");
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockInsert).toHaveBeenCalledWith(reviews);
    expect(mockInsertValues).toHaveBeenCalledWith({
      userId: "u1",
      rating: 4,
      text: "Muy buen servicio",
    });
  });

  it("falls back to the email prefix for displayName when the session user has no name", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", email: "ana@x.com", name: null } });

    const result = await createReview({ rating: 5, text: "Genial" });

    expect(result.review?.displayName).toBe("ana");
  });

  it("returns a friendly error when the DB insert throws", async () => {
    mockInsertValues.mockRejectedValueOnce(new Error("db down"));

    const result = await createReview({ rating: 5, text: "Genial" });

    expect(result).toEqual({
      error: "No se pudo guardar la reseña. Intentá de nuevo.",
    });
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });
});