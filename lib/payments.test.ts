import { describe, it, expect } from "vitest";
import {
  BINANCE_RECIPIENT_ADDRESS,
  BIZUM_RECIPIENT_PHONE,
  buildComprobanteUrl,
  buildPaypalMeUrl,
  convertPrice,
  countryToRegion,
  getMethod,
  PAYMENT_METHOD_LABELS,
  PAYPAL_ME_URL,
  PAYMENT_REGIONS,
  paymentInstructions,
  regionForMethod,
  validatePaymentDetail,
} from "./payments";
import { formatAmount } from "./orders";

describe("payment method logos", () => {
  it("every method in every region declares a local logo asset", () => {
    for (const region of Object.values(PAYMENT_REGIONS)) {
      for (const method of region.methods) {
        expect(method.logo, `${region.region}/${method.id}`).toBeTruthy();
        expect(method.logo, `${region.region}/${method.id}`).toMatch(/^\/logos\/.+\.svg$/);
      }
    }
  });
});

describe("countryToRegion", () => {
  it("maps EU country codes to 'eu'", () => {
    expect(countryToRegion("DE")).toBe("eu");
    expect(countryToRegion("ES")).toBe("eu");
    expect(countryToRegion("GB")).toBe("eu");
  });

  it("maps LatAm country codes to 'latam'", () => {
    expect(countryToRegion("AR")).toBe("latam");
    expect(countryToRegion("MX")).toBe("latam");
    expect(countryToRegion("BR")).toBe("latam");
  });

  it("is case-insensitive", () => {
    expect(countryToRegion("de")).toBe("eu");
    expect(countryToRegion("ar")).toBe("latam");
  });

  it("falls back to 'latam' for missing or unknown codes", () => {
    expect(countryToRegion(undefined)).toBe("latam");
    expect(countryToRegion(null)).toBe("latam");
    expect(countryToRegion("")).toBe("latam");
    expect(countryToRegion("US")).toBe("latam");
    expect(countryToRegion("JP")).toBe("latam");
    expect(countryToRegion("XX")).toBe("latam");
  });
});

describe("convertPrice", () => {
  it("passes USD through unchanged", () => {
    expect(convertPrice(1.49, "USD")).toBe(1.49);
    expect(convertPrice(9.99, "USD")).toBe(9.99);
  });

  it("converts USD to EUR at the simulated rate with 2-decimal rounding", () => {
    // 1.49 * 0.92 = 1.3708 -> round to 1.37; 9.99 * 0.92 = 9.1908 -> 9.19
    expect(convertPrice(1.49, "EUR")).toBe(1.37);
    expect(convertPrice(9.99, "EUR")).toBe(9.19);
  });
});

describe("getMethod / regionForMethod", () => {
  it("finds methods across both regions", () => {
    expect(getMethod("paypal")?.label).toBe("PayPal");
    expect(getMethod("card")?.label).toBe("Tarjeta de crédito/débito");
    expect(getMethod("sepa")?.label).toBe("SEPA (Transferencia)");
    expect(getMethod("bizum")?.label).toBe("Bizum");
    expect(getMethod("n26")?.label).toBe("N26");
    expect(getMethod("revolut")?.label).toBe("Revolut");
    expect(getMethod("mercadopago")?.label).toBe("Mercado Pago");
    expect(getMethod("pix")?.label).toBe("Pix");
    expect(getMethod("binance")?.label).toBe("Binance (USDT)");
  });

  it("returns undefined for unknown methods", () => {
    expect(getMethod("bitcoin")).toBeUndefined();
  });

  it("reports the region that owns each method", () => {
    expect(regionForMethod("paypal")).toBe("eu");
    expect(regionForMethod("sepa")).toBe("eu");
    expect(regionForMethod("mercadopago")).toBe("latam");
    expect(regionForMethod("pix")).toBe("latam");
    expect(regionForMethod("binance")).toBe("latam");
    expect(regionForMethod("bitcoin")).toBeUndefined();
  });
});

describe("validatePaymentDetail", () => {
  it("rejects unknown methods", () => {
    expect(validatePaymentDetail("bitcoin", "x")).toBe("El método de pago no es válido.");
  });

  it("validates paypal emails", () => {
    expect(validatePaymentDetail("paypal", "x")).toBe("Ingresá un email válido.");
    expect(validatePaymentDetail("paypal", "a@b.co")).toBeNull();
  });

  it("validates card numbers (13-19 digits)", () => {
    expect(validatePaymentDetail("card", "411111111111")).toBe(
      "Ingresá un número de tarjeta válido (13-19 dígitos)."
    );
    expect(validatePaymentDetail("card", "4111111111111111")).toBeNull();
  });

  it("validates IBANs", () => {
    expect(validatePaymentDetail("sepa", "DE89370400440532013000")).toBeNull();
    expect(validatePaymentDetail("sepa", "1234")).toBe("Ingresá un IBAN válido.");
  });

  it("validates n26 and revolut IBANs", () => {
    expect(validatePaymentDetail("n26", "DE89370400440532013000")).toBeNull();
    expect(validatePaymentDetail("n26", "1234")).toBe("Ingresá un IBAN válido.");
    expect(validatePaymentDetail("revolut", "DE89370400440532013000")).toBeNull();
    expect(validatePaymentDetail("revolut", "1234")).toBe("Ingresá un IBAN válido.");
  });

  it("validates phone numbers for bizum", () => {
    expect(validatePaymentDetail("bizum", "34600000000")).toBeNull();
    expect(validatePaymentDetail("bizum", "123")).toBe("Ingresá un teléfono válido (9-12 dígitos).");
  });

  it("validates pix keys", () => {
    expect(validatePaymentDetail("pix", "clave")).toBeNull();
    expect(validatePaymentDetail("pix", "")).toBe("Ingresá una clave Pix válida.");
  });

  it("validates binance emails like other email-based methods", () => {
    expect(validatePaymentDetail("binance", "compra@ejemplo.com")).toBeNull();
    expect(validatePaymentDetail("binance", "")).toBe("Ingresá un email válido.");
  });

  it("trims the detail before validating", () => {
    expect(validatePaymentDetail("paypal", "  a@b.co  ")).toBeNull();
    expect(validatePaymentDetail("paypal", "  x  ")).toBe("Ingresá un email válido.");
  });
});

describe("PAYMENT_METHOD_LABELS", () => {
  it("labels all nine methods for the admin table", () => {
    expect(Object.keys(PAYMENT_METHOD_LABELS)).toHaveLength(9);
    expect(PAYMENT_METHOD_LABELS.paypal).toBe("PayPal");
    expect(PAYMENT_METHOD_LABELS.n26).toBe("N26");
    expect(PAYMENT_METHOD_LABELS.revolut).toBe("Revolut");
    expect(PAYMENT_METHOD_LABELS.mercadopago).toBe("Mercado Pago");
    expect(PAYMENT_METHOD_LABELS.binance).toBe("Binance (USDT)");
  });
});

describe("paymentInstructions", () => {
  it("embeds the order number in sepa instructions", () => {
    const out = paymentInstructions("sepa", 1.37, "EUR", "MM-ABC12345");
    expect(out).toContain("MM-ABC12345");
    expect(out).toContain("IBAN");
  });

  it("embeds the recipient address and amount in binance instructions", () => {
    const out = paymentInstructions("binance", 9.19, "USD", "MM-XYZ78901");
    expect(out).toContain(formatAmount(919, "USD"));
    expect(out).toContain("USDT (TRC20)");
    expect(out).toContain(BINANCE_RECIPIENT_ADDRESS);
    expect(out).toContain("MM-XYZ78901");
  });

  it("embeds the method name and reference in n26 and revolut instructions", () => {
    const n26 = paymentInstructions("n26", 1.37, "EUR", "ABC123");
    expect(n26).toContain("N26");
    expect(n26).toContain("ABC123");
    const revolut = paymentInstructions("revolut", 1.37, "EUR", "ABC123");
    expect(revolut).toContain("Revolut");
    expect(revolut).toContain("ABC123");
  });

  it("returns a generic message for unknown methods", () => {
    expect(paymentInstructions("bitcoin", 1, "USD", "MM-X")).toBe(
      "Procesaremos tu pago por el método seleccionado."
    );
  });
});

describe("buildComprobanteUrl", () => {
  it("builds a wa.me link whose decoded text carries the receipt details", () => {
    const url = buildComprobanteUrl({
      orderNumber: "MM-ABC12345",
      productName: "172 Diamonds",
      amountCents: 137,
      currency: "EUR",
      mlbbUserId: "12345678",
      zoneId: "10012",
      buyerPhone: "34600000000",
      buyerName: "Juan Pérez",
      methodLabel: "Bizum",
    });

    expect(url.startsWith(`https://wa.me/${BIZUM_RECIPIENT_PHONE}?text=`)).toBe(true);
    const text = decodeURIComponent(url.split("?text=")[1]);
    expect(text).toContain("MM-ABC12345");
    expect(text).toContain("172 Diamonds");
    expect(text).toContain(formatAmount(137, "EUR"));
    expect(text).toContain("34600000000");
    expect(text).toContain("Juan Pérez");
    expect(text).toContain("Método: Bizum");
    expect(text).toContain("Tel: 34600000000");
    expect(text).toContain("\n");
  });

  it("uses a custom contact label (Correo) for PayPal notices", () => {
    const url = buildComprobanteUrl({
      orderNumber: "MM-ABC12345",
      productName: "257 Diamonds",
      amountCents: 449,
      currency: "EUR",
      mlbbUserId: "12345678",
      zoneId: "10012",
      buyerPhone: "compra@ejemplo.com",
      buyerName: "Test User",
      methodLabel: "PayPal",
      contactLabel: "Correo",
    });

    const text = decodeURIComponent(url.split("?text=")[1]);
    expect(text).toContain("Correo: compra@ejemplo.com");
    expect(text).not.toContain("Tel:");
  });

  it("omits Pedido and Referencia lines when there is no order number yet", () => {
    const url = buildComprobanteUrl({
      orderNumber: "",
      productName: "172 Diamonds",
      amountCents: 299,
      currency: "EUR",
      mlbbUserId: "12345678",
      zoneId: "10012",
      buyerPhone: "compra@ejemplo.com",
      buyerName: "",
      methodLabel: "PayPal",
      contactLabel: "Correo",
    });

    const text = decodeURIComponent(url.split("?text=")[1]);
    expect(text).not.toContain("Pedido:");
    expect(text).not.toContain("Referencia:");
    expect(text).toContain("Producto: 172 Diamonds");
    expect(text).toContain("Método: PayPal");
  });
});

describe("PayPal.Me", () => {
  it("exposes the store's PayPal.Me alias in the base URL", () => {
    expect(PAYPAL_ME_URL).toContain("mandyml09");
  });

  it("builds an amount-prefilled PayPal.Me link with the passed 2-decimal amount", () => {
    expect(buildPaypalMeUrl(4.49)).toBe("https://www.paypal.me/mandyml09/4.49");
  });

  it("uses the caller-provided amount, never a hardcoded one", () => {
    expect(buildPaypalMeUrl(9.99)).toBe("https://www.paypal.me/mandyml09/9.99");
  });
});