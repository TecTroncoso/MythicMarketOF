export async function verifyTurnstileToken(token: string) {
  if (!process.env.TURNSTILE_SECRET_KEY) {
    console.warn("Turnstile no está configurado (falta TURNSTILE_SECRET_KEY). Omitiendo validación.");
    return true; // Solo para dev si no hay token
  }

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `secret=${process.env.TURNSTILE_SECRET_KEY}&response=${token}`,
  });

  const data = await res.json();
  return data.success;
}
