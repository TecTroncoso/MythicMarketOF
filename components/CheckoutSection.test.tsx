// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";

// The component imports the `processCheckout` server action, which transitively
// pulls in next-auth + next/server. Those imports fail under happy-dom. Since the
// lookup tests do not exercise checkout submission, we stub the action entirely.
vi.mock("@/lib/actions/checkout", () => ({
  processCheckout: vi.fn(async () => ({ success: false as const, error: "" })),
  getCheckoutContext: vi.fn(async () => ({
    region: "latam",
    currency: "USD",
    symbol: "US$",
    methods: [
      {
        id: "mercadopago",
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
        label: "Binance (USDT)",
        description: "Pagá con USDT (TRC20) desde tu cuenta de Binance.",
        needsField: true,
        fieldLabel: "Email de Binance",
        fieldPlaceholder: "tucorreo@ejemplo.com",
        pattern: "^\\S+@\\S+\\.\\S+$",
        patternHint: "Ingresá un email válido.",
      },
    ],
    products: [
      { id: "1", name: "86 Diamonds", price: 1.49 },
      { id: "2", name: "172 Diamonds", price: 2.99 },
      { id: "3", name: "257 Diamonds", price: 4.49 },
      { id: "4", name: "429 Diamonds", price: 7.49 },
      { id: "5", name: "706 Diamonds", price: 11.99 },
      { id: "6", name: "2195 Diamonds", price: 34.99 },
      { id: "7", name: "Twilight Pass", price: 9.99 },
      { id: "8", name: "Weekly Diamond Pass", price: 1.99 },
    ],
  })),
}));

import { CheckoutSection } from "./CheckoutSection";
import { processCheckout } from "@/lib/actions/checkout";
import { BIZUM_RECIPIENT_PHONE } from "@/lib/payments";
import { formatAmount } from "@/lib/orders";

const SUCCESS_RESPONSE = (nickname: string, country: string) => ({
  ok: true,
  status: 200,
  json: async () => ({
    success: true,
    data: { userId: "12345678", zoneId: "10012", nickname, country, cached: false },
  }),
});

const FAILURE_RESPONSE = {
  ok: true,
  status: 200,
  json: async () => ({ success: false, error: "LOOKUP_FAILED" }),
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(processCheckout).mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  cleanup();
});

const userIdInput = () => screen.getByPlaceholderText("Ej. 12345678") as HTMLInputElement;
const zoneIdInput = () => screen.getByPlaceholderText("Ej. (1234)") as HTMLInputElement;

// `act` flushes pending React state updates triggered inside the callback.
// Under fake timers, advancing time fires the debounce callback which awaits
// fetch + json parsing; the resulting setState must run inside `act` to commit
// before the test makes assertions.
async function flush(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

async function typeValid() {
  fireEvent.change(userIdInput(), { target: { value: "12345678" } });
  fireEvent.change(zoneIdInput(), { target: { value: "10012" } });
  await flush(300);
}

// Record the navigation target; getter keeps a valid absolute base URL so
// next/image can still resolve image sources during render (happy-dom's
// real Location.href setter rejects relative paths).
function stubLocation() {
  const locationSetter = vi.fn();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      get href() {
        return "http://localhost/";
      },
      set href(value: string) {
        locationSetter(value);
      },
    },
  });
  return locationSetter;
}

describe("CheckoutSection MLBB lookup UX", () => {
  it("renders without nickname initially (idle state)", () => {
    render(<CheckoutSection isLoggedIn={false} />);
    expect(screen.queryByText(/Verificando jugador/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/No pudimos verificar el nickname/i)).not.toBeInTheDocument();
  });

  it("types userId+zoneId, after 300ms shows loading then success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(SUCCESS_RESPONSE("*Legend__gamer*", "PH"));
    vi.stubGlobal("fetch", fetchMock);

    render(<CheckoutSection isLoggedIn={false} />);
    await typeValid();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/mlbb/lookup",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ userId: "12345678", zoneId: "10012" }),
      }),
    );

    expect(screen.getByText("*Legend__gamer*")).toBeInTheDocument();
    expect(screen.getByText("(PH)")).toBeInTheDocument();
  });

  it("types invalid userId, does not fire lookup", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<CheckoutSection isLoggedIn={false} />);
    fireEvent.change(userIdInput(), { target: { value: "abc" } });
    fireEvent.change(zoneIdInput(), { target: { value: "10012" } });

    await flush(500);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByText(/Verificando jugador/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/No pudimos verificar el nickname/i)).not.toBeInTheDocument();
  });

  it("types valid input, mock returns failure, shows warning", async () => {
    const fetchMock = vi.fn().mockResolvedValue(FAILURE_RESPONSE);
    vi.stubGlobal("fetch", fetchMock);

    render(<CheckoutSection isLoggedIn={false} />);
    await typeValid();

    const status = screen.getByText(/No pudimos verificar el nickname/i);
    expect(status).toBeInTheDocument();
    expect(status.getAttribute("role")).toBe("status");
  });

  it("submit button is enabled in all states (idle, loading, success, warning)", async () => {
    const fetchSuccess = vi.fn().mockResolvedValue(SUCCESS_RESPONSE("Hero", "PH"));
    const fetchFail = vi.fn().mockResolvedValue(FAILURE_RESPONSE);

    // ---- IDLE: select product, no input typed → button present, enabled
    const { unmount } = render(<CheckoutSection isLoggedIn={true} />);
    fireEvent.click(screen.getByText(/172 Diamonds/));
    const idleButton = screen.getByRole("button", { name: /Comprar Ahora/i }) as HTMLButtonElement;
    expect(idleButton.disabled).toBe(false);
    unmount();

    // ---- LOADING: fetch is pending (we never resolve), button enabled
    const fetchPending = vi.fn().mockReturnValue(new Promise(() => {}));
    vi.stubGlobal("fetch", fetchPending);
    const { unmount: unmountLoading } = render(<CheckoutSection isLoggedIn={true} />);
    fireEvent.click(screen.getByText(/172 Diamonds/));
    fireEvent.change(userIdInput(), { target: { value: "12345678" } });
    fireEvent.change(zoneIdInput(), { target: { value: "10012" } });
    // Advance only 1ms past debounce so the timer fires but the pending fetch
    // never resolves → we stay in `loading`.
    await flush(301);
    expect(screen.getByText(/Verificando jugador/i)).toBeInTheDocument();
    const loadingButton = screen.getByRole("button", {
      name: /Comprar Ahora|Procesando/i,
    }) as HTMLButtonElement;
    expect(loadingButton.disabled).toBe(false);
    unmountLoading();
    vi.unstubAllGlobals();

    // ---- SUCCESS
    vi.stubGlobal("fetch", fetchSuccess);
    const { unmount: unmountSuccess } = render(<CheckoutSection isLoggedIn={true} />);
    fireEvent.click(screen.getByText(/172 Diamonds/));
    await typeValid();
    expect(screen.getByText("Hero")).toBeInTheDocument();
    const successButton = screen.getByRole("button", { name: /Comprar Ahora/i }) as HTMLButtonElement;
    expect(successButton.disabled).toBe(false);
    unmountSuccess();
    vi.unstubAllGlobals();

    // ---- WARNING
    vi.stubGlobal("fetch", fetchFail);
    render(<CheckoutSection isLoggedIn={true} />);
    fireEvent.click(screen.getByText(/172 Diamonds/));
    await typeValid();
    expect(screen.getByText(/No pudimos verificar el nickname/i)).toBeInTheDocument();
    const warningButton = screen.getByRole("button", { name: /Comprar Ahora/i }) as HTMLButtonElement;
    expect(warningButton.disabled).toBe(false);
  });
});

describe("CheckoutSection payment modal flow", () => {
  it("does not open the modal when checkout validation fails", () => {
    // Not logged in
    const { unmount } = render(<CheckoutSection isLoggedIn={false} />);
    fireEvent.click(screen.getByText(/172 Diamonds/));
    fireEvent.click(screen.getByRole("button", { name: /Comprar Ahora/i }));
    expect(screen.getByText("Debes iniciar sesión para realizar una compra.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Método de pago" })).not.toBeInTheDocument();
    unmount();

    // Missing User/Zone IDs
    render(<CheckoutSection isLoggedIn={true} />);
    fireEvent.click(screen.getByText(/172 Diamonds/));
    fireEvent.click(screen.getByRole("button", { name: /Comprar Ahora/i }));
    expect(screen.getByText("Por favor ingresa tu User ID y Zone ID.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Método de pago" })).not.toBeInTheDocument();
  });

  it("closes the modal via the X button, a backdrop click, and Escape", async () => {
    render(<CheckoutSection isLoggedIn={true} />);
    await act(async () => {});
    fireEvent.click(screen.getByText(/172 Diamonds/));
    fireEvent.change(userIdInput(), { target: { value: "12345678" } });
    fireEvent.change(zoneIdInput(), { target: { value: "10012" } });

    const openModal = () => {
      fireEvent.click(screen.getByRole("button", { name: /Comprar Ahora/i }));
      return screen.getByRole("dialog", { name: "Método de pago" });
    };
    const expectModalClosed = () =>
      expect(screen.queryByRole("dialog", { name: "Método de pago" })).not.toBeInTheDocument();

    // X button
    openModal();
    fireEvent.click(screen.getByRole("button", { name: /Cerrar/i }));
    expectModalClosed();

    // Backdrop click
    const dialog = openModal();
    fireEvent.click(dialog.parentElement!);
    expectModalClosed();

    // Escape
    openModal();
    fireEvent.keyDown(window, { key: "Escape" });
    expectModalClosed();
  });

  it("shows an error when confirming without a selected method", async () => {
    render(<CheckoutSection isLoggedIn={true} />);
    await act(async () => {});
    fireEvent.click(screen.getByText(/172 Diamonds/));
    fireEvent.change(userIdInput(), { target: { value: "12345678" } });
    fireEvent.change(zoneIdInput(), { target: { value: "10012" } });
    fireEvent.click(screen.getByRole("button", { name: /Comprar Ahora/i }));
    fireEvent.click(screen.getByRole("button", { name: /Confirmar pago/i }));

    expect(screen.getByText("Seleccioná un método de pago.")).toBeInTheDocument();
    expect(vi.mocked(processCheckout)).not.toHaveBeenCalled();
  });

  it("validates the payment detail before confirming", async () => {
    render(<CheckoutSection isLoggedIn={true} />);
    await act(async () => {});
    fireEvent.click(screen.getByText(/172 Diamonds/));
    fireEvent.change(userIdInput(), { target: { value: "12345678" } });
    fireEvent.change(zoneIdInput(), { target: { value: "10012" } });
    fireEvent.click(screen.getByRole("button", { name: /Comprar Ahora/i }));
    fireEvent.click(screen.getByRole("button", { name: /Mercado Pago/ }));
    fireEvent.change(screen.getByPlaceholderText("tucorreo@ejemplo.com"), {
      target: { value: "no-es-un-email" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Confirmar pago/i }));

    expect(screen.getByText("Ingresá un email válido.")).toBeInTheDocument();
    expect(vi.mocked(processCheckout)).not.toHaveBeenCalled();
  });

  it("confirms the payment inside the modal and submits the checkout", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const locationSetter = stubLocation();

    vi.mocked(processCheckout).mockResolvedValueOnce({
      success: true,
      message: "¡Pedido confirmado! Te enviamos el link de pago a tu email de Mercado Pago.",
      orderNumber: "MM-TEST1234",
      redirectUrl: "/dashboard",
      buyerName: "Test User",
    });

    render(<CheckoutSection isLoggedIn={true} />);
    // Let the mocked getCheckoutContext resolve so the payment methods render.
    await act(async () => {});
    fireEvent.click(screen.getByText(/172 Diamonds/));
    fireEvent.change(userIdInput(), { target: { value: "12345678" } });
    fireEvent.change(zoneIdInput(), { target: { value: "10012" } });
    fireEvent.click(screen.getByRole("button", { name: /Comprar Ahora/i }));

    expect(screen.getByRole("dialog", { name: "Método de pago" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Mercado Pago/ }));
    fireEvent.change(screen.getByPlaceholderText("tucorreo@ejemplo.com"), {
      target: { value: "compra@ejemplo.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Confirmar pago/i }));

    // Flush the async transition (mock resolves immediately, no timers needed).
    await act(async () => {});

    expect(vi.mocked(processCheckout)).toHaveBeenCalledTimes(1);
    const formData = vi.mocked(processCheckout).mock.calls[0][0];
    expect(formData.get("userId")).toBe("12345678");
    expect(formData.get("zoneId")).toBe("10012");
    expect(formData.get("productId")).toBe("2");
    expect(formData.get("paymentMethod")).toBe("mercadopago");
    expect(formData.get("paymentDetail")).toBe("compra@ejemplo.com");
    expect(formData.get("paymentRegion")).toBe("latam");
    expect(alertSpy).toHaveBeenCalledWith(
      "¡Pedido confirmado! Te enviamos el link de pago a tu email de Mercado Pago."
    );
    expect(locationSetter).toHaveBeenCalledWith("/dashboard");
    alertSpy.mockRestore();
  });

  it("submits the region chosen inside the modal", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    // PayPal (EU) opens the amount-prefilled PayPal.Me window instead of alerting.
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    stubLocation();

    vi.mocked(processCheckout).mockResolvedValueOnce({
      success: true,
      message: "¡Pedido confirmado! Te enviamos la solicitud a tu cuenta de PayPal.",
      orderNumber: "MM-TEST1234",
      redirectUrl: "/dashboard",
      buyerName: "Test User",
    });

    render(<CheckoutSection isLoggedIn={true} />);
    await act(async () => {});
    fireEvent.click(screen.getByText(/172 Diamonds/));
    fireEvent.change(userIdInput(), { target: { value: "12345678" } });
    fireEvent.change(zoneIdInput(), { target: { value: "10012" } });
    fireEvent.click(screen.getByRole("button", { name: /Comprar Ahora/i }));

    fireEvent.click(screen.getByRole("button", { name: /Europa \(€\)/i }));
    // Flush the microtask that resets the payment selection on region change.
    await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: /PayPal/ }));
    fireEvent.change(screen.getByPlaceholderText("tucorreo@ejemplo.com"), {
      target: { value: "compra@ejemplo.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Confirmar pago/i }));

    await act(async () => {});

    const formData = vi.mocked(processCheckout).mock.calls[0][0];
    expect(formData.get("paymentMethod")).toBe("paypal");
    expect(formData.get("paymentRegion")).toBe("eu");
    // The amount-prefilled PayPal.Me window (real product price, 2.99 for the
    // selected 172 Diamonds) replaces the success alert.
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenNthCalledWith(
      1,
      "https://www.paypal.me/mandyml09/2.99",
      "_blank"
    );
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
    openSpy.mockRestore();
  });

  it("opens the Bizum receipt wa.me link on a successful bizum checkout", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    // The component opens a blank popup while the click gesture is active and
    // then points it at the wa.me URL once the order is confirmed.
    const openSpy = vi.spyOn(window, "open").mockImplementation(
      () => ({ location: { href: "" } }) as unknown as Window
    );
    const locationSetter = stubLocation();

    vi.mocked(processCheckout).mockResolvedValueOnce({
      success: true,
      message: "¡Pedido confirmado! Aceptá la solicitud de pago en tu app bancaria.",
      orderNumber: "MM-TEST1234",
      redirectUrl: "/dashboard",
      buyerName: "Juan Pérez",
    });

    render(<CheckoutSection isLoggedIn={true} />);
    // Let the mocked getCheckoutContext resolve so the payment methods render.
    await act(async () => {});
    fireEvent.click(screen.getByText(/172 Diamonds/));
    fireEvent.change(userIdInput(), { target: { value: "12345678" } });
    fireEvent.change(zoneIdInput(), { target: { value: "10012" } });
    fireEvent.click(screen.getByRole("button", { name: /Comprar Ahora/i }));

    fireEvent.click(screen.getByRole("button", { name: /Europa \(€\)/i }));
    // Flush the microtask that resets the payment selection on region change.
    await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: /Bizum/ }));
    fireEvent.change(screen.getByPlaceholderText("34600000000"), {
      target: { value: "34600000000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Confirmar pago/i }));

    // Flush the async transition (mock resolves immediately, no timers needed).
    await act(async () => {});

    const formData = vi.mocked(processCheckout).mock.calls[0][0];
    expect(formData.get("paymentMethod")).toBe("bizum");
    expect(formData.get("paymentRegion")).toBe("eu");
    // Only the blank popup is opened via window.open; the wa.me URL is
    // assigned to that window's location instead of a second popup.
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenNthCalledWith(1, "", "_blank");
    const fakeWindow = openSpy.mock.results[0].value as { location: { href: string } };
    expect(fakeWindow.location.href.startsWith(`https://wa.me/${BIZUM_RECIPIENT_PHONE}?text=`)).toBe(true);
    const text = decodeURIComponent(fakeWindow.location.href.split("?text=")[1]);
    expect(text).toContain("MM-TEST1234");
    expect(text).toContain("172 Diamonds");
    expect(text).toContain(formatAmount(299, "EUR"));
    expect(text).toContain("34600000000");
    expect(text).toContain("Juan Pérez");
    expect(text).toContain("Método: Bizum");
    expect(text).toContain("\n");
    // No blocking alert on the Bizum path.
    expect(alertSpy).not.toHaveBeenCalled();
    expect(locationSetter).toHaveBeenCalledWith("/dashboard");
    alertSpy.mockRestore();
    openSpy.mockRestore();
  });

  it("sends the PayPal receipt notice to the store WhatsApp with the buyer email", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const locationSetter = stubLocation();

    render(<CheckoutSection isLoggedIn={true} />);
    await act(async () => {});
    fireEvent.click(screen.getByText(/172 Diamonds/));
    fireEvent.change(userIdInput(), { target: { value: "12345678" } });
    fireEvent.change(zoneIdInput(), { target: { value: "10012" } });
    fireEvent.click(screen.getByRole("button", { name: /Comprar Ahora/i }));

    fireEvent.click(screen.getByRole("button", { name: /Europa \(€\)/i }));
    await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: /PayPal/ }));
    fireEvent.change(screen.getByPlaceholderText("tucorreo@ejemplo.com"), {
      target: { value: "compra@ejemplo.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Ya pagué, enviar comprobante por WhatsApp/i }));

    await act(async () => {});

    // No order is created by the notice button — only the wa.me message opens.
    expect(processCheckout).not.toHaveBeenCalled();
    expect(openSpy).toHaveBeenCalledTimes(1);
    const url = openSpy.mock.calls[0][0] as string;
    expect(url.startsWith(`https://wa.me/${BIZUM_RECIPIENT_PHONE}?text=`)).toBe(true);
    const text = decodeURIComponent(url.split("?text=")[1]);
    expect(text).toContain("172 Diamonds");
    expect(text).toContain(formatAmount(299, "EUR"));
    expect(text).toContain("Correo: compra@ejemplo.com");
    expect(text).toContain("Método: PayPal");
    expect(text).not.toContain("Pedido:");
    expect(alertSpy).not.toHaveBeenCalled();
    expect(locationSetter).not.toHaveBeenCalled();
    alertSpy.mockRestore();
    openSpy.mockRestore();
  });

  it("opens the amount-prefilled PayPal.Me link on a successful paypal EU checkout", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const locationSetter = stubLocation();

    vi.mocked(processCheckout).mockResolvedValueOnce({
      success: true,
      message: "¡Pedido confirmado! Te enviamos la solicitud a tu cuenta de PayPal.",
      orderNumber: "MM-TEST1234",
      redirectUrl: "/dashboard",
      buyerName: "Test User",
    });

    render(<CheckoutSection isLoggedIn={true} />);
    // Let the mocked getCheckoutContext resolve so the payment methods render.
    await act(async () => {});
    // 257 Diamonds maps to 4.49 in the mocked context products.
    fireEvent.click(screen.getByText(/257 Diamonds/));
    fireEvent.change(userIdInput(), { target: { value: "12345678" } });
    fireEvent.change(zoneIdInput(), { target: { value: "10012" } });
    fireEvent.click(screen.getByRole("button", { name: /Comprar Ahora/i }));

    fireEvent.click(screen.getByRole("button", { name: /Europa \(€\)/i }));
    // Flush the microtask that resets the payment selection on region change.
    await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: /PayPal/ }));
    fireEvent.change(screen.getByPlaceholderText("tucorreo@ejemplo.com"), {
      target: { value: "compra@ejemplo.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Confirmar pago/i }));

    // Flush the async transition (mock resolves immediately, no timers needed).
    await act(async () => {});

    const formData = vi.mocked(processCheckout).mock.calls[0][0];
    expect(formData.get("paymentMethod")).toBe("paypal");
    expect(formData.get("paymentRegion")).toBe("eu");
    expect(formData.get("productId")).toBe("3");
    // The final PayPal.Me link opens during the click gesture with the REAL
    // price of the purchased object pre-filled (4.49 = 257 Diamonds in the
    // mocked context, not a hardcoded amount); no blank window is used.
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenNthCalledWith(
      1,
      "https://www.paypal.me/mandyml09/4.49",
      "_blank"
    );
    // No blocking alert on the PayPal (EU) path.
    expect(alertSpy).not.toHaveBeenCalled();
    expect(locationSetter).toHaveBeenCalledWith("/dashboard");
    alertSpy.mockRestore();
    openSpy.mockRestore();
  });
});
