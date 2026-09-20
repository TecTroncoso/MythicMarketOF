import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks hoisted before imports.

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockInsertValues = vi.fn();
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));
const mockDeleteWhere = vi.fn();
const mockDelete = vi.fn(() => ({ where: mockDeleteWhere }));
vi.mock("@/lib/db", () => ({ db: { insert: mockInsert, delete: mockDelete } }));

const mockGetLatestSupplierSnapshot = vi.fn();
vi.mock("@/lib/supplier-prices", () => ({
  getLatestSupplierSnapshot: mockGetLatestSupplierSnapshot,
}));

const mockRevalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));

const { createStoreCombo, deleteStoreCombo } = await import("@/lib/actions/combos");

const setAdmin = () =>
  mockAuth.mockResolvedValue({ user: { id: "a1", email: "admin@x.com", role: "admin" } });

const SNAPSHOT = {
  snapshot: { id: "s1" },
  rows: [
    { packageName: "78 Diamonds + 8 Bonus" },
    { packageName: "Weekly Diamond Pass" },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  setAdmin();
  mockInsertValues.mockResolvedValue(undefined);
  mockDeleteWhere.mockResolvedValue(undefined);
  mockGetLatestSupplierSnapshot.mockResolvedValue(SNAPSHOT);
});

describe("createStoreCombo()", () => {
  it("rejects non-admins", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "u1", email: "a@b.c", role: "user" } });
    const result = await createStoreCombo({
      game: "mlbb",
      components: [{ packageName: "Weekly Diamond Pass", qty: 3 }],
    });
    expect(result).toEqual({ success: false, error: "No autorizado." });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects an empty components list", async () => {
    const result = await createStoreCombo({ game: "mlbb", components: [] });
    expect(result).toEqual({ success: false, error: "Añade al menos un paquete al combo." });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects quantities out of range", async () => {
    const result = await createStoreCombo({
      game: "mlbb",
      components: [{ packageName: "Weekly Diamond Pass", qty: 11 }],
    });
    expect(result).toEqual({ success: false, error: "La cantidad máxima por paquete es 10." });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("fails when the game has no supplier snapshot yet", async () => {
    mockGetLatestSupplierSnapshot.mockResolvedValueOnce(null);
    const result = await createStoreCombo({
      game: "mlbb",
      components: [{ packageName: "Weekly Diamond Pass", qty: 2 }],
    });
    expect(result).toEqual({
      success: false,
      error: "Todavía no hay precios del proveedor importados para este juego.",
    });
  });

  it("rejects components missing from the latest snapshot", async () => {
    const result = await createStoreCombo({
      game: "mlbb",
      components: [{ packageName: "Paquete Fantasma", qty: 1 }],
    });
    expect(result).toEqual({
      success: false,
      error: "Estos paquetes ya no están en el último snapshot: Paquete Fantasma.",
    });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("persists the combo with the auto-generated name and revalidates", async () => {
    const result = await createStoreCombo({
      game: "mlbb",
      components: [{ packageName: "Weekly Diamond Pass", qty: 3 }],
    });
    expect(result).toEqual({ success: true });

    const rowArg = mockInsertValues.mock.calls[0]?.[0];
    expect(rowArg).toMatchObject({
      game: "mlbb",
      name: "3x Weekly Diamond Pass",
    });
    expect(JSON.parse(rowArg.components)).toEqual([
      { packageName: "Weekly Diamond Pass", qty: 3 },
    ]);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/precios/mlbb");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/topup/mlbb");
  });

  it("keeps a custom name when provided", async () => {
    const result = await createStoreCombo({
      game: "mlbb",
      name: "Pack Semanal x3",
      components: [{ packageName: "Weekly Diamond Pass", qty: 3 }],
    });
    expect(result).toEqual({ success: true });
    expect(mockInsertValues.mock.calls[0]?.[0]?.name).toBe("Pack Semanal x3");
  });

  it("returns a friendly error when the insert throws", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockInsertValues.mockRejectedValueOnce(new Error("no such table"));
    const result = await createStoreCombo({
      game: "mlbb",
      components: [{ packageName: "Weekly Diamond Pass", qty: 1 }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("db:push");
    }
    consoleSpy.mockRestore();
  });
});

describe("deleteStoreCombo()", () => {
  it("rejects non-admins", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const result = await deleteStoreCombo("mlbb", "c1");
    expect(result).toEqual({ success: false, error: "No autorizado." });
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("deletes by id and revalidates", async () => {
    const result = await deleteStoreCombo("mlbb", "c1");
    expect(result).toEqual({ success: true });
    expect(mockDeleteWhere).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/precios/mlbb");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/topup/mlbb");
  });

  it("returns a friendly error when the delete throws", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockDeleteWhere.mockRejectedValueOnce(new Error("db down"));
    const result = await deleteStoreCombo("mlbb", "c1");
    expect(result).toEqual({ success: false, error: "No se pudo eliminar el combo." });
    consoleSpy.mockRestore();
  });
});
