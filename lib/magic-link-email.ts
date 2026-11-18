// Envío del magic link (login sin contraseña) usando la API HTTP de Resend.
//
// El provider Email de Auth.js exige un `server` de nodemailer en su config
// (aunque reemplacemos el envío), porque `@auth/core/providers/nodemailer`
// importa `nodemailer` en el nivel superior del módulo.
//
// El remitente sale de RESEND_FROM_EMAIL: para probar sirve
// "MythicMarket <onboarding@resend.dev>"; en producción, un dominio verificado
// en Resend (por ejemplo no-reply@tudominio.com).

import type { EmailConfig } from "next-auth/providers/email";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
export const DEFAULT_RESEND_FROM = "MythicMarket <onboarding@resend.dev>";

export interface MagicLinkParams {
  identifier: string;
  url: string;
  provider: EmailConfig;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** HTML del email (tablas + estilos inline para clientes de correo). */
export function magicLinkHtml(url: string): string {
  const href = escapeHtml(url);
  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background-color:#070514;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#070514;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#0a0618;border:1px solid #3b2373;border-radius:16px;padding:32px;">
            <tr>
              <td align="center" style="padding-bottom:8px;">
                <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Mythic<span style="color:#d946ef;">Market</span></span>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:16px 0 8px;">
                <h1 style="margin:0;font-size:20px;color:#ffffff;">Tu enlace de acceso</h1>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:8px 0 24px;color:#b8b3d0;font-size:14px;line-height:22px;">
                Hacé clic en el botón para entrar a tu cuenta.<br />No necesitás contraseña.
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom:24px;">
                <a href="${href}" style="display:inline-block;background:linear-gradient(90deg,#7c3aed,#d946ef);color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 28px;border-radius:10px;">ENTRAR A MYTHICMARKET</a>
              </td>
            </tr>
            <tr>
              <td align="center" style="color:#8b86a8;font-size:12px;line-height:20px;">
                El enlace vence en 10 minutos y solo puede usarse una vez.<br />
                Si no pediste este email, ignoralo.
              </td>
            </tr>
          </table>
          <p style="color:#5f5a7a;font-size:11px;margin:20px 0 0;">MythicMarket · Recargas y gaming</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Versión texto plano (fallback para clientes que no renderizan HTML). */
export function magicLinkText(url: string): string {
  return [
    "Entrá a MythicMarket con este enlace:",
    url,
    "",
    "El enlace vence en 10 minutos y solo puede usarse una vez.",
    "Si no pediste este email, ignoralo.",
  ].join("\n");
}

/**
 * `sendVerificationRequest` del provider Email: manda el enlace por Resend.
 * Lanza si falta la API key o si Resend rechaza el envío, para que Auth.js
 * redirija a la página de error con `EmailSignin`.
 */
export async function sendMagicLinkEmail({
  identifier,
  url,
  provider,
}: MagicLinkParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY no está configurada.");
  }

  const from =
    provider.from || process.env.RESEND_FROM_EMAIL || DEFAULT_RESEND_FROM;

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: identifier,
      subject: "Tu enlace de acceso a MythicMarket",
      html: magicLinkHtml(url),
      text: magicLinkText(url),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Resend respondió ${res.status}: ${detail.slice(0, 300)}`
    );
  }
}
