import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks: declared at module top so Vitest hoists them before imports.
// bcryptjs is left REAL on purpose — REQ-4.5 asserts on real bcrypt hash shape.
// ---------------------------------------------------------------------------

const mockSignIn = vi.fn();

// Shared AuthError class so production code (which imports from `next-auth`)
// and tests (which construct instances) reference the exact same class.
// This makes `instanceof` work correctly across the mock boundary.
class AuthError extends Error {
  type: string;
  constructor(type: string) {
    super(type);
    this.type = type;
  }
}

vi.mock("next-auth", () => ({
  AuthError,
}));

vi.mock("@/auth", () => ({
  signIn: mockSignIn,
  AuthError,
}));

const mockVerifyTurnstileToken = vi.fn();
vi.mock("@/lib/turnstile", () => ({
  verifyTurnstileToken: mockVerifyTurnstileToken,
}));

const mockAuthRateLimiterLimit = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  authRateLimiter: { limit: mockAuthRateLimiterLimit },
  loginRateLimiter: { limit: mockAuthRateLimiterLimit },
  checkoutRateLimiter: { limit: vi.fn() },
}));

const mockFindFirst = vi.fn();
const mockInsertValues = vi.fn();
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));
vi.mock("@/lib/db", () => ({
  db: {
    query: { users: { findFirst: mockFindFirst } },
    insert: mockInsert,
  },
}));

// Import after mocks.
const { login, register } = await import("@/lib/actions/auth");
const { LoginSchema, RegisterSchema } = await import("@/lib/validations");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fd = (obj: Record<string, string>): FormData => {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) f.append(k, v);
  return f;
};

const setTurnstile = (ok: boolean) =>
  mockVerifyTurnstileToken.mockResolvedValueOnce(ok);

const setRateLimit = (success: boolean, reset = 0) =>
  mockAuthRateLimiterLimit.mockResolvedValueOnce({ success, reset });

const defaultLoginForm = () =>
  fd({ email: "ana@x.com", password: "abcdef", "cf-turnstile-response": "tok" });

const defaultRegisterForm = () =>
  fd({
    name: "Ana",
    email: "ana@x.com",
    password: "abcdef",
    confirmPassword: "abcdef",
    "cf-turnstile-response": "tok",
  });

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyTurnstileToken.mockResolvedValue(true);
  mockAuthRateLimiterLimit.mockResolvedValue({ success: true, reset: 0 });
  mockFindFirst.mockResolvedValue(undefined);
  mockInsertValues.mockResolvedValue(undefined);
  mockSignIn.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// login()
// ---------------------------------------------------------------------------

describe("login()", () => {
  it("returns Turnstile failure message and skips signIn when verification fails", async () => {
    setTurnstile(false);
    const result = await login(defaultLoginForm());
    expect(result).toEqual({
      error: "Verificación de seguridad fallida. Por favor intenta de nuevo.",
    });
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("returns the schema's first issue message on invalid input", async () => {
    const result = await login(fd({ email: "not-an-email", password: "x" }));
    expect(result).toEqual({ error: "Correo electrónico inválido" });
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("returns the rate-limit exhaustion message when limiter rejects", async () => {
    setRateLimit(false);
    const result = await login(defaultLoginForm());
    expect(result).toEqual({
      error: "Demasiados intentos fallidos. Intenta de nuevo más tarde.",
    });
  });

  it("returns 'Credenciales inválidas.' when signIn throws CredentialsSignin", async () => {
    mockSignIn.mockRejectedValueOnce(new AuthError("CredentialsSignin"));
    const result = await login(defaultLoginForm());
    expect(result).toEqual({ error: "Credenciales inválidas." });
  });

  it("returns the generic auth message when signIn throws a different AuthError type", async () => {
    mockSignIn.mockRejectedValueOnce(new AuthError("AccessDenied"));
    const result = await login(defaultLoginForm());
    expect(result).toEqual({
      error: "Hubo un problema al iniciar sesión.",
    });
  });

  it("re-throws non-AuthError errors (Next.js redirects)", async () => {
    mockSignIn.mockRejectedValueOnce(new Error("NEXT_REDIRECT"));
    await expect(login(defaultLoginForm())).rejects.toThrow("NEXT_REDIRECT");
  });

  it("returns {success: true} on a happy-path login", async () => {
    const result = await login(defaultLoginForm());
    expect(result).toEqual({ success: true });
    expect(mockSignIn).toHaveBeenCalledWith("credentials", {
      email: "ana@x.com",
      password: "abcdef",
      redirect: false,
    });
  });
});

// ---------------------------------------------------------------------------
// register()
// ---------------------------------------------------------------------------

describe("register()", () => {
  it("returns Turnstile failure message and skips DB lookups when verification fails", async () => {
    setTurnstile(false);
    const result = await register(defaultRegisterForm());
    expect(result).toEqual({
      error: "Verificación de seguridad fallida. Por favor intenta de nuevo.",
    });
    expect(mockFindFirst).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns the schema's first issue message on invalid input", async () => {
    const result = await register(
      fd({
        name: "A",
        email: "ana@x.com",
        password: "abcdef",
        confirmPassword: "abcdef",
        "cf-turnstile-response": "tok",
      }),
    );
    expect(result).toEqual({
      error: "El nombre debe tener al menos 2 caracteres",
    });
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  it("returns 'El correo ya está en uso.' when the email already exists", async () => {
    mockFindFirst.mockResolvedValueOnce({ id: "u1", email: "ana@x.com" });
    const result = await register(defaultRegisterForm());
    expect(result).toEqual({ error: "El correo ya está en uso." });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns the rate-limit exhaustion message when limiter rejects", async () => {
    setRateLimit(false);
    const result = await register(defaultRegisterForm());
    expect(result).toEqual({
      error: "Demasiados intentos. Intenta de nuevo más tarde.",
    });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns a generic internal error when the DB insert throws", async () => {
    mockInsertValues.mockRejectedValueOnce(new Error("db down"));
    const result = await register(defaultRegisterForm());
    expect(result).toEqual({
      error: "Error interno del servidor. Inténtalo más tarde.",
    });
  });

  it("hashes the password before storing (never plaintext, bcrypt $2 format, 60 chars)", async () => {
    await register(defaultRegisterForm());
    expect(mockInsert).toHaveBeenCalledTimes(1);
    // values() was called with the row object.
    const rowArg = mockInsertValues.mock.calls[0]?.[0];
    expect(rowArg).toBeDefined();
    expect(rowArg.password).toBeTypeOf("string");
    expect(rowArg.password).not.toBe("abcdef"); // never plaintext
    expect(rowArg.password.length).toBe(60); // bcrypt hash length
    expect(rowArg.password.startsWith("$2")).toBe(true); // bcrypt v2 marker
  });

  it("returns {success: true} and inserts the user on a happy-path registration", async () => {
    const result = await register(defaultRegisterForm());
    expect(result).toEqual({ success: true });
    expect(mockFindFirst).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalledTimes(1);
    const rowArg = mockInsertValues.mock.calls[0]?.[0];
    expect(rowArg).toMatchObject({
      name: "Ana",
      email: "ana@x.com",
    });
  });
});

// Touch the unused-import lint slot for RegisterSchema if it ends up
// tree-shaken out by future tooling; satisfies the no-unused-vars check.
void RegisterSchema;
void LoginSchema;
