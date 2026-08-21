# Mythic Market

A high-performance, security-first Next.js web application for processing digital top-ups (Mobile Legends Diamonds and similar). Built around **server-side authorization**, **distributed rate limiting**, and **graceful degradation** for third-party dependencies.

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router) on React 19
- **Language**: TypeScript 5.9 with `strict` mode
- **Database**: [Turso](https://turso.tech/) (LibSQL/SQLite at the Edge)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication**: [Auth.js / NextAuth v5](https://authjs.dev/) with Google OAuth
- **Rate Limiting & Cache**: [Upstash Redis](https://upstash.com/) with in-memory fallback
- **Anti-Bot Protection**: [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/)
- **Validation**: [Zod](https://zod.dev/) (v4) for every payload crossing the trust boundary
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Testing**: [Vitest](https://vitest.dev/) 2.1 + [Testing Library](https://testing-library.com/) + happy-dom

## Security Architecture

The application implements a Zero-Trust model: no client-supplied value is trusted, and every boundary is validated.

- **Server-Side Pricing**: Prices and product catalogs live in `lib/actions/checkout.ts` as a `SERVER_PRODUCTS` dict. The frontend sends only the product ID; the server resolves the price before processing.
- **Strict Zod Validation**: Every Server Action and Route Handler validates input with Zod schemas from `lib/validations/`. Invalid payloads are rejected at the boundary, not deep in business logic.
- **Bot Mitigation**: Registration and login flows are protected by Cloudflare Turnstile. Server-side verification in `lib/turnstile.ts` rejects forged tokens.
- **Distributed Rate Limiting**: Sensitive endpoints (login, registration, checkout, MLBB lookup) are protected by sliding-window rate limiters in `lib/rate-limit.ts`, backed by Upstash Redis. When `UPSTASH_*` env vars are absent, the limiter falls back to an in-memory Map (development mode only).
- **Edge RBAC**: `middleware.ts` blocks unauthorized access to `/admin` routes based on the JWT payload role. Runs at the Edge, no Node-only APIs.
- **AuthError Boundary**: `lib/auth.ts` re-exports NextAuth's `AuthError` so Server Actions can match against it without importing the full NextAuth module on the client.

## Performance

- **Server Components by Default**: Static UI (Hero, FAQs, Layouts) is rendered entirely on the server.
- **Dynamic Imports**: Client Components (`'use client'`) like Checkout and Reviews are isolated and lazy-loaded to keep TBT near zero.
- **Core Web Vitals**: 100/100 Lighthouse scores through explicit LCP image sizing, high-priority fetching, and WCAG AAA color contrast adherence.
- **24-Hour Server Cache**: The MLBB player lookup is cached in Upstash with a 24-hour TTL, neutralizing any rate limits on the upstream providers and cutting latency on repeat lookups to <50 ms.

## MLBB Player Lookup

When a user enters a valid Mobile Legends `userId` (5–10 digits) and `zoneId` (3–5 digits) in the checkout form, the UI displays the player's nickname and country in real time, so the user can verify they typed the correct account before paying.

### Architecture

```
CheckoutSection (client, 300ms debounce)
   ↓ POST /api/mlbb/lookup
app/api/mlbb/lookup/route.ts
   ├─ Rate limit: 30 req / 60 s per IP (sliding window)
   ├─ Zod validation: MLBBLookupSchema
   ├─ Cache check (Upstash, 24 h positive / 5 min negative)
   ├─ lib/mlbb/client.ts: 3-upstream fallback chain
   └─ Cache write
```

### Triple-Fallback Upstream Chain

The client tries three free public endpoints in order. The first one that returns a valid nickname wins; later endpoints are not called.

| Order | Endpoint | Method | Auth |
|---|---|---|---|
| 1 | `bananagameshop.com/api/mlbb/validasi` | GET | None |
| 2 | `gopay.co.id/games/v1/order/user-account` | POST | None |
| 3 | `api.isan.eu.org/nickname/ml` | GET | None |

Each upstream has a 12-second timeout via `AbortSignal.timeout`. Response shapes are normalized into `{ nickname, country }`. If all three fail, the API returns `200 { success: false, error: "LOOKUP_FAILED" }` and the UI shows a soft warning — the checkout remains enabled.

### Cache Strategy

- **Positive cache** (`{ nickname, country, cachedAt }`): TTL 24 hours. A successful nickname does not change.
- **Negative cache** (empty nickname sentinel): TTL 5 minutes. Prevents hammering dead endpoints while recovering fast from temporary outages.

The cache uses `lib/cache.ts`, which auto-selects between Upstash Redis and an in-memory Map based on env vars. `lib/mlbb/client.ts` is the only file that knows about upstream providers; switching to a paid API (RapidAPI, etc.) is a one-file change.

## Project Structure

```
app/
  api/
    auth/[...nextauth]/      NextAuth route handlers
    mlbb/lookup/route.ts     POST /api/mlbb/lookup
  login/, register/          Auth pages (server components)
components/                  Reusable UI (Navbar, CheckoutSection, AuthCard, ...)
lib/
  actions/                   Server Actions (auth, checkout)
  cache.ts                   Upstash + in-memory cache (cacheGet/cacheSet/cacheDelete)
  mlbb/                      MLBB client + tests
  rate-limit.ts              Sliding window rate limiters + in-memory fallback
  validations/               Zod schemas (Register, Login, Checkout, MLBBLookup)
  db/                        Drizzle ORM schema and client
  turnstile.ts               Server-side Turnstile verification
auth.ts, auth.config.ts      NextAuth configuration
middleware.ts                Edge RBAC for /admin
```

## Getting Started

### 1. Clone and Install

```bash
git clone https://github.com/TecTroncoso/MythicMarket.git
cd MythicMarket
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in real credentials:

```bash
cp .env.example .env
```

| Variable | Required | Purpose |
|---|---|---|
| `AUTH_SECRET` | Yes | NextAuth session signing secret. Generate with `npx auth secret`. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth credentials. |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | Yes | Turso database connection. |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Recommended | Production rate limiting + cache. Falls back to in-memory if absent (dev only). |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Yes | Cloudflare Turnstile. Test keys are included in `.env.example`. |

### 3. Database Setup

Push the Drizzle schema to your Turso database:

```bash
npm run db:push
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the Next.js dev server on port 3000. |
| `npm run build` | Production build. |
| `npm run start` | Start the production server (after `build`). |
| `npm run lint` | ESLint flat config. |
| `npm run db:generate` | Generate Drizzle migration files. |
| `npm run db:push` | Push schema to Turso. |
| `npm run test` | Run Vitest in watch mode. |
| `npm run test:run` | Run the full test suite once. |
| `npm run test:watch` | Alias of `test`. |
| `npm run test:coverage` | Run tests with v8 coverage on `lib/**`. |

## Testing

67 tests across 7 files, covering server actions, route handlers, the MLBB client, the cache layer, and React components.

### Layered Test Strategy

- **Unit tests** for `lib/cache.ts`, `lib/rate-limit.ts`, `lib/mlbb/client.ts`, and `lib/validations/` mock external dependencies (Upstash SDK, `global.fetch`) and assert normalization, TTL behavior, and chain fallback order.
- **Route handler tests** for `app/api/mlbb/lookup/route.ts` mock the client, cache, and rate limiter to verify validation, rate-limit responses, cache hit/miss, and soft-failure semantics.
- **Component tests** for `components/CheckoutSection.test.tsx` use happy-dom with the per-file directive `// @vitest-environment happy-dom` so React renders without affecting the global test environment.

### Conventions

- Test files live next to the file they test (`foo.ts` → `foo.test.ts`).
- Component tests use `.test.tsx`.
- The global test environment is `node`; React component tests opt into `happy-dom` per file.
- Windows note: prepend `NODE_OPTIONS="--max-semi-space-size=512 --max-old-space-size=4096"` to `tsc --noEmit` and `eslint .` to avoid NewSpace OOM with `eslint-config-next@16`.

## Architectural Notes

- **Graceful Degradation**: Every third-party dependency (Upstash, Turnstile, the three MLBB upstreams) has a documented failure mode that keeps the user flow working. A MLBB lookup failure shows a soft warning; checkout still proceeds.
- **Single-Point Provider Swap**: `lib/mlbb/client.ts` is the only module that knows about upstream MLBB providers. Migrating to RapidAPI or self-hosting a fork requires changing this file and its tests.
- **Env-Gated Backends**: Cache and rate limiters detect Upstash configuration at module init time and fall back to in-memory implementations when env vars are absent, so local development works without external services.

## License

Private project. All rights reserved.

---

*Architected and built for a hostile web.*
