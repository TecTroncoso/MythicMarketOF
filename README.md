<div align="center">

<img src="public/logo.png" alt="Mythic Market" width="88" />

# ⚔️ Mythic Market

**Tienda de recargas para gamers — rápida, segura y sin fricción.**

Top-up de *Mobile Legends* con verificación de jugador en tiempo real, precios vivos del proveedor con markup por item, y una arquitectura **Zero-Trust** de punta a punta.

[![Next.js 15](https://img.shields.io/badge/Next.js%2015-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React%2019-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript 5.9](https://img.shields.io/badge/TypeScript%205.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind v4](https://img.shields.io/badge/Tailwind%20v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

[![Tests 281](https://img.shields.io/badge/tests-281%20passing-success?style=for-the-badge&logo=vitest&logoColor=white)](#-testing)
[![Turso](https://img.shields.io/badge/Turso-LibSQL-4EBBB7?style=for-the-badge&logo=turso&logoColor=white)](https://turso.tech/)
[![Drizzle](https://img.shields.io/badge/Drizzle-ORM-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black)](https://orm.drizzle.team/)
[![NextAuth v5](https://img.shields.io/badge/NextAuth-v5-7B16D0?style=for-the-badge)](https://authjs.dev/)

</div>

---

## 🚀 Puesta en marcha

```bash
git clone https://github.com/TecTroncoso/MythicMarketOF.git
cd MythicMarket
npm install
cp .env.example .env   # completa las credenciales (ver tabla)
npm run db:push        # crea el schema en Turso
npm run dev            # → http://localhost:3000
```

Para probar el panel admin: `npm run set-admin -- tu@email.com` → [http://localhost:3000/admin](http://localhost:3000/admin).

## 📖 Contenido

| | | |
|---|---|---|
| [Sobre el proyecto](#-sobre-el-proyecto) | [Motor de precios](#-motor-de-precios-live) | [Verificación MLBB](#-verificación-de-jugador-mlbb) |
| [Características](#-características) | [Checkout regional](#-checkout-regional-y-pagos) | [Panel admin & scraper](#-panel-de-administración) |
| [Stack](#-stack-tecnológico) | [Seguridad Zero-Trust](#-seguridad-zero-trust) | [Estructura](#-estructura-del-proyecto) |
| [Variables de entorno](#-variables-de-entorno) | [Testing](#-testing) | [Scripts](#-scripts-disponibles) |

## 🎮 Sobre el proyecto

Venta de diamantes y pases de *Mobile Legends* con márgenes controlados al centavo: el comprador elige paquete, **verifica la cuenta destino en tiempo real**, paga con el método de su región y recibe instrucciones + factura PDF. El operador administra todo desde un panel con RBAC: órdenes, precios del proveedor, márgenes por item y combos promocionales.

Sin DOM lento ni JS pesado de más: **Server Components por defecto**, cliente solo donde hay interacción real.

## ✨ Características

| Área | Detalle |
|---|---|
| 🛒 **Catálogo vivo** | El grid "Select Top-Up" se alimenta del **último snapshot del proveedor** (Eneba) con markups por item; sin snapshot cae al catálogo estático sin romperse. El cliente jamás envía precios. |
| 🏷️ **Markup por item** | Cada paquete y cada combo define su USD (LATAM) y EUR (Europa) en `/admin/precios/mlbb`. Sin markup → vende a costo y el panel lo marca "SIN MARKUP". |
| 🧩 **Combos** | El admin combina paquetes con cantidades (ej. `3x Weekly Diamond Pass`); el coste se resuelve en vivo contra el último snapshot. |
| 🌎 **Checkout regional** | País detectado vía headers del edge → región **EU (€)** o **LATAM (US$)**; la moneda la decide el servidor, nunca el cliente. |
| 💳 **9 métodos de pago** | PayPal · Tarjeta · SEPA · Bizum · N26 · Revolut (EU) · Mercado Pago · Pix · Binance USDT (LATAM), con validación regex por método en cliente y servidor. |
| 🔍 **Verificación MLBB en vivo** | Nickname y país antes de pagar; 3 upstreams en paralelo con `Promise.any`, timeout 12 s y caché 24 h / 5 min. |
| 🤖 **Anti-bot** | Cloudflare Turnstile verificado server-side en registro y login. |
| 🚦 **Rate limiting** | Ventanas deslizantes por IP/usuario sobre Upstash Redis (fallback en memoria para dev). |
| 🧾 **Facturas PDF** | A4 con la identidad de marca, generadas on-demand por orden. |
| 💬 **Soporte geo-horario** | Widget WhatsApp que enruta al agente correcto (AR/ES) según país y turno IANA. |
| 🛡️ **RBAC triple capa** | Edge Middleware → página server-side → cada Server Action/API repite el check de rol. |

## 🛠 Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 · App Router · React 19 · Server Components por defecto |
| Lenguaje | TypeScript 5.9 `strict` |
| Datos | Turso (LibSQL) · Drizzle ORM · migraciones versionadas en `drizzle/` |
| Auth | NextAuth v5 · Google OAuth + credenciales (bcrypt) · JWT con rol |
| Infra edge | Upstash Redis (rate limit + caché, fallback in-memory) · Cloudflare Turnstile |
| Validación | Zod v4 en cada frontera |
| Estilos | Tailwind CSS v4 · contraste WCAG AAA |
| PDF | @react-pdf/renderer |
| Testing | Vitest · Testing Library · happy-dom |
| Scraper | Python 3.13 · curl_cffi · ScrapingAnt (GitHub Actions en producción) |

## 💰 Motor de precios live

El corazón del negocio. Tres fuentes componen el catálogo que ve el comprador:

```
scrapers/eneba_mlbb.py ──► supplier_price_snapshots ─┐
   (Eneba: Cat/Chk en BRL/USD/EUR)                   ├─► lib/store-catalog.ts ──► /topup/mlbb
store_combos (admin: sumas con cantidades) ──────────┤        ▲
item_markups (admin: % USD y EUR por item) ──────────┘   precio autoritativo
                                                  en el servidor (checkout)
```

| Regla | Detalle |
|---|---|
| Paquete del proveedor | `venta = checkoutProveedor × (1 + markupDelItem)` por moneda. |
| Combo | `venta = Σ(checkout × cantidad) × (1 + markupDelCombo)` — los markups de los componentes **no** se heredan. |
| Item sin markup | Vende **a costo** (0%) y el panel lo marca en rojo "SIN MARKUP". |
| Moneda faltante | Un paquete sin checkout EUR no se muestra a compradores EU (en vez de cobrar con la moneda equivocada). |
| Snapshot nuevo | Los precios se revalúan solos: costos y combos siguen el último scrape. |

Dashboard: [localhost:3000/dashboard](http://localhost:3000/dashboard) muestra al comprador sus órdenes `pending` con factura descargable.

## 💳 Checkout regional y pagos

| Región | Moneda | Métodos |
|---|---|---|
| 🇪🇺 Europa | EUR € | PayPal · Tarjeta · SEPA · Bizum · N26 · Revolut |
| 🌎 LATAM | USD $ | Mercado Pago · PayPal · Pix · Binance USDT |

Región auto-detectada (`x-vercel-ip-country` / `cf-ipcountry`), sobrescribible en el modal. Cada método exige su campo (email, IBAN, teléfono, clave Pix…) con regex validada en ambos lados. Al confirmar, la orden queda `pending` con instrucciones de pago + comprobante WhatsApp pre-armado (`wa.me`) + factura PDF.

> [!NOTE]
> El cobro real está pendiente de integración (Stripe / PayPal API / Mercado Pago). Los puntos de extensión están marcados en `lib/actions/checkout.ts`.

## 🔐 Seguridad Zero-Trust

Nada que llegue del cliente es confiable; cada frontera valida en el servidor:

```
Cliente ──► Edge Middleware (RBAC) ──► Server Action / Route Handler
                                          ├─ 1. Sesión obligatoria (auth())
                                          ├─ 2. Zod estricto en el payload
                                          ├─ 3. Reglas de negocio (región ↔ método)
                                          ├─ 4. Precio resuelto EN EL SERVIDOR
                                          └─ 5. Rate limit por IP/usuario
                                                ▼
                                            Turso (LibSQL)
```

- **RBAC en 3 capas**: middleware bloquea `/admin`, la página repite el check de rol, y cada action/API lo verifica otra vez.
- **Precio autoritativo**: el grid muestra precios calculados en servidor; la orden persiste los centavos resueltos allí mismo.
- **IP de cliente** para rate limiting via `x-real-ip` / `x-forwarded-for` del proxy de confianza.

## 🔍 Verificación de jugador MLBB

```
CheckoutSection (debounce 300 ms)
   ↓ POST /api/mlbb/lookup       (rate limit 30/min por IP · Zod)
lib/mlbb/client.ts (Promise.any, 12 s por upstream)
   ├─ 1. bananagameshop.com/api/mlbb/validasi   (GET)
   ├─ 2. gopay.co.id/games/v1/order/user-account (POST)
   └─ 3. api.isan.eu.org/nickname/ml            (GET)
Caché: 24 h positiva / 5 min negativa (sentinela anti-martilleo)
```

Si los tres fallan → fallo suave `LOOKUP_FAILED` y la compra sigue habilitada. Cambiar de proveedor exige tocar **un solo archivo**.

## 🛡️ Panel de administración

Ruta protegida en tres niveles (`role = "admin"`):

- `/admin` — órdenes con stats agregadas, filtros sanitizados, cambio de estado (`pending` → `paid`/`cancelled`).
- `/admin/precios` — catálogo de juegos con fecha del último scrape.
- `/admin/precios/mlbb` — tabla Cat/Chk BRL/USD/EUR del proveedor, columna **Venta**, editor de **markup por item**, gestión de **combos** y botón **"Actualizar precios"**.

Para promover un admin: `npm run set-admin -- usuario@email.com`.

## 🕷️ Scraper de precios

El botón del panel dispara el mismo scraper con dos motores según el entorno:

| Entorno | Mecanismo |
|---|---|
| Local | `spawn` directo de `venv/Scripts/python.exe` (auto-detectado; `ENEBA_PYTHON_PATH` como override). |
| Vercel | Dispatch de `.github/workflows/scrape-prices.yml` (GitHub Actions) + lectura de estado por API. |

Cada corrida crea un snapshot inmutable (`supplier_price_snapshots` + `supplier_price_rows`, precios en centavos); el historial sirve para auditar márgenes. Consola alternativa: `python scrapers/eneba_mlbb.py` → `npm run import-eneba`.

<details>
<summary><b>Añadir un juego nuevo</b></summary>

1. Crear `scrapers/eneba_<juego>.py` que escriba `scrapers/output/` con `"game": "<id>"`.
2. Registrar el juego en `lib/supplier-games.ts` y el script en `lib/scrapers.ts`.
3. Registrar el caso en el workflow (`if: inputs.game == '<id>'` + opción en `options`).

</details>

## 📁 Estructura del proyecto

```
app/
├── api/
│   ├── admin/scrape-prices/    # POST dispara scraper · GET estado (local | GitHub Actions)
│   ├── auth/[...nextauth]/     # Handlers NextAuth
│   ├── mlbb/lookup/            # POST lookup con rate limit + cache + fallback
│   ├── orders/[id]/invoice/    # Factura PDF on-demand
│   └── support/on-duty/        # Agente activo según geo/horario
├── admin/                      # Panel RBAC · precios/[game] con tablas y markups
├── dashboard/                  # Órdenes del usuario + facturas
├── login/, register/           # Auth (Server Components)
└── topup/mlbb/                 # Flujo de compra

components/
├── admin/                      # AdminOrdersPanel · ScrapePricesButton · StoreCombosPanel · ItemMarkupEditor
├── home/                       # Hero · categorías · best-sellers
├── CheckoutSection.tsx         # Checkout client-side (lazy)
├── PaymentModal.tsx            # Instrucciones + comprobante WhatsApp
└── WhatsAppWidget.tsx          # Soporte geo-horario

lib/
├── actions/                    # Server Actions: auth · checkout · admin · reviews · combos · item-markups
├── store-catalog.ts            # Catálogo live: snapshot + combos + markups → productos
├── item-markups.ts             # Markup por item (tabla item_markups; 0% si falta)
├── store-combos.ts             # Combos del admin (tabla store_combos)
├── markup.ts                   # Primitivas de markup PURAS (seguro en cliente)
├── catalog.ts                  # Catálogo estático de respaldo
├── payments.ts                 # Regiones, métodos, validaciones, conversión
├── mlbb/client.ts              # Único punto que conoce los 3 upstreams
├── supplier-games.ts           # Registro de juegos con tracking
├── scrapers.ts / scrape-jobs.ts# Registro y runner del scraper (local · GitHub Actions)
├── supplier-prices.ts          # Parser JSON → snapshot + consultas del panel
├── cache.ts / rate-limit.ts    # Upstash ↔ in-memory auto-seleccionados
├── validations/                # Schemas Zod de todas las fronteras
├── db/                         # Schema Drizzle + cliente LibSQL
├── invoice-pdf.tsx             # Plantilla factura A4
└── support-schedule.ts         # Turnos AR/ES por zona horaria

scrapers/                       # Python + output/ (JSON del último scrape, ignorado por git)
scripts/                        # set-admin.ts · import-eneba-prices.ts
.github/workflows/              # scrape-prices.yml
drizzle/                        # Migraciones SQL versionadas (0000–0008)
```

## 🔑 Variables de entorno

| Variable | Requerida | Propósito |
|---|---|---|
| `AUTH_SECRET` | ✅ | Firma de sesiones (`npx auth secret` genera una). |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | ✅ | OAuth de Google. |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | ✅ | Base de datos. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | ✅ | Anti-bot (`.env.example` trae claves de prueba). |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Recomendada | Rate limit + caché; sin ellas cae a memoria (solo dev). |
| `SCRAPINGANT_API_KEY` | Scraper | Proxy BR para consultar checkout real. |
| `ENEBA_USER_ID` / `ENEBA_ZONE_ID` | Scraper | Cuenta MLBB de simulación de checkout. |
| `ENEBA_PYTHON_PATH` | Opcional | Ruta al Python del venv si no se detecta solo. |
| `GITHUB_REPO` / `GITHUB_TOKEN` | Solo Vercel | Disparo del workflow por API (PAT con `actions:write`). |

> [!IMPORTANT]
> Los 5 valores del scraper/Turso deben existir como **secrets de GitHub Actions** para el modo Vercel: `SCRAPINGANT_API_KEY`, `ENEBA_USER_ID`, `ENEBA_ZONE_ID`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`. Si falta alguno, el workflow lo reporta en su primer paso.

## 🧪 Testing

**281 tests · 23 archivos · todos en verde.**

| Capa | Cubierto |
|---|---|
| Lógica pura | Pagos, catálogo, store-catalog (combo/markup/overrides), parser del scraper, horarios, order-number, caché, rate-limit, IP |
| Server Actions | auth · checkout · admin · reviews · combos · item-markups |
| Route handlers | `/api/mlbb/lookup` · `/api/orders/[id]/invoice` |
| Componentes | `CheckoutSection` · `WhatsAppWidget` (happy-dom opt-in) |

```bash
npm run test            # watch
npm run test:run        # suite completa
npm run test:coverage   # cobertura v8 sobre lib/**
```

Convenciones: tests colocalizados (`foo.ts` → `foo.test.ts`), entorno global `node`, mocks acotados por test.

> [!TIP]
> En Windows, antepón `NODE_OPTIONS="--max-semi-space-size=512 --max-old-space-size=4096"` a `tsc --noEmit` y `eslint .` para evitar OOM de NewSpace con `eslint-config-next@16`.

## 📜 Scripts disponibles

| Script | Qué hace |
|---|---|
| `npm run dev` / `build` / `start` | Ciclo de desarrollo habitual. |
| `npm run lint` | ESLint flat config. |
| `npm run db:generate` / `db:push` | Migraciones Drizzle → Turso. |
| `npm run set-admin -- <email>` | Promueve a admin (idempotente). |
| `npm run import-eneba` | Importa el JSON del scraper como snapshot. |
| `npm run test` / `test:run` / `test:coverage` | Suite Vitest. |
| `npm run clean` | Borra artefactos de build. |

## 🏗️ Notas de arquitectura

- **Degradación elegante por diseño**: cada dependencia externa (Upstash, Turnstile, los tres upstreams MLBB, el snapshot) tiene un modo de fallo documentado que mantiene el flujo del usuario funcionando.
- **Módulos puros compartidos**: `markup.ts`, `catalog.ts` y `payments.ts` no importan nada de servidor — seguros en ambos bundles y testeables sin mocks. Los paneles del admin (componentes cliente) nunca importan directamente módulos DB, para no arrastrar libsql al navegador.
- **Swap de upstreams en un archivo**: `lib/mlbb/client.ts` concentra los 3 endpoints de lookup; migrar a API paga es un cambio acotado con sus tests.

## 📄 Licencia

Proyecto privado. Todos los derechos reservados.

---

<div align="center">
<sub>Construido para sobrevivir a una web hostil. ⚔️</sub>
</div>
