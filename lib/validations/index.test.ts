import { describe, it, expect } from "vitest";
import {
  RegisterSchema,
  LoginSchema,
  CheckoutSchema,
  MLBBLookupSchema,
} from "@/lib/validations";

describe("RegisterSchema", () => {
  it("accepts valid registration data", () => {
    const result = RegisterSchema.safeParse({
      name: "Ana",
      email: "ana@x.com",
      password: "abcdef",
      confirmPassword: "abcdef",
    });
    expect(result.success).toBe(true);
  });

  it("rejects name shorter than 2 characters", () => {
    const result = RegisterSchema.safeParse({
      name: "A",
      email: "ana@x.com",
      password: "abcdef",
      confirmPassword: "abcdef",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "El nombre debe tener al menos 2 caracteres",
      );
    }
  });

  it("rejects invalid email", () => {
    const result = RegisterSchema.safeParse({
      name: "Ana",
      email: "not-an-email",
      password: "abcdef",
      confirmPassword: "abcdef",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Correo electrónico inválido",
      );
    }
  });

  it("rejects password shorter than 6 characters", () => {
    const result = RegisterSchema.safeParse({
      name: "Ana",
      email: "ana@x.com",
      password: "abc",
      confirmPassword: "abc",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "La contraseña debe tener al menos 6 caracteres",
      );
    }
  });

  it("rejects password mismatch on confirmPassword with exact message and path", () => {
    const result = RegisterSchema.safeParse({
      name: "Ana",
      email: "ana@x.com",
      password: "abcdef",
      confirmPassword: "xyzxyz",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const confirmIssue = result.error.issues.find(
        (issue) => issue.path[0] === "confirmPassword",
      );
      expect(confirmIssue).toBeDefined();
      expect(confirmIssue?.message).toBe("Las contraseñas no coinciden");
    }
  });
});

describe("LoginSchema", () => {
  it("accepts valid login data", () => {
    const result = LoginSchema.safeParse({
      email: "ana@x.com",
      password: "any",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = LoginSchema.safeParse({
      email: "not-an-email",
      password: "any",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Correo electrónico inválido",
      );
    }
  });

  it("rejects empty password with required message", () => {
    const result = LoginSchema.safeParse({
      email: "ana@x.com",
      password: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "La contraseña es requerida",
      );
    }
  });
});

describe("CheckoutSchema", () => {
  it("accepts valid checkout data", () => {
    const result = CheckoutSchema.safeParse({
      userId: "12345",
      zoneId: "123",
      productId: "1",
      paymentMethod: "paypal",
      paymentDetail: "ana@x.com",
    });
    expect(result.success).toBe(true);
  });

  it("accepts checkout data without paymentDetail", () => {
    const result = CheckoutSchema.safeParse({
      userId: "12345",
      zoneId: "123",
      productId: "1",
      paymentMethod: "oxxo",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty paymentMethod", () => {
    const result = CheckoutSchema.safeParse({
      userId: "12345",
      zoneId: "123",
      productId: "1",
      paymentMethod: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Debes seleccionar un método de pago.",
      );
    }
  });

  it("rejects paymentDetail longer than 60 characters", () => {
    const result = CheckoutSchema.safeParse({
      userId: "12345",
      zoneId: "123",
      productId: "1",
      paymentMethod: "paypal",
      paymentDetail: "x".repeat(61),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "El dato de pago es demasiado largo.",
      );
    }
  });

  it("rejects userId shorter than 5 digits", () => {
    const result = CheckoutSchema.safeParse({
      userId: "1234",
      zoneId: "123",
      productId: "1",
      paymentMethod: "paypal",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("El User ID es inválido");
    }
  });

  it("rejects userId with non-numeric characters", () => {
    const result = CheckoutSchema.safeParse({
      userId: "1234a",
      zoneId: "123",
      productId: "1",
      paymentMethod: "paypal",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "El User ID solo debe contener números",
      );
    }
  });

  it("rejects zoneId longer than 6 digits", () => {
    const result = CheckoutSchema.safeParse({
      userId: "12345",
      zoneId: "1234567",
      productId: "1",
      paymentMethod: "paypal",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("El Zone ID es inválido");
    }
  });

  it("rejects empty productId", () => {
    const result = CheckoutSchema.safeParse({
      userId: "12345",
      zoneId: "123",
      productId: "",
      paymentMethod: "paypal",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Debes seleccionar un producto válido",
      );
    }
  });
});

describe("MLBBLookupSchema", () => {
  it("accepts valid input", () => {
    const result = MLBBLookupSchema.parse({
      userId: "12345678",
      zoneId: "10012",
    });
    expect(result.userId).toBe("12345678");
    expect(result.zoneId).toBe("10012");
  });

  it("rejects non-digit userId", () => {
    expect(() =>
      MLBBLookupSchema.parse({ userId: "abc12345", zoneId: "10012" }),
    ).toThrow();
  });

  it("rejects userId outside 5-10 digits", () => {
    expect(() =>
      MLBBLookupSchema.parse({ userId: "1234", zoneId: "10012" }),
    ).toThrow();
    expect(() =>
      MLBBLookupSchema.parse({ userId: "12345678901", zoneId: "10012" }),
    ).toThrow();
  });

  it("rejects zoneId outside 3-5 digits", () => {
    expect(() =>
      MLBBLookupSchema.parse({ userId: "12345678", zoneId: "12" }),
    ).toThrow();
    expect(() =>
      MLBBLookupSchema.parse({ userId: "12345678", zoneId: "123456" }),
    ).toThrow();
  });
});
