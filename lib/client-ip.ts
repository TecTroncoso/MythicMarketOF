// Extrae la IP del cliente de los headers del proxy.
//
// Preferimos `x-real-ip` porque el proxy de confianza (Vercel, Nginx con
// real_ip) lo sobreescribe en cada request, mientras que `x-forwarded-for`
// puede ser prefijado/spoofeado por el cliente cuando el proxy no lo pisa.
// Detrás de un despliegue sin proxy confiable ambos headers son spoofeables
// y el rate limiting por IP pierde garantía — es una limitación del despliegue,
// no de este módulo.
export function getClientIp(headers: Headers): string {
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "unknown";
}
