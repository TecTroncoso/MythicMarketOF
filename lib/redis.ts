import { Redis } from "@upstash/redis";

// Cliente Redis (Upstash) compartido por cache y rate limiting.
// Si las credenciales no están configuradas, devuelve null y cada consumidor
// usa su propio fallback in-memory (solo para desarrollo).
let redisClient: Redis | null = null;

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
} catch {
  console.warn("No se pudo inicializar Redis (Upstash), usando fallback en memoria.");
}

export function getRedisClient(): Redis | null {
  return redisClient;
}
