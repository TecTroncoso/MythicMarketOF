import { NextResponse } from "next/server";
import { MLBBLookupSchema } from "@/lib/validations";
import { lookupPlayer } from "@/lib/mlbb/client";
import { cacheGet, cacheSet } from "@/lib/cache";
import { mlbbLookupRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";

const CACHE_TTL_SUCCESS = 86_400; // 24h
const CACHE_TTL_NEGATIVE = 300;   // 5min
const CACHE_KEY_PREFIX = "mlbb:lookup";

interface CachedLookup {
  nickname: string;
  country: string;
  cachedAt: number;
}

function jsonError(status: number, error: string, message: string) {
  return NextResponse.json({ success: false, error, message }, { status });
}

export async function POST(request: Request) {
  // 1. Rate limit per IP (x-real-ip del proxy de confianza, con fallback a
  // x-forwarded-for; ver lib/client-ip.ts sobre las garantías de cada header)
  const ip = getClientIp(request.headers);
  const { success: rateOk } = await mlbbLookupRateLimiter.limit(ip);
  if (!rateOk) {
    return jsonError(
      429,
      "RATE_LIMITED",
      "Demasiadas solicitudes. Probá de nuevo en un minuto."
    );
  }

  // 2. Body parse
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Body must be valid JSON");
  }

  // 3. Zod validate
  const parsed = MLBBLookupSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid input"
    );
  }
  const { userId, zoneId } = parsed.data;

  // 4. Cache check (negative cache with empty nickname is treated as a miss)
  const cacheKey = `${CACHE_KEY_PREFIX}:${userId}:${zoneId}`;
  const cached = await cacheGet<CachedLookup>(cacheKey);
  if (cached && cached.nickname) {
    return NextResponse.json({
      success: true,
      data: {
        userId,
        zoneId,
        nickname: cached.nickname,
        country: cached.country,
        cached: true,
      },
    });
  }

  // 5. Upstream chain
  const result = await lookupPlayer(userId, zoneId);
  if (!result) {
    // Negative cache so we don't hammer dead upstreams for 5min.
    await cacheSet(
      cacheKey,
      { nickname: "", country: "", cachedAt: Date.now() },
      CACHE_TTL_NEGATIVE
    );
    // HTTP 200 on purpose: soft failure per spec REQ-1.4 (UI shows warning, not error toast).
    return NextResponse.json(
      {
        success: false,
        error: "LOOKUP_FAILED",
        message: "No se pudo verificar el jugador",
      },
      { status: 200 }
    );
  }

  // 6. Cache + return success
  await cacheSet(
    cacheKey,
    { nickname: result.nickname, country: result.country, cachedAt: Date.now() },
    CACHE_TTL_SUCCESS
  );
  return NextResponse.json({
    success: true,
    data: {
      userId,
      zoneId,
      nickname: result.nickname,
      country: result.country,
      cached: false,
    },
  });
}
