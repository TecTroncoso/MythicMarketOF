import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks declared at the top so Vitest hoists them before imports.

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockOnConflictDoUpdate = vi.fn();
const mockValues = vi.fn(() => ({ onConflictDoUpdate: mockOnConflictDoUpdate }));
const mockInsert = vi.fn(() => ({ values: mockValues }));
vi.mock("@/lib/db", () => ({ db: { insert: mockInsert } }));

const mockRevalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));

const { savePricingSettings } = await import("@/lib/actions/pricing");

const setAdmin = () =>
  mockAuth.mockResolvedValue({ user: { id: "a1", email: "admin@x.com", role: "admin" } });

beforeEach(() => {
  vi.clearAllMocks();
  setAdmin();
  mockOnConflictDoUpdate.mockResolvedValue(undefined);
});

describe("savePricingSettings()", () => {
  it("rejects unauthenticated calls", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const result = await savePricingSettings({ game: "mlbb", markupUsd: 0.05, markupEur: 0.05 });
    expect(result).toEqual({ success: false, error: "No autorizado." });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects non-admin users", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "u1", email: "a@b.c", role: "user" } });
    const result = await savePricingSettings({ game: "mlbb", markupUsd: 0.05, markupEur: 0.05 });
    expect(result).toEqual({ success: false, error: "No autorizado." });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects a negative markup", async () => {
    const result = await savePricingSettings({ game: "mlbb", markupUsd: -0.1, markupEur: 0.05 });
    expect(result).toEqual({ success: false, error: "El markup no puede ser negativo." });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects a markup above 100%", async () => {
    const result = await savePricingSettings({ game: "mlbb", markupUsd: 0.05, markupEur: 1.5 });
    expect(result).toEqual({ success: false, error: "El markup no puede superar el 100%." });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("upserts the settings row and revalidates the storefront and admin pages", async () => {
    const result = await savePricingSettings({ game: "mlbb", markupUsd: 0.06, markupEur: 0.09 });
    expect(result).toEqual({ success: true });

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        game: "mlbb",
        markupUsd: 0.06,
        markupEur: 0.09,
        updatedBy: "admin@x.com",
      })
    );
    expect(mockOnConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        set: expect.objectContaining({ markupUsd: 0.06, markupEur: 0.09 }),
      })
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/precios/mlbb");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/topup/mlbb");
  });

  it("returns a friendly error when the write fails (e.g. migration not applied)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockOnConflictDoUpdate.mockRejectedValueOnce(new Error("no such table: pricing_settings"));
    const result = await savePricingSettings({ game: "mlbb", markupUsd: 0.05, markupEur: 0.05 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("db:push");
    }
    consoleSpy.mockRestore();
  });
});
