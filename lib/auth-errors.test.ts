import { describe, it, expect } from "vitest";
import { authErrorMessage } from "./auth-errors";

describe("authErrorMessage()", () => {
  it("returns null when there is no error code", () => {
    expect(authErrorMessage()).toBeNull();
    expect(authErrorMessage(null)).toBeNull();
    expect(authErrorMessage("")).toBeNull();
  });

  it("maps the Auth.js codes users actually hit", () => {
    expect(authErrorMessage("OAuthAccountNotLinked")).toContain("contraseña");
    expect(authErrorMessage("Verification")).toContain("venció");
    expect(authErrorMessage("CredentialsSignin")).toBe(
      "Email o contraseña incorrectos."
    );
    expect(authErrorMessage("EmailSignin")).toContain("enlace");
  });

  it("falls back to a generic message for unknown codes", () => {
    const message = authErrorMessage("SomethingNew");
    expect(message).toContain("Intentá de nuevo");
  });
});
