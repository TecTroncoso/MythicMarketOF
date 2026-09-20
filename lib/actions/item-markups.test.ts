import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockOnConflictDoUpdate = vi.fn();
const mockValues = vi.fn(() => ({ onConflictDoUpdate: mockOnConflictDoUpdate }));
const mockInsert = vi.fn(() => ({ values: mockValues }));
const mockDeleteWhere = vi.fn();
const mockDelete = vi.fn(() => ({ where: mockDeleteWhere }));
vi.mock("@/lib/db", () => ({ db: { insert: mockInsert, delete: mockDelete } }));

const mockRevalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));

const { saveItemMarkup, resetItemMarkup } = await import("@/lib/actions/item-markups");

const setAdmin = () =>
  mockAuth.mockResolvedValue({ user: { id: "a1", email: "admin@x.com", role: "admin" } });

beforeEach(() => {
  vi.clearAllMocks();
  setAdmin();
  mockOnConflictDoUpdate.mockResolvedValue(undefined);
  mockDeleteWhere.mockResolvedValue(undefined);
});

describe("saveItemMarkup()", () => {
  it("rejects non-admins", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "u1", role: "user" } });
    const result = await saveItemMarkup({
      game: "mlbb", itemKey: "78-diamonds-8-bonus", markupUsd: 0.03, markupEur: 0.03,
    });
    expect(result).toEqual({ success: false, error: "No autorizado." });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects invalid values", async () => {
    const result = await saveItemMarkup({
      game: "mlbb", itemKey: "p", markupUsd: 2, markupEur: 0.05,
    });
    expect(result).toEqual({ success: false, error: "El markup no puede superar el 100%." });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("upserts the override keyed by (game, itemKey) and revalidates", async () => {
    const result = await saveItemMarkup({
      game: "mlbb", itemKey: "78-diamonds-8-bonus", markupUsd: 0.03, markupEur: 0.07,
    });
    expect(result).toEqual({ success: true });

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        game: "mlbb",
        itemKey: "78-diamonds-8-bonus",
        markupUsd: 0.03,
        markupEur: 0.07,
        updatedBy: "admin@x.com",
      })
    );
    expect(mockOnConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        set: expect.objectContaining({ markupUsd: 0.03, markupEur: 0.07 }),
      })
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/precios/mlbb");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/topup/mlbb");
  });

  it("returns a friendly error when the write fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockOnConflictDoUpdate.mockRejectedValueOnce(new Error("no such table"));
    const result = await saveItemMarkup({
      game: "mlbb", itemKey: "p", markupUsd: 0.05, markupEur: 0.05,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("db:push");
    consoleSpy.mockRestore();
  });
});

describe("resetItemMarkup()", () => {
  it("rejects non-admins", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const result = await resetItemMarkup("mlbb", "p");
    expect(result).toEqual({ success: false, error: "No autorizado." });
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("rejects empty identifiers", async () => {
    const result = await resetItemMarkup("mlbb", "");
    expect(result).toEqual({ success: false, error: "Item inválido." });
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("deletes the override and revalidates", async () => {
    const result = await resetItemMarkup("mlbb", "combo-abc");
    expect(result).toEqual({ success: true });
    expect(mockDeleteWhere).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/precios/mlbb");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/topup/mlbb");
  });

  it("returns a friendly error when the delete throws", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockDeleteWhere.mockRejectedValueOnce(new Error("db down"));
    const result = await resetItemMarkup("mlbb", "p");
    expect(result).toEqual({ success: false, error: "No se pudo restablecer el markup." });
    consoleSpy.mockRestore();
  });
});
