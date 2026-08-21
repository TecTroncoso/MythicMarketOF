import { getRedisClient } from "@/lib/redis";

// Fallback in-memory para desarrollo cuando no hay Redis configurado
interface Entry {
  value: unknown;
  expiresAt: number;
}
const memory = new Map<string, Entry>();

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  if (redis) {
    const raw = await redis.get<T>(key);
    return raw ?? null;
  }
  const entry = memory.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memory.delete(key);
    return null;
  }
  return entry.value as T;
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    await redis.set(key, value, { ex: ttlSeconds });
    return;
  }
  memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function cacheDelete(key: string): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    await redis.del(key);
    return;
  }
  memory.delete(key);
}
