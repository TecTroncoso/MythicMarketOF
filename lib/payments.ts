// Payment regions and method definitions shared by client and server.
// Pure module: no node: imports, no server-only imports — safe for both bundles.
// UI copy is neutral Spanish; currency conversion is a fixed simulation until a
// real FX provider is integrated.

import { formatAmount } from "@/lib/orders";

export type PaymentRegion = "eu" | "latam";

export interface PaymentMethodDef {
  id: string;
  label: string;
  description: string;
  needsField: boolean;
  fieldLabel?: string;
  fieldPlaceholder?: string;
  pattern?: string;
  patternHint?: string;
  /** Local SVG asset path shown as a brand badge in the checkout UI. */
  logo?: string;
}

export interface PaymentRegionConfig {
  region: PaymentRegion;
  currency: "EUR" | "USD";
  symbol: string;
  methods: PaymentMethodDef[];
}

// Simulated fixed conversion rate until a real FX provider is integrated.
export const EUR_USD_RATE = 0.92;

const EU_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE", "GB",
]);

const LATAM_COUNTRIES = new Set([
  "AR", "BO", "BR", "CL", "CO", "CR", "CU", "DO", "EC", "SV", "GT", "HN",
  "MX", "NI", "PA", "PY", "PE", "PR", "UY", "VE",
]);

export function countryToRegion(countryCode?: string | null): PaymentRegion {
  const code = countryCode?.trim().toUpperCase();
  if (code && EU_COUNTRIES.has(code)) return "eu";
  // Anything unknown or missing defaults to latam (the store's primary market).
  return "latam";
}

export const PAYMENT_REGIONS: Record<PaymentRegion, PaymentRegionConfig> = {
  eu: {
    region: "eu",
    currency: "EUR",
    symbol: "€",
    methods: [
      {
        id: "paypal",
        logo: "/logos/paypal.svg",
        label: "PayPal",
        description: "Pagá con tu cuenta de PayPal al instante.",
        needsField: true,
        fieldLabel: "Email de PayPal",
        fieldPlaceholder: "tucorreo@ejemplo.com",
        pattern: "^\\S+@\\S+\\.\\S+$",
        patternHint: "Ingresá un email válido.",
      },
      {
        id: "card",
        logo: "/logos/card.svg",
        label: "Tarjeta de crédito/débito",
        description: "Pagá con tarjeta VISA o Mastercard.",
        needsField: true,
        fieldLabel: "Número de tarjeta",
        fieldPlaceholder: "4111111111111111",
        pattern: "^\\d{13,19}$",
        patternHint: "Ingresá un número de tarjeta válido (13-19 dígitos).",
      },
      {
        id: "sepa",
        logo: "/logos/sepa.svg",
        label: "SEPA (Transferencia)",
        description: "Transferí el importe a nuestra cuenta IBAN europea.",
        needsField: true,
        fieldLabel: "IBAN",
        fieldPlaceholder: "DE89370400440532013000",
        pattern: "^[A-Z]{2}\\d{2}[A-Z0-9]{10,30}$",
        patternHint: "Ingresá un IBAN válido.",
      },
      {
        id: "bizum",
        logo: "/logos/bizum.svg",
        label: "Bizum",
        description: "Pagá desde la app de tu banco con tu teléfono.",
        needsField: true,
        fieldLabel: "Número de teléfono",
        fieldPlaceholder: "34600000000",
        pattern: "^\\+?\\d{9,12}$",
        patternHint: "Ingresá un teléfono válido (9-12 dígitos).",
      },
      {
        id: "n26",
        logo: "/logos/n26.svg",
        label: "N26",
        description: "Transferí desde tu cuenta N26 al instante.",
        needsField: true,
        fieldLabel: "IBAN de N26",
        fieldPlaceholder: "DE89370400440532013000",
        pattern: "^[A-Z]{2}\\d{2}[A-Z0-9]{10,30}$",
        patternHint: "Ingresá un IBAN válido.",
      },
      {
        id: "revolut",
        logo: "/logos/revolut.svg",
        label: "Revolut",
        description: "Transferí desde tu cuenta Revolut al instante.",
        needsField: true,
        fieldLabel: "IBAN de Revolut",
        fieldPlaceholder: "DE89370400440532013000",
        pattern: "^[A-Z]{2}\\d{2}[A-Z0-9]{10,30}$",
        patternHint: "Ingresá un IBAN válido.",
      },
    ],
  },
  latam: {
    region: "latam",
    currency: "USD",
    symbol: "US$",
    methods: [
      {
        id: "mercadopago",
        logo: "/logos/mercadopago.svg",
        label: "Mercado Pago",
        description: "Pagá con saldo, tarjeta o efectivo vía Mercado Pago.",
        needsField: true,
        fieldLabel: "Email de Mercado Pago",
        fieldPlaceholder: "tucorreo@ejemplo.com",
        pattern: "^\\S+@\\S+\\.\\S+$",
        patternHint: "Ingresá un email válido.",
      },
      {
        id: "paypal",
        logo: "/logos/paypal.svg",
        label: "PayPal",
        description: "Pagá con tu cuenta de PayPal al instante.",
        needsField: true,
        fieldLabel: "Email de PayPal",
        fieldPlaceholder: "tucorreo@ejemplo.com",
        pattern: "^\\S+@\\S+\\.\\S+$",
        patternHint: "Ingresá un email válido.",
      },
      {
        id: "pix",
        logo: "/logos/pix.svg",
        label: "Pix",
        description: "Pagá al instante con el código Pix (Brasil).",
        needsField: true,
        fieldLabel: "Clave Pix",
        fieldPlaceholder: "email, CPF o clave aleatoria",
        pattern: "^\\S{1,40}$",
        patternHint: "Ingresá una clave Pix válida.",
      },
{
        id: "binance",
        logo: "/logos/binance.svg",
        label: "Binance (USDT)",
        description: "Pagá con USDT (TRC20) desde tu cuenta de Binance.",
        needsField: true,
        fieldLabel: "Email de Binance",
        fieldPlaceholder: "tucorreo@ejemplo.com",
        pattern: "^\\S+@\\S+\\.\\S+$",
        patternHint: "Ingresá un email válido.",
      },
    ],
  },
};

export function getMethod(methodId: string): PaymentMethodDef | undefined {
  return (
    PAYMENT_REGIONS.eu.methods.find((m) => m.id === methodId) ??
    PAYMENT_REGIONS.latam.methods.find((m) => m.id === methodId)
  );
}

export function regionForMethod(methodId: string): PaymentRegion | undefined {
  if (PAYMENT_REGIONS.eu.methods.some((m) => m.id === methodId)) return "eu";
  if (PAYMENT_REGIONS.latam.methods.some((m) => m.id === methodId)) return "latam";
  return undefined;
}

export function validatePaymentDetail(methodId: string, detail: string): string | null {
  const method = getMethod(methodId);
  if (!method) return "El método de pago no es válido.";
  if (!method.needsField) return null;

  const trimmed = detail.trim();
  if (!trimmed) return method.patternHint ?? "Este campo es obligatorio.";
  if (method.pattern && !new RegExp(method.pattern).test(trimmed)) {
    return method.patternHint ?? "Este campo es obligatorio.";
  }
  return null;
}

export function convertPrice(usd: number, currency: "EUR" | "USD"): number {
  if (currency === "USD") return usd;
  return Math.round(usd * EUR_USD_RATE * 100) / 100;
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  paypal: "PayPal",
  card: "Tarjeta de crédito/débito",
  sepa: "SEPA (Transferencia)",
  bizum: "Bizum",
  n26: "N26",
  revolut: "Revolut",
  mercadopago: "Mercado Pago",
  pix: "Pix",
  binance: "Binance (USDT)",
};

export function paymentInstructions(
  methodId: string,
  amount: number,
  currency: "EUR" | "USD",
  orderNumber: string
): string {
  const formatted = formatAmount(Math.round(amount * 100), currency);
  switch (methodId) {
    case "paypal":
      return "Te enviamos la solicitud a tu cuenta de PayPal.";
    case "card":
      return "La tarjeta será cobrada al confirmar el pago.";
    case "sepa":
      return `Transferí ${formatted} al IBAN ES12 3456 7890 1234 5678 90 usando la referencia ${orderNumber}.`;
    case "bizum":
      return "Aceptá la solicitud de pago en tu app bancaria.";
    case "n26":
      return `Transferí ${formatted} al IBAN de N26 ES12 3456 7890 1234 5678 90 usando la referencia ${orderNumber}.`;
    case "revolut":
      return `Transferí ${formatted} al IBAN de Revolut ES12 3456 7890 1234 5678 90 usando la referencia ${orderNumber}.`;
    case "mercadopago":
      return "Te enviamos el link de pago a tu email de Mercado Pago.";
    case "pix":
      return `Escaneá el código Pix que te mostramos al confirmar (referencia ${orderNumber}).`;
    case "binance":
      return `Transferí ${formatted} USDT (TRC20) a la dirección ${BINANCE_RECIPIENT_ADDRESS} usando la referencia ${orderNumber}.`;
    default:
      return "Procesaremos tu pago por el método seleccionado.";
  }
}

// Bizum receipt recipient (the store's receiving account).
export const BIZUM_RECIPIENT_PHONE = "34642084779";
// Human-readable phone of the receiving Bizum account, shown in the checkout
// modal so the buyer knows where to send the Bizum.
export const BIZUM_RECIPIENT_DISPLAY = "+34 642 08 47 79";
// Display name of the receiving Bizum account.
export const BIZUM_RECIPIENT_NAME = "M00NYX";

// Binance USDT receiving address (the store's TRC20 wallet). FAKE PLACEHOLDER:
// replace with the real address before launch.
export const BINANCE_RECIPIENT_ADDRESS = "TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";

// PayPal.Me receiving account (the store's PayPal alias for EU buyers). Shown
// as the payment destination in the checkout modal; the buyer pays manually.
export const PAYPAL_ME_ALIAS = "mandyml09";
export const PAYPAL_ME_URL = `https://www.paypal.me/${PAYPAL_ME_ALIAS}`;

// Amount-prefilled PayPal.Me link for the actual purchased object: the buyer
// pays the store manually with the real total pre-filled by the URL path
// segment (2 decimals, dot-separated). The amount is never hardcoded — it is
// the current product price passed by the caller.
export function buildPaypalMeUrl(amountEur: number): string {
  return `${PAYPAL_ME_URL}/${amountEur.toFixed(2)}`;
}

export interface BizumComprobanteParams {
  orderNumber: string;
  productName: string;
  amountCents: number;
  currency: "EUR" | "USD";
  mlbbUserId: string;
  zoneId: string;
  buyerPhone: string;
  buyerName: string;
  methodLabel: string;
  /** Label for the contact line: "Tel" (default) or "Correo" for PayPal. */
  contactLabel?: string;
}

// wa.me deep link that pre-fills the payment receipt message to the store's
// WhatsApp account. Multi-line neutral Spanish for legibility on the
// recipient's phone; encodeURIComponent handles the line breaks (newlines
// become %0A, which WhatsApp renders as line breaks) and the em-dash. The
// message is method-agnostic: the method label comes from the params. When
// no order number exists yet (manual pre-confirmation notice), the Pedido and
// Referencia lines are omitted.
export function buildComprobanteUrl(params: BizumComprobanteParams): string {
  const orderLines = params.orderNumber
    ? `Pedido: ${params.orderNumber}\n` + `Referencia: ${params.orderNumber}\n`
    : "";
  const text =
    `Comprobante MythicMarket\n` +
    orderLines +
    `Producto: ${params.productName} ${formatAmount(params.amountCents, params.currency)} (${params.currency})\n` +
    `Pagador: ${params.buyerName}\n` +
    `MLBB: ${params.mlbbUserId}(${params.zoneId})\n` +
    `${params.contactLabel ?? "Tel"}: ${params.buyerPhone}\n` +
    `Método: ${params.methodLabel}`;
  return `https://wa.me/${BIZUM_RECIPIENT_PHONE}?text=${encodeURIComponent(text)}`;
}