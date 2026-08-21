"use server"

import { headers } from "next/headers"
import { auth } from "@/auth"
import { CheckoutSchema } from "@/lib/validations"
import { checkoutRateLimiter } from "@/lib/rate-limit"
import { db } from "@/lib/db"
import { orders } from "@/lib/db/schema"
import { generateOrderNumber } from "@/lib/order-number"
import { getProductById, PRODUCTS } from "@/lib/catalog"
import {
  convertPrice,
  countryToRegion,
  PAYMENT_REGIONS,
  paymentInstructions,
  validatePaymentDetail,
} from "@/lib/payments"

// Single result contract for the checkout flow: callers branch on `success`
// and get either the full order payload or a single user-facing `error`.
export type CheckoutResult =
  | {
      success: true;
      message: string;
      orderNumber: string;
      buyerName: string;
      redirectUrl: string;
    }
  | { success: false; error: string };

const failure = (error: string): CheckoutResult => ({ success: false, error });

// Region + pricing context for the checkout UI. The client never decides the
// currency: the server maps the buyer's country header to a region and prices
// every product through convertPrice (the catalog stays the price authority).
export async function getCheckoutContext() {
  const h = await headers()
  const country = h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry")
  const region = countryToRegion(country)
  const cfg = PAYMENT_REGIONS[region]

  return {
    region,
    currency: cfg.currency,
    symbol: cfg.symbol,
    methods: cfg.methods.map(
      ({ id, label, description, needsField, fieldLabel, fieldPlaceholder, pattern, patternHint }) => ({
        id,
        label,
        description,
        needsField,
        fieldLabel: fieldLabel ?? null,
        fieldPlaceholder: fieldPlaceholder ?? null,
        pattern: pattern ?? null,
        patternHint: patternHint ?? null,
      })
    ),
    products: PRODUCTS.map((p) => ({
      id: p.id,
      name: p.name,
      price: convertPrice(p.price, cfg.currency),
    })),
  }
}

export async function processCheckout(formData: FormData): Promise<CheckoutResult> {
  // 1. Verificar autenticación obligatoria
  const session = await auth()
  if (!session?.user) {
    return failure("Debes iniciar sesión para realizar una compra.")
  }

  // 2. Extraer y validar datos de forma estricta con Zod
  const userId = formData.get("userId") as string
  const zoneId = formData.get("zoneId") as string
  const productId = formData.get("productId") as string
  const paymentMethod = (formData.get("paymentMethod") as string) ?? ""
  const paymentDetail = (formData.get("paymentDetail") as string) ?? ""
  // Effective region chosen by the buyer (auto-detected or overridden in the
  // UI). The server derives currency from THIS region — never from the method,
  // because paypal exists in both regions and must follow the buyer's region.
  const paymentRegion = (formData.get("paymentRegion") as string) ?? ""

  const validatedFields = CheckoutSchema.safeParse({ userId, zoneId, productId, paymentMethod, paymentDetail })

  if (!validatedFields.success) {
    return failure(validatedFields.error.issues[0].message)
  }

  // 3. Validate the region and that the method belongs to it
  const region = paymentRegion === "eu" || paymentRegion === "latam" ? paymentRegion : null
  if (!region) {
    return failure("La región de pago no es válida.")
  }

  const method = PAYMENT_REGIONS[region].methods.find((m) => m.id === paymentMethod)
  if (!method) {
    return failure("El método de pago no es válido para tu región.")
  }

  const detailError = validatePaymentDetail(paymentMethod, paymentDetail)
  if (detailError) {
    return failure(detailError)
  }

  // 4. Verificar autoridad sobre el precio (el catálogo vive en lib/catalog.ts)
  const secureProduct = getProductById(productId)

  if (!secureProduct) {
    return failure("El producto seleccionado no es válido o ya no existe.")
  }

  // 5. Rate Limiting por usuario
  const { success } = await checkoutRateLimiter.limit(session.user.id || session.user.email || 'guest')
  if (!success) {
    return failure("Estás intentando crear demasiadas órdenes muy rápido. Espera un minuto.")
  }

  // 6. Derive the currency from the buyer's region (server-side authority)
  const currency = PAYMENT_REGIONS[region].currency
  const amountCents = Math.round(convertPrice(secureProduct.price, currency) * 100)

  // 7. Registrar la orden en la base de datos
  const orderNumber = generateOrderNumber()
  try {
    await db.insert(orders).values({
      orderNumber,
      userId: session.user.id,
      productId,
      productName: secureProduct.name,
      amountCents,
      currency,
      paymentMethod,
      paymentDetail: paymentDetail.trim() || null,
      mlbbUserId: userId,
      zoneId,
      status: "pending",
    })
  } catch (error) {
    console.error("Error al registrar la orden en la base de datos:", error)
    return failure("No se pudo registrar la orden. Intentá de nuevo.")
  }

  // 8. Simulación de procesamiento de la orden
  try {
    // Aquí iría la integración con Lootbar, Stripe, PayPal, etc.
    // Usando `secureProduct.price` en vez de cualquier precio enviado por el cliente.

    console.log(`Procesando orden ${orderNumber} para ${session.user.email}: Producto ${secureProduct.name} (${currency} ${(amountCents / 100).toFixed(2)}) a la cuenta MLBB ${userId}(${zoneId}) por ${paymentMethod}`)

    // Simular un delay de API
    await new Promise(resolve => setTimeout(resolve, 1500))

    return {
      success: true,
      message: `¡Pedido confirmado! ${paymentInstructions(paymentMethod, amountCents / 100, currency, orderNumber)}`,
      orderNumber,
      buyerName: session.user.name ?? "",
      redirectUrl: "/dashboard",
    }
  } catch (error) {
    console.error("Error al procesar el checkout:", error)
    return failure("Hubo un error al procesar tu orden. Inténtalo de nuevo.")
  }
}