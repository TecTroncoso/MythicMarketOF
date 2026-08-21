<div align="center">

# ⚔️ Mythic Market

**La tienda de recargas para gamers — rápida, segura y sin fricción.**

Top-up de diamantes y pases de *Mobile Legends* con verificación de jugador en tiempo real,
checkout regional multi-método de pago y una arquitectura *security-first* end-to-end.

[![Next.js](https://img.shields.io/badge/Next.js%2015-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript%205.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React%2019-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/tests-221%20passing-brightgreen?style=flat-square&logo=vitest&logoColor=white)](#-testing)
[![Turso](https://img.shields.io/badge/db-Turso-FFEE58?style=flat-square&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PC9zdmc+&logoColor=black)](https://turso.tech/)

</div>

---

## 📖 Tabla de contenidos

- [Sobre el proyecto](#-sobre-el-proyecto)
- [Características](#-características)
- [Stack tecnológico](#-stack-tecnológico)
- [Arquitectura de seguridad](#-arquitectura-de-seguridad)
- [Checkout regional y pagos](#-checkout-regional-y-pagos)
- [Verificación de jugador MLBB](#-verificación-de-jugador-mlbb)
- [Panel de administración](#-panel-de-administración)
- [Estructura del proyecto](#-estructura-del-proyecto)
- [Puesta en marcha](#-puesta-en-marcha)
- [Variables de entorno](#-variables-de-entorno)
- [Testing](#-testing)
- [Scripts disponibles](#-scripts-disponibles)
- [Notas de arquitectura](#-notas-de-arquitectura)

## 🎮 Sobre el proyecto

Mythic Market es una tienda de recargas digitales construida con **Next.js 15 (App Router)** y un modelo **Zero-Trust**: ningún valor enviado por el cliente es confiable, cada frontera se valida en el servidor.

El comprador elige su paquete, verifica la cuenta de MLBB destino en tiempo real, paga con el método de su región (Europa o Latinoamérica) y recibe instrucciones claras + factura PDF. Un panel de administración con RBAC permite seguir todas las órdenes del negocio.

## ✨ Características

| Área | Detalle |
|---|---|
| 🛒 **Catálogo server-side** | Precios y productos viven solo en el servidor (`lib/catalog.ts`). El cliente envía únicamente el ID del producto. |
| 🌎 **Checkout regional** | Detección automática de país (`x-vercel-ip-country` / `cf-ipcountry`) → región **EU (€)** o **LATAM (US$)** con conversión de moneda en el servidor. |
| 💳 **9 métodos de pago** | PayPal, Tarjeta, SEPA, Bizum, N26 y Revolut (EU) · Mercado Pago, Pix, Binance USDT y PayPal (LATAM), con badges SVG de marca y validación por patrón. |
| 🔍 **Verificación MLBB en vivo** | Nickname y país del jugador mostrados antes de pagar, con debounce de 300 ms y triple cadena de fallback entre upstreams. |
| 🤖 **Anti-bot** | Cloudflare Turnstile en registro y login, con verificación server-side del token. |
| 🚦 **Rate limiting distribuido** | Ventanas deslizantes por IP/usuario sobre Upstash Redis en login, registro, checkout y lookup. |
| 🧾 **Facturas PDF** | Generación on-demand de facturas A4 con la identidad visual de la marca (`@react-pdf/renderer`). |
| 💬 **Soporte geo-horario** | Widget de WhatsApp que enruta al agente correcto (AR/ES) según país y horario laboral, con turnos por zona horaria IANA. |
| ⭐ **Reseñas verificadas** | Sistema de reseñas ligado a usuarios autenticados, cargado de forma diferida. |
| 🛡️ **Panel admin con RBAC** | Órdenes, estadísticas y filtros protegidos doblemente: Edge Middleware (JWT role) + verificación server-side. |

## 🛠 Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | [Next.js 15](https://nextjs.org/) · App Router · React 19 · Server Components por defecto |
| Lenguaje | [TypeScript 5.9](https://www.typescriptlang.org/) en modo `strict` |
| Base de datos | [Turso](https://turso.tech/) (LibSQL/SQLite distribuido) |
| ORM | [Drizzle ORM](https://orm.drizzle.team/) + migraciones versionadas |
| Autenticación | [Auth.js / NextAuth v5](https://authjs.dev/) · Google OAuth + credenciales (bcrypt) |
| Rate limiting & caché | [Upstash Redis](https://upstash.com/) con fallback in-memory |
| Anti-bot | [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) vía `@marsidev/react-turnstile` |
| Validación | [Zod v4](https://zod.dev/) en cada frontera de confianza |
| Estilos | [Tailwind CSS v4](https://tailwindcss.com/) · contraste WCAG AAA |
| PDF | [@react-pdf/renderer](https://react-pdf.org/) |
| Testing | [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) + happy-dom |

## 🔐 Arquitectura de seguridad

El principio rector es **Zero-Trust**: nada que llegue del cliente se confía, todo se valida y autoriza en el servidor.

```
Cliente ──► Edge Middleware (RBAC /admin) ──► Server Action / Route Handler
                                                ├─ 1. Sesión obligatoria (auth())
                                                ├─ 2. Zod schema estricto
                                                ├─ 3. Reglas de negocio (región, método, producto)
                                                ├─ 4. Precio resuelto SERVER-SIDE
                                                └─ 5. Rate limit por usuario/IP
                                                      │
                                                      ▼
                                                 Turso (LibSQL)
```

- **Precio autoritativo en el servidor** — el frontend nunca envía montos; el servidor resuelve el precio desde el catálogo antes de persistir la orden.
- **Validación estricta con Zod** — cada Server Action y Route Handler rechaza payloads inválidos en la frontera, no dentro de la lógica de negocio.
- **Rate limiting distribuido** — limitadores de ventana deslizante en `lib/rate-limit.ts`, respaldados por Upstash Redis. Sin credenciales, caen a un Map en memoria (solo desarrollo).
- **RBAC en el Edge** — `middleware.ts` bloquea `/admin` según el rol del JWT, sin APIs exclusivas de Node.
- **Turnstile verificado server-side** — los tokens falsificados se rechazan en `lib/turnstile.ts`.

## 💳 Checkout regional y pagos

El servidor detecta el país del comprador y deriva **región → moneda → métodos disponibles**. La moneda nunca la decide el cliente ni el método de pago: la decide la región elegida por el comprador (auto-detectada o sobrescrita en la UI).

| Región | Moneda | Métodos |
|---|---|---|
| 🇪🇺 Europa | EUR € | PayPal · Tarjeta · SEPA · Bizum · N26 · Revolut |
| 🌎 Latinoamérica | USD $ | Mercado Pago · PayPal · Pix · Binance (USDT) |

Cada método define su campo propio (email, IBAN, teléfono, clave Pix…) con validación por regex tanto en cliente como en servidor. Al confirmar, la orden se registra como `pending` y se generan:

1. **Instrucciones de pago** específicas del método (con referencia de orden).
2. **Comprobante de WhatsApp** pre-armado (`wa.me` deep link) con producto, monto, cuenta MLBB y método.
3. **Factura PDF** descargable desde el dashboard.

> ℹ️ El procesamiento de cobro es actualmente una simulación: los puntos de integración reales (Stripe, PayPal API, proveedores de top-up) están marcados en `lib/actions/checkout.ts`.

## 🔍 Verificación de jugador MLBB

Al ingresar un `userId` (5–10 dígitos) y `zoneId` (3–5 dígitos) válidos, la UI muestra el nickname y país del jugador en tiempo real, evitando recargas a cuentas equivocadas.

### Cadena triple de fallback

```
CheckoutSection (cliente, debounce 300 ms)
   ↓ POST /api/mlbb/lookup
app/api/mlbb/lookup/route.ts
   ├─ Rate limit: 30 req / 60 s por IP (ventana deslizante)
   ├─ Validación Zod: MLBBLookupSchema
   ├─ Cache check (Upstash: 24 h positiva / 5 min negativa)
   ├─ lib/mlbb/client.ts → cadena de 3 upstreams (timeout 12 s c/u)
   └─ Cache write
```

| Orden | Endpoint | Método |
|---|---|---|
| 1 | `bananagameshop.com/api/mlbb/validasi` | GET |
| 2 | `gopay.co.id/games/v1/order/user-account` | POST |
| 3 | `api.isan.eu.org/nickname/ml` | GET |

Las respuestas se normalizan a `{ nickname, country }`. Si los tres fallan, la API devuelve un fallo *suave* (`LOOKUP_FAILED`) y el checkout permanece habilitado.

### Estrategia de caché

- **Positiva** (`{ nickname, country }`): TTL 24 h — un nickname exitoso no cambia.
- **Negativa** (sentinela vacío): TTL 5 min — evita martillar endpoints caídos y recupera rápido ante cortes temporales.

## 🛡 Panel de administración

Accesible solo para usuarios con `role = "admin"` (doble control: Edge Middleware + verificación en el Server Component):

- Listado completo de órdenes con **estadísticas agregadas**.
- Filtros sanitizados server-side (`sanitizeAdminFilters`).
- Cambio de estado de órdenes (`pending` → `paid` / `cancelled`).

Para promover un administrador:

```bash
npm run set-admin -- usuario@email.com
```

## 📁 Estructura del proyecto

```
app/
├── api/
│   ├── auth/[...nextauth]/     # Handlers de NextAuth
│   ├── mlbb/lookup/            # POST /api/mlbb/lookup (rate limit + cache + fallback)
│   ├── orders/[id]/invoice/    # Factura PDF on-demand
│   └── support/on-duty/        # Agente de soporte activo según geo/horario
├── admin/                      # Panel de administración (RBAC)
├── dashboard/                  # Órdenes del usuario + facturas
├── login/, register/           # Auth pages (Server Components)
└── topup/mlbb/                 # Flujo de compra
components/
├── home/                       # Hero, categorías, best-sellers, trust banner
├── admin/                      # Panel de órdenes
├── CheckoutSection.tsx         # Checkout client-side (lazy-loaded)
├── PaymentModal.tsx            # Instrucciones + comprobante WhatsApp
├── WhatsAppWidget.tsx          # Soporte geo-horario
└── ...
lib/
├── actions/                    # Server Actions (auth, checkout, admin, reviews)
├── catalog.ts                  # Fuente única de verdad del catálogo
├── payments.ts                 # Regiones, métodos y validaciones de pago
├── mlbb/client.ts              # Único punto que conoce los upstreams
├── cache.ts                    # Upstash ↔ in-memory auto-seleccionado
├── rate-limit.ts               # Ventanas deslizantes + fallback
├── validations/                # Schemas Zod de todas las fronteras
├── db/                         # Schema Drizzle + cliente LibSQL
├── invoice-pdf.tsx             # Plantilla de factura A4
└── support-schedule.ts         # Turnos AR/ES por zona horaria
drizzle/                        # Migraciones SQL versionadas
scripts/set-admin.ts            # Promoción de admins por email
```

## 🚀 Puesta en marcha

### 1. Clonar e instalar

```bash
git clone https://github.com/TecTroncoso/MythicMarket.git
cd MythicMarket
npm install
```

### 2. Variables de entorno

```bash
cp .env.example .env
```

Completa las credenciales reales (ver tabla abajo). Para Turnstile puedes usar las claves de prueba incluidas en `.env.example`.

### 3. Base de datos

```bash
npm run db:push        # aplica el schema Drizzle a tu Turso DB
```

### 4. Levantar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## 🔑 Variables de entorno

| Variable | Requerida | Propósito |
|---|---|---|
| `AUTH_SECRET` | ✅ | Firma de sesiones NextAuth. Genera una con `npx auth secret`. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | ✅ | Credenciales OAuth de Google. |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | ✅ | Conexión a la base Turso. |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Recomendada | Rate limiting + caché en producción. Sin ellas cae a memoria local (solo dev). |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | ✅ | Cloudflare Turnstile. `.env.example` incluye claves de prueba. |

## 🧪 Testing

**221 tests en 17 archivos — todos en verde**, cubriendo Server Actions, Route Handlers, el cliente MLBB, la capa de caché, rate limiting, pagos, horarios de soporte y componentes React.

```bash
npm run test          # modo watch
npm run test:run      # suite completa una vez
npm run test:coverage # cobertura v8 sobre lib/**
```

### Estrategia por capas

- **Unitarios** (`lib/*.test.ts`): mockean dependencias externas (SDK de Upstash, `global.fetch`) y verifican normalización, TTLs y orden de fallback.
- **Route Handlers** (`app/api/**/*.test.ts`): mockean cliente/caché/limiter para validar respuestas de rate-limit, hits de caché y semántica de fallo suave.
- **Componentes** (`*.test.tsx`): happy-dom opt-in por archivo con `// @vitest-environment happy-dom`, sin contaminar el entorno global.

Convenciones: los tests viven junto al archivo que prueban (`foo.ts` → `foo.test.ts`); el entorno global es `node`.

> 🪟 **Nota Windows:** antepón `NODE_OPTIONS="--max-semi-space-size=512 --max-old-space-size=4096"` a `tsc --noEmit` y `eslint .` para evitar OOM de NewSpace con `eslint-config-next@16`.

## 📜 Scripts disponibles

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo en el puerto 3000. |
| `npm run build` | Build de producción. |
| `npm run start` | Servidor de producción (tras `build`). |
| `npm run lint` | ESLint con flat config. |
| `npm run clean` | Limpia artefactos de build de Next. |
| `npm run db:generate` | Genera archivos de migración Drizzle. |
| `npm run db:push` | Aplica el schema a Turso. |
| `npm run set-admin -- <email>` | Promueve un usuario a admin (idempotente). |
| `npm run test` / `test:run` / `test:coverage` | Suite Vitest (watch / una vez / cobertura). |

## 🏗 Notas de arquitectura

- **Degradación elegante** — toda dependencia externa (Upstash, Turnstile, los tres upstreams de MLBB) tiene un modo de fallo documentado que mantiene el flujo del usuario funcionando.
- **Swap de proveedor en un archivo** — `lib/mlbb/client.ts` es el único módulo que conoce los upstreams; migrar a una API paga (RapidAPI, etc.) es un cambio de un solo archivo más sus tests.
- **Backends condicionados por entorno** — caché y rate limiters detectan la configuración de Upstash al inicializar el módulo y caen a implementaciones in-memory cuando faltan las variables, así el desarrollo local no requiere servicios externos.
- **Módulos puros compartidos** — `catalog.ts` y `payments.ts` no importan nada de Node ni del servidor: son seguros para ambos bundles (cliente y servidor) y testeables sin mocks.

## 📄 Licencia

Proyecto privado. Todos los derechos reservados.

---

<div align="center">
<sub>Construido para sobrevivir a una web hostil. ⚔️</sub>
</div>