import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { EmailConfig } from "next-auth/providers/email";
import {
  DEFAULT_RESEND_FROM,
  magicLinkHtml,
  magicLinkText,
  sendMagicLinkEmail,
} from "./magic-link-email";

const provider = {
  from: "MythicMarket <no-reply@test.dev>",
} as EmailConfig;

const URL_WITH_TOKEN =
  "https://mythicmarket.vercel.app/api/auth/callback/email?callbackUrl=%2Fdashboard&token=abc123&email=ana%40x.com";

describe("magic link email", () => {
  const originalKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.RESEND_FROM_EMAIL;
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "re_test_key";
    delete process.env.RESEND_FROM_EMAIL;
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => "" });
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
    if (originalFrom === undefined) delete process.env.RESEND_FROM_EMAIL;
    else process.env.RESEND_FROM_EMAIL = originalFrom;
  });

  it("builds branded HTML with the escaped magic link", () => {
    const html = magicLinkHtml(URL_WITH_TOKEN);
    expect(html).toContain("Mythic");
    expect(html).toContain("ENTRAR A MYTHICMARKET");
    // En HTML el `&` del query string se escapa como `&amp;`.
    expect(html).toContain("token=abc123&amp;email=ana%40x.com");
    expect(html).toContain("10 minutos");
  });

  it("builds a plain-text fallback with the raw link", () => {
    const text = magicLinkText(URL_WITH_TOKEN);
    expect(text).toContain(URL_WITH_TOKEN);
    expect(text).toContain("10 minutos");
  });

  it("posts the email to the Resend API", async () => {
    await sendMagicLinkEmail({
      identifier: "ana@x.com",
      url: URL_WITH_TOKEN,
      provider,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [endpoint, init] = fetchMock.mock.calls[0];
    expect(endpoint).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer re_test_key");
    expect(init.headers["Content-Type"]).toBe("application/json");

    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      from: "MythicMarket <no-reply@test.dev>",
      to: "ana@x.com",
      subject: "Tu enlace de acceso a MythicMarket",
    });
    expect(body.html).toContain("token=abc123");
    expect(body.text).toContain(URL_WITH_TOKEN);
  });

  it("uses RESEND_FROM_EMAIL when the provider has no from", async () => {
    process.env.RESEND_FROM_EMAIL = "MythicMarket <no-reply@mythicmarket.dev>";
    await sendMagicLinkEmail({
      identifier: "ana@x.com",
      url: URL_WITH_TOKEN,
      provider: {} as EmailConfig,
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.from).toBe("MythicMarket <no-reply@mythicmarket.dev>");
  });

  it("falls back to Resend's onboarding sender", async () => {
    await sendMagicLinkEmail({
      identifier: "ana@x.com",
      url: URL_WITH_TOKEN,
      provider: {} as EmailConfig,
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.from).toBe(DEFAULT_RESEND_FROM);
  });

  it("throws when RESEND_API_KEY is missing", async () => {
    delete process.env.RESEND_API_KEY;
    await expect(
      sendMagicLinkEmail({
        identifier: "ana@x.com",
        url: URL_WITH_TOKEN,
        provider,
      })
    ).rejects.toThrow("RESEND_API_KEY");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws with the provider response when Resend rejects", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 422,
      text: async () => "invalid from domain",
    });

    await expect(
      sendMagicLinkEmail({
        identifier: "ana@x.com",
        url: URL_WITH_TOKEN,
        provider,
      })
    ).rejects.toThrow("Resend respondió 422");
  });
});
