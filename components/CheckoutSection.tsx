"use client";

import React, { useState, useTransition, useEffect } from 'react';
import Image from 'next/image';
import {
  ShieldCheck,
  ChevronRight,
  Loader2,
  Check,
  Zap,
  Star,
  Globe,
  BadgeCheck,
  Headset,
  Gem,
  UserRound,
  HelpCircle,
  Crown,
  Lock,
} from 'lucide-react';
import { getCheckoutContext, processCheckout } from '@/lib/actions/checkout';
import { PRODUCTS } from '@/lib/catalog';
import { PAYMENT_REGIONS, validatePaymentDetail, buildComprobanteUrl, buildPaypalMeUrl, PAYPAL_ME_URL } from '@/lib/payments';
import type { PaymentRegion } from '@/lib/payments';
import { PaymentModal } from './PaymentModal';

// Paleta premium del tema gaming oscuro.
const CARD_BG = "#110c2c";
const CARD_BORDER = "rgba(147, 51, 234, 0.25)";

export function CheckoutSection({ isLoggedIn }: { isLoggedIn?: boolean }) {
  // Effective login state: the explicit prop when provided, otherwise resolved
  // once from /api/auth/session on the client (default false).
  const [loggedIn, setLoggedIn] = useState(isLoggedIn ?? false);
  const [userId, setUserId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Region-aware payment context: fetched once on mount from the server action.
  // On failure the rest of the flow stays usable; only the payment step degrades.
  const [context, setContext] = useState<Awaited<ReturnType<typeof getCheckoutContext>> | null>(null);
  const [regionOverride, setRegionOverride] = useState<"auto" | "eu" | "latam">("auto");
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [paymentDetail, setPaymentDetail] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  type NicknameStatus =
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "success"; nickname: string; country: string }
    | { kind: "warning" };
  const [nicknameStatus, setNicknameStatus] = useState<NicknameStatus>({ kind: "idle" });

  useEffect(() => {
    // When the parent does not pass `isLoggedIn`, resolve the session once on
    // the client. Explicit props (e.g. isLoggedIn={false} in tests) skip the fetch.
    if (isLoggedIn === undefined) {
      const controller = new AbortController();
      (async () => {
        try {
          const res = await fetch("/api/auth/session", { signal: controller.signal });
          const data = (await res.json()) as { user?: unknown } | null;
          if (data?.user) {
            setLoggedIn(true);
          }
        } catch {
          // Stay logged-out on failure.
        }
      })();
      return () => controller.abort();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    // Load the server-derived region/pricing context once. Server actions do
    // not need an AbortController; a failure just leaves the payment step
    // in its fallback state.
    getCheckoutContext().then(setContext).catch(() => { });
  }, []);

  // Changing the effective region resets the payment selection.
  const effectiveRegion: PaymentRegion = regionOverride === "auto" ? (context?.region ?? "latam") : regionOverride;
  const effectiveCfg = PAYMENT_REGIONS[effectiveRegion];

  useEffect(() => {
    // Reset the payment selection whenever the effective region changes.
    // Defer setState out of the effect body to avoid cascading-render lint
    // warning (same pattern as the nickname status reset above).
    queueMicrotask(() => {
      setSelectedMethod(null);
      setPaymentDetail("");
      setPaymentError(null);
    });
  }, [effectiveRegion]);

  useEffect(() => {
    const valid = /^\d{5,10}$/.test(userId) && /^\d{3,5}$/.test(zoneId);
    if (!valid) {
      // Defer setState out of the effect body to avoid cascading-render lint warning
      // (we are intentionally resetting the displayed status when inputs become invalid).
      queueMicrotask(() => setNicknameStatus({ kind: "idle" }));
      return;
    }
    queueMicrotask(() => setNicknameStatus({ kind: "loading" }));
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/mlbb/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, zoneId }),
          signal: controller.signal,
        });
        const data = (await res.json()) as {
          success: boolean;
          data?: { nickname: string; country: string };
        };
        if (res.ok && data.success && data.data?.nickname) {
          setNicknameStatus({
            kind: "success",
            nickname: data.data.nickname,
            country: data.data.country,
          });
        } else {
          setNicknameStatus({ kind: "warning" });
        }
      } catch {
        if (!controller.signal.aborted) {
          setNicknameStatus({ kind: "warning" });
        }
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [userId, zoneId]);

  const handleCheckout = () => {
    setCheckoutError(null);
    setPaymentError(null);
    if (!loggedIn) {
      setCheckoutError('Debes iniciar sesión para realizar una compra.');
      return;
    }
    if (!userId || !zoneId) {
      setCheckoutError('Por favor ingresa tu User ID y Zone ID.');
      return;
    }
    if (!selectedProduct) {
      setCheckoutError('Por favor selecciona un paquete.');
      return;
    }
    // Payment selection happens inside the modal; open it once the account
    // data and product are valid.
    setIsModalOpen(true);
  };

  // Runs inside the payment modal once the buyer confirms the method. The
  // login/IDs/product checks already passed in handleCheckout.
  const handleConfirmPayment = () => {
    setPaymentError(null);
    if (!selectedMethod) {
      setPaymentError('Seleccioná un método de pago.');
      return;
    }
    const methodDef = effectiveCfg.methods.find((m) => m.id === selectedMethod);
    if (methodDef?.needsField) {
      const err = validatePaymentDetail(selectedMethod, paymentDetail);
      if (err) {
        setPaymentError(err);
        return;
      }
    }
    if (!selectedProduct) {
      setCheckoutError('Por favor selecciona un paquete.');
      setIsModalOpen(false);
      return;
    }

    // PayPal (EU) is a manual transfer via PayPal.Me: the payment page opens with
    // the REAL price of the purchased object pre-filled (never a hardcoded amount)
    // and is the feedback itself, so no success alert is shown on that path.
    const isPaypalEu = selectedMethod === "paypal" && effectiveRegion === "eu";

    startTransition(async () => {
      // PayPal.Me must be opened while the click gesture is still active
      // (browsers block popups opened after an await). The amount-prefilled
      // link uses the actual product price — no blank window needed. A zero
      // total (no product) falls back to the bare PayPal.Me URL.
      if (isPaypalEu) {
        window.open(summaryPrice > 0 ? buildPaypalMeUrl(summaryPrice) : PAYPAL_ME_URL, "_blank");
      }
      // Browsers block popups opened after an await, so the Bizum receipt
      // window must be opened while the click gesture is still active. It is
      // pointed at the wa.me URL once the order is confirmed (or left blank
      // if the checkout fails or the popup is blocked).
      const bizumWindow = selectedMethod === "bizum" ? window.open("", "_blank") : null;

      const formData = new FormData();
      formData.append("userId", userId);
      formData.append("zoneId", zoneId);
      formData.append("productId", selectedProduct);
      formData.append("paymentMethod", selectedMethod);
      formData.append("paymentDetail", paymentDetail.trim());
      formData.append("paymentRegion", effectiveRegion);

      const res = await processCheckout(formData);

      if (!res.success) {
        setCheckoutError(res.error);
        setIsModalOpen(false);
      } else {
        if (selectedMethod === "bizum") {
          // Bizum buyers must send the receipt (payment screenshot) to the
          // store's WhatsApp before the order can be marked paid.
          const url = buildComprobanteUrl({
            orderNumber: res.orderNumber ?? "",
            productName: selectedProductData?.name ?? "",
            amountCents: Math.round(summaryPrice * 100),
            currency: effectiveCfg.currency,
            mlbbUserId: userId,
            zoneId,
            buyerPhone: paymentDetail.trim(),
            buyerName: res.buyerName ?? "",
            methodLabel: "Bizum",
          });
          if (bizumWindow) {
            bizumWindow.location.href = url;
          } else {
            // The popup was blocked: fall back to a direct open (may still be
            // blocked by the browser, but it is the best effort available).
            window.open(url, "_blank");
          }
        } else if (!isPaypalEu) {
          // PayPal (EU) skips the alert: the PayPal.Me window opened before
          // the request is the payment feedback.
          alert(res.message);
        }
        window.location.href = "/dashboard";
      }
    });
  };

  const selectedProductData = PRODUCTS.find(p => p.id === selectedProduct);

  // Manual PayPal (EU) notice: the buyer already paid through PayPal.Me and
  // wants to alert the store's WhatsApp with the receipt details (method,
  // amount and the PayPal email used). No order is created here — the notice
  // is just the wa.me message with the data entered in the modal.
  function handleNotifyPaypalReceipt() {
    if (!selectedProduct || !selectedProductData) {
      setPaymentError("Seleccioná un paquete primero.");
      return;
    }
    if (!paymentDetail.trim()) {
      setPaymentError("Ingresá el email de tu cuenta de PayPal.");
      return;
    }
    const url = buildComprobanteUrl({
      orderNumber: "",
      productName: selectedProductData.name,
      amountCents: Math.round(summaryPrice * 100),
      currency: effectiveCfg.currency,
      mlbbUserId: userId,
      zoneId,
      buyerPhone: paymentDetail.trim(),
      buyerName: "",
      methodLabel: "PayPal",
      contactLabel: "Correo",
    });
    window.open(url, "_blank");
  }

  // Region-aware price: the server context is authoritative when loaded;
  // otherwise fall back to the catalog price (latam/USD is the default).
  const shownPriceFor = (productId: string, fallback: number): number =>
    context ? (context.products.find((x) => x.id === productId)?.price ?? fallback) : fallback;
  const summaryPrice = selectedProductData ? shownPriceFor(selectedProductData.id, selectedProductData.price) : 0;

  const inputClassName =
    "w-full bg-[#0a061e] border border-[rgba(147,51,234,0.35)] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7] transition-all";

  // Botón secundario rápido de PayPal: abre el enlace PayPal.Me con el monto
  // real del paquete seleccionado pre-cargado (mismo flujo manual que EU).
  const handleQuickPaypal = () => {
    window.open(summaryPrice > 0 ? buildPaypalMeUrl(summaryPrice) : PAYPAL_ME_URL, "_blank");
  };

  return (
    <>
      {/* ================= HERO 2 COLUMNAS ================= */}
      <section
        className="relative w-full bg-[#070417] overflow-hidden py-6 lg:py-10 border-b border-purple-950/40"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at top, rgba(126, 34, 206, 0.2), transparent 55%), linear-gradient(#070417, #070417)",
        }}
      >
        {/* Resplandor violeta directo detrás del personaje */}
        <div className="absolute top-1/2 right-[30%] -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/30 blur-[130px] rounded-full pointer-events-none z-0" />
        {/* Personaje en el centro-derecha, detrás del espacio entre texto y tarjeta */}
        <Image
          src="/images/personaje.png"
          alt=""
          width={900}
          height={1400}
          priority
          className="absolute top-0 right-[15%] lg:right-[22%] h-full w-auto max-w-none object-contain pointer-events-none z-0 opacity-90"
        />
        {/* Fundido lateral izquierdo para máxima legibilidad del texto */}
        <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-[#070417] via-[#070417]/80 to-transparent pointer-events-none z-0" />
        {/* Fundido inferior suave hacia la sección de diamantes */}
        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-[#070417] to-transparent pointer-events-none z-0" />

        {/* Contenido centrado */}
        <div className="max-w-7xl mx-auto px-4 lg:px-8 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[460px]">
          {/* Columna izquierda: texto + rating + pills + badges */}
          <div className="lg:col-span-7 flex flex-col gap-4 z-10">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div className="w-28 h-28 md:w-36 md:h-36 shrink-0 relative flex items-center justify-center">
                <Image
                  src="/mlbb-logo.png"
                  alt="Mobile Legends: Bang Bang"
                  width={160}
                  height={160}
                  sizes="(max-width: 768px) 112px, 144px"
                  className="w-full h-auto drop-shadow-[0_0_25px_rgba(168,85,247,0.45)]"
                  priority
                  fetchPriority="high"
                />
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-3xl md:text-4xl font-black leading-tight tracking-tight mb-3">
                  Top Up{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#a855f7] via-[#d946ef] to-[#38bdf8]">
                    Mobile Legends
                  </span>{" "}
                  Diamonds Global
                </h1>
                {/* Calificación */}
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-4">
                  <div className="flex items-center gap-0.5">
                    {[0, 1, 2, 3, 4].map((star) => (
                      <Star key={star} className="w-4 h-4 text-amber-400" fill="currentColor" />
                    ))}
                  </div>
                  <span className="text-sm font-bold text-white">4.68 / 5</span>
                </div>
                {/* Pills de características */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#a855f7]/15 border border-[#a855f7]/40 text-[#d9b8fe] text-xs font-bold">
                    <Globe className="w-3 h-3" /> Global
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#38bdf8]/15 border border-[#38bdf8]/40 text-[#7dd3fc] text-xs font-bold">
                    <Zap className="w-3 h-3" /> Instant delivery
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d946ef]/15 border border-[#d946ef]/40 text-[#f0abfc] text-xs font-bold">
                    <BadgeCheck className="w-3 h-3" /> Official Top-up
                  </span>
                </div>
              </div>
            </div>

            {/* Barra de confianza: una sola barra alargada con icono a la izquierda y textos a la derecha */}
            <div className="mt-8 bg-[#110c2c]/70 border border-purple-500/20 backdrop-blur-md rounded-2xl p-3.5 flex items-center justify-between divide-x divide-purple-500/20">
              {[
                { icon: ShieldCheck, tint: "text-emerald-400", title: "100% Safe", sub: "Secure top-up" },
                { icon: Zap, tint: "text-[#38bdf8]", title: "Instant delivery", sub: "1-5 min" },
                { icon: Crown, tint: "text-amber-400", title: "Official Partner", sub: "Moonton" },
                { icon: Headset, tint: "text-[#a855f7]", title: "24/7 Support", sub: "We're here!" },
              ].map((badge) => (
                <div key={badge.title} className="flex items-center gap-3 px-3 first:pl-1 last:pr-1">
                  <badge.icon
                    className={`w-6 h-6 shrink-0 ${badge.tint}`}
                    style={{ filter: "drop-shadow(0 0 6px rgba(168,85,247,0.45))" }}
                  />
                  <div className="leading-tight">
                    <div className="text-xs font-bold uppercase tracking-wider text-white whitespace-nowrap">
                      {badge.title}
                    </div>
                    <div className="text-[11px] text-slate-400 whitespace-nowrap">{badge.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Columna derecha: tarjeta flotante SELECT YOUR ACCOUNT */}
          <div className="lg:col-span-5 flex justify-end z-10 relative">
            <div className="w-full max-w-md bg-[#0c0721]/90 border border-purple-500/30 backdrop-blur-md rounded-2xl p-6 shadow-[0_0_25px_rgba(147,51,234,0.15)] relative">
              {/* Botón flotante de favoritos */}
              <div className="absolute -top-3 right-4 bg-[#140c34] border border-purple-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1 text-xs text-purple-300">
                🤍 10114
              </div>
              {/* Línea de brillo superior */}
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#a855f7] via-[#d946ef] to-[#38bdf8]" />

              <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-white mb-5">
                <UserRound className="w-4 h-4 text-[#d946ef]" />
                Select Your Account
              </h3>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="mlbb-zone-id" className="text-xs font-bold uppercase tracking-wide text-gray-400 flex items-center gap-1">
                    Zone ID <span className="text-[#d946ef]">*</span>
                    <span title="Lo encontrás junto a tu User ID en el perfil del juego" className="cursor-help">
                      <HelpCircle className="w-3.5 h-3.5 text-gray-500 hover:text-[#a855f7] transition-colors" />
                    </span>
                  </label>
                  <input
                    id="mlbb-zone-id"
                    type="text"
                    value={zoneId}
                    onChange={(e) => setZoneId(e.target.value)}
                    placeholder="Enter your Zone ID"
                    className={inputClassName}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="mlbb-user-id" className="text-xs font-bold uppercase tracking-wide text-gray-400 block">
                    User ID <span className="text-[#d946ef]">*</span>
                  </label>
                  <input
                    id="mlbb-user-id"
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="Enter your User ID"
                    className={inputClassName}
                  />
                </div>
                {/* Remember me */}
                <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#a855f7] cursor-pointer"
                  />
                  <span className="text-xs font-medium text-gray-400">Remember me</span>
                </label>
              </div>

              <div aria-live="polite" className="mt-3 min-h-[20px]">
                {nicknameStatus.kind === "loading" && (
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" aria-label="Verificando jugador" />
                    <span>Verificando jugador...</span>
                  </div>
                )}
                {nicknameStatus.kind === "success" && (
                  <div className="flex items-center gap-2 text-emerald-400 text-sm">
                    <Check className="w-4 h-4" />
                    <span className="font-medium">{nicknameStatus.nickname}</span>
                    <span className="text-gray-500">({nicknameStatus.country})</span>
                  </div>
                )}
                {nicknameStatus.kind === "warning" && (
                  <p role="status" className="text-gray-500 text-xs">
                    No pudimos verificar el nickname, pero podés continuar
                  </p>
                )}
              </div>

              {/* Precio y resumen */}
              <div className="mt-4 pt-4 border-t border-[rgba(147,51,234,0.25)]">
                {/* Precio grande + badge cashback (solo con paquete seleccionado) */}
                {selectedProductData && (
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-3xl font-black text-white tracking-tight">
                      {effectiveCfg.symbol}{summaryPrice.toFixed(2)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 rounded-full px-2.5 py-1 text-[10px] font-bold whitespace-nowrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      10% Cashback
                    </span>
                  </div>
                )}

                {/* Caja oscura con el paquete seleccionado */}
                {selectedProductData ? (
                  <div className="flex items-center gap-3 bg-[#0d0824] p-3 rounded-xl border border-purple-500/30">
                    <Gem
                      className="w-6 h-6 text-[#38bdf8] shrink-0"
                      style={{ filter: "drop-shadow(0 0 6px rgba(56, 189, 248, 0.5))" }}
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate text-white">
                        {selectedProductData.name}
                        {selectedProductData.bonus ? ` + ${selectedProductData.bonus}` : ""}
                      </div>
                      <div className="text-xs text-gray-500">Mobile Legends · Global</div>
                    </div>
                  </div>
                ) : (
                  <div className="h-14 flex items-center justify-center border-2 border-dashed border-[rgba(147,51,234,0.3)] rounded-xl">
                    <span className="text-gray-500 font-medium text-xs text-center px-4">
                      Elegí un paquete abajo
                    </span>
                  </div>
                )}

                {checkoutError && (
                  <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400 text-sm text-center font-medium">
                    {checkoutError}
                  </div>
                )}

                {/* Botón secundario rápido de PayPal */}
                <button
                  onClick={handleQuickPaypal}
                  className="mt-3 w-full flex items-center justify-center gap-2 bg-[#0a061e] border border-[rgba(147,51,234,0.35)] hover:border-[#38bdf8]/60 text-white font-bold text-sm py-3 rounded-xl transition-all duration-200"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#38bdf8]" fill="currentColor" aria-hidden="true">
                    <path d="M7.5 21l1.2-7.5H12c2.5 0 4.2-1.3 4.6-3.6.4-2.4-1-3.9-3.6-3.9H8.2L6 21h1.5zm2-13.5h3.2c1.6 0 2.5.8 2.2 2.4-.3 1.7-1.5 2.6-3.3 2.6h-2.9l.8-5z" />
                  </svg>
                  Pagar con PayPal
                </button>

                {/* Botón principal Buy now */}
                <button
                  onClick={handleCheckout}
                  disabled={isPending}
                  className="mt-2 w-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-400 text-slate-950 font-extrabold text-base py-3.5 rounded-xl shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-[0.99] transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
                >
                  {isPending ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-black" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Procesando...
                    </span>
                  ) : (
                    <>Buy now <ChevronRight className="w-5 h-5" /></>
                  )}
                </button>

                {/* Seguridad al pie */}
                <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-gray-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Protected purchase</span>
                  <span title="Pago protegido mediante pasarelas verificadas y socios oficiales" className="cursor-help">
                    <HelpCircle className="w-3 h-3 text-gray-600 hover:text-[#a855f7] transition-colors" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= CHOOSE YOUR DIAMONDS ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-14">
        <div className="flex items-center gap-3 mb-6">
          <Gem
            className="w-6 h-6 text-[#d946ef]"
            style={{ filter: "drop-shadow(0 0 8px rgba(217, 70, 239, 0.7))" }}
          />
          <h2 className="text-2xl font-black uppercase tracking-wide text-white">
            Choose Your Diamonds
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PRODUCTS.map((prod) => {
            const isSelected = selectedProduct === prod.id;
            const shownPrice = shownPriceFor(prod.id, prod.price);
            return (
              <button
                key={prod.id}
                onClick={() => setSelectedProduct(prod.id)}
                className={`relative flex flex-col justify-between items-center p-5 h-full rounded-2xl border transition-all duration-200 text-center ${isSelected
                  ? "border-[#d946ef] shadow-[0_0_20px_rgba(217,70,239,0.35)]"
                  : "border-purple-900/40 bg-[#110c2c] hover:border-[#a855f7]/60 hover:bg-[#150e33]"
                  }`}
              >
                {/* Checkmark circular morado en la esquina superior derecha al seleccionar */}
                {isSelected && (
                  <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center shadow-[0_0_10px_rgba(217,70,239,0.6)]">
                    <Check className="w-4 h-4 text-white" strokeWidth={3} />
                  </span>
                )}

                {/* Cabecera: icono diamante + cantidad + bonus dorado */}
                <Gem
                  className="w-5 h-5 text-[#38bdf8] mb-2"
                  style={{ filter: "drop-shadow(0 0 6px rgba(56, 189, 248, 0.6))" }}
                />
                <span className="font-black text-base text-white leading-tight">{prod.name}</span>
                {prod.bonus && (
                  <span className="text-xs font-bold text-amber-400 mt-0.5">+ {prod.bonus}</span>
                )}

                {/* Centro: imagen con altura fija centrada y resplandor azul de fondo */}
                <div
                  className="my-4 w-full h-28 rounded-xl bg-[#0a061e] flex items-center justify-center"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at center, rgba(56, 189, 248, 0.22) 0%, transparent 70%)",
                  }}
                >
                  <Image
                    src={prod.image}
                    alt={`Recarga de ${prod.name}`}
                    width={80}
                    height={80}
                    className="w-20 h-20 object-contain drop-shadow-[0_0_15px_rgba(56,189,248,0.4)]"
                  />
                </div>

                {/* Pie de tarjeta: precio grande a la izquierda + cashback a la derecha */}
                <div className="w-full flex justify-between items-center pt-3 mt-auto border-t border-purple-900/40">
                  <span className="text-lg font-bold text-white whitespace-nowrap">
                    {effectiveCfg.symbol}{shownPrice.toFixed(2)}
                  </span>
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 rounded-md px-2.5 py-1 whitespace-nowrap">
                    10% Cashback
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ================= BANNER DE BENEFICIOS ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-14">
        <div className="bg-[#0f0927] border border-purple-500/40 rounded-2xl p-6 lg:p-8 flex flex-col lg:flex-row items-center justify-between gap-8 shadow-[0_0_20px_rgba(168,85,247,0.15)] relative overflow-hidden">
          {/* Título a la izquierda */}
          <h3 className="text-xl lg:text-2xl font-black text-white max-w-[240px] uppercase leading-tight tracking-wide">
            ¿Por qué recargar con <span className="text-purple-400">Mythic Market?</span>
          </h3>

          {/* 4 columnas a la derecha con separadores verticales */}
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-purple-500/25 flex-1 w-full">
            {[
              {
                icon: BadgeCheck,
                title: "Oficial y seguro",
                desc: "Recargas 100% autorizadas",
              },
              {
                icon: Gem,
                title: "Mejores precios",
                desc: "Precios competitivos con cashback",
              },
              {
                icon: Zap,
                title: "Entrega instantánea",
                desc: "Diamantes en minutos",
              },
              {
                icon: Headset,
                title: "Soporte 24/7",
                desc: "Atención personalizada",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="px-4 py-2 flex flex-col items-center lg:items-start text-center lg:text-left"
              >
                <feature.icon className="text-purple-400 mb-2 h-6 w-6 drop-shadow-[0_0_8px_rgba(217,70,239,0.5)]" />
                <div className="text-xs font-bold text-purple-200 uppercase tracking-wider">
                  {feature.title}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FOOTER DE MÉTODOS DE PAGO SEGUROS ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-4 pb-4">
        <div className="mt-4 bg-[#0c0721] border border-purple-500/30 rounded-2xl p-5 flex flex-col lg:flex-row items-stretch justify-between gap-6 shadow-[0_0_15px_rgba(147,51,234,0.1)]">
          {/* Lado izquierdo: pasarelas de pago (65-70%) */}
          <div className="flex flex-col gap-3 flex-1">
            <span className="text-xs font-black text-purple-400 tracking-widest uppercase">
              Métodos de pago seguros
            </span>
            <div className="flex flex-wrap items-center gap-2.5">
              {[
                { label: "Mercado Pago", logo: "/logos/mercadopago.svg" },
                { label: "PayPal", logo: "/logos/paypal.svg" },
                { label: "Pix", logo: "/logos/pix.svg" },
                { label: "Binance (USDT)", logo: "/logos/binance.svg" },
              ].map((method) => (
                <span
                  key={method.label}
                  className="bg-[#150e38] border border-purple-500/20 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 flex items-center gap-1.5 shadow-sm hover:border-purple-400/40 transition-colors"
                  title={method.label}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={method.logo} alt={method.label} className="h-4 w-auto object-contain" />
                  <span className="whitespace-nowrap">{method.label}</span>
                </span>
              ))}
              {/* Badges de texto para medios sin logo propio */}
              <span className="bg-[#150e38] border border-purple-500/20 px-3 py-1.5 rounded-lg text-xs text-slate-200 shadow-sm hover:border-purple-400/40 transition-colors italic font-black tracking-wide">
                VISA
              </span>
              <span className="bg-[#150e38] border border-purple-500/20 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 shadow-sm hover:border-purple-400/40 transition-colors tracking-wide">
                Mastercard
              </span>
              <span className="bg-[#150e38] border border-purple-500/20 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 shadow-sm hover:border-purple-400/40 transition-colors tracking-wide">
                ₿ Crypto
              </span>
            </div>
          </div>

          {/* Línea divisoria vertical */}
          <div className="hidden lg:block w-px bg-purple-500/25 my-1 mx-4" />

          {/* Lado derecho: compra protegida (30-35%) */}
          <div className="flex flex-col gap-3 justify-center shrink-0">
            <span className="text-xs font-black text-purple-400 tracking-widest uppercase">
              Compra protegida
            </span>
            <div className="flex items-center gap-6">
              {/* Sello 1: SSL */}
              <div className="flex items-center gap-2.5">
                <div className="bg-[#18113c] border border-amber-500/40 p-2 rounded-lg text-amber-400 text-sm shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="text-[11px] leading-tight font-bold text-slate-200">
                  Conexión SSL
                  <br />
                  <span className="text-slate-400 font-normal text-[10px]">Segura</span>
                </div>
              </div>
              {/* Sello 2: Encriptación */}
              <div className="flex items-center gap-2.5">
                <div className="bg-[#18113c] border border-amber-500/40 p-2 rounded-lg text-amber-400 text-sm shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="text-[11px] leading-tight font-bold text-slate-200">
                  Encriptación
                  <br />
                  <span className="text-slate-400 font-normal text-[10px]">de Datos</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {isModalOpen && (
        <PaymentModal
          cfg={effectiveCfg}
          regionOverride={regionOverride}
          onRegionChange={setRegionOverride}
          selectedMethod={selectedMethod}
          onSelectMethod={(id) => {
            setSelectedMethod(id);
            setPaymentError(null);
          }}
          paymentDetail={paymentDetail}
          onPaymentDetailChange={setPaymentDetail}
          paymentError={paymentError}
          isPending={isPending}
          onConfirm={handleConfirmPayment}
          onNotifyReceipt={handleNotifyPaypalReceipt}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
