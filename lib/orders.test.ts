import { describe, it, expect } from "vitest";
import { generateOrderNumber } from "./order-number";
import { formatAmount, ORDER_STATUS_LABELS } from "./orders";

describe("generateOrderNumber", () => {
  it("returns MM-XXXXXXXX with only unambiguous characters", () => {
    for (let i = 0; i < 100; i++) {
      expect(generateOrderNumber()).toMatch(/^MM-[A-HJ-NP-Z2-9]{8}$/);
    }
  });

  it("generates 500 numbers without duplicates", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) {
      seen.add(generateOrderNumber());
    }
    expect(seen.size).toBe(500);
  });
});

describe("formatAmount", () => {
  it("formats USD cents in es-AR currency style", () => {
    const out = formatAmount(123456, "USD");
    // es-AR renders US$ 1.234,56; stay tolerant of locale specifics
    // (non-breaking space, currency prefix) and assert the digits.
    expect(out).toContain("1.234");
    expect(out.endsWith("56")).toBe(true);
  });
});

describe("ORDER_STATUS_LABELS", () => {
  it("covers pending, paid and cancelled", () => {
    expect(ORDER_STATUS_LABELS).toMatchObject({
      pending: "Pendiente",
      paid: "Pagada",
      cancelled: "Cancelada",
    });
  });
});