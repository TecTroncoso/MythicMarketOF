// Traducción de los códigos de error de Auth.js (`/login?error=...`) a mensajes
// en español. Módulo PURO: lo usan componentes cliente y servidores.
//
// Auth.js redirige a la página de error (o a `pages.error`) con un código del
// tipo `SignInPageErrorParam`; sin este mapa el usuario vuelve al login sin
// ninguna explicación (el bug que veíamos con Google).

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    "Ese email ya tiene una cuenta con contraseña. Iniciá sesión con tu contraseña y volvé a intentar con Google.",
  OAuthSignin: "No pudimos iniciar el flujo con el proveedor. Intentá de nuevo.",
  OAuthCallbackError:
    "El proveedor devolvió un error al iniciar sesión. Intentá de nuevo.",
  OAuthCreateAccount:
    "No pudimos crear la cuenta con ese proveedor. Probá con email y contraseña.",
  EmailCreateAccount: "No pudimos crear la cuenta con ese email. Probá de nuevo.",
  Callback: "El proceso de inicio de sesión falló. Intentá de nuevo.",
  EmailSignin:
    "No pudimos enviar el enlace de acceso. Revisá el email e intentá de nuevo.",
  CredentialsSignin: "Email o contraseña incorrectos.",
  SessionRequired: "Tenés que iniciar sesión para acceder a esa página.",
  Verification: "El enlace de acceso ya fue usado o venció. Pedí uno nuevo.",
  AccessDenied: "Acceso denegado.",
};

const GENERIC_ERROR =
  "No pudimos completar el inicio de sesión. Intentá de nuevo.";

/**
 * Devuelve el mensaje en español para un código de error de Auth.js.
 * `null`/`undefined` → `null` (no hay nada que mostrar).
 */
export function authErrorMessage(code?: string | null): string | null {
  if (!code) return null;
  return AUTH_ERROR_MESSAGES[code] ?? GENERIC_ERROR;
}
