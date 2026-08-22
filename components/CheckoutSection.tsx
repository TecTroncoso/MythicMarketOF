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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        {/* Columna izquierda: identidad del juego */}
        <div className="lg:col-span-3">
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

          {/* Barra de 4 badges de confianza */}
          <div
            className="mt-8 grid grid-cols-2 md:grid-cols-4 rounded-2xl overflow-hidden border"
            style={{ borderColor: CARD_BORDER, backgroundColor: CARD_BG }}
          >
            {[
              { icon: ShieldCheck, title: "100% Safe", tint: "text-emerald-400" },
              { icon: Zap, title: "Instant delivery 1-5 min", tint: "text-[#38bdf8]" },
              { icon: BadgeCheck, title: "Official Partner", tint: "text-[#d946ef]" },
              { icon: Headset, title: "24/7 Support", tint: "text-[#a855f7]" },
            ].map((badge, index) => (
              <div
                key={badge.title}
                className={`flex flex-col items-center gap-2 px-3 py-4 text-center ${index > 0 ? "border-l border-[rgba(147,51,234,0.25)]" : ""
                  }`}
              >
                <badge.icon className={`w-6 h-6 ${badge.tint}`} style={{ filter: "drop-shadow(0 0 6px rgba(168,85,247,0.45))" }} />
                <span className="text-[11px] font-bold uppercase tracking-wide text-gray-200">{badge.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Columna derecha: tarjeta flotante SELECT YOUR ACCOUNT */}
        <div className="lg:col-span-2 lg:sticky lg:top-24">
          <div
            className="rounded-2xl p-6 relative overflow-hidden shadow-[0_0_40px_rgba(168,85,247,0.18)]"
            style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
          >
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
              {/* Precio grande + badge cashback */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl font-black text-white tracking-tight">
                  {effectiveCfg.symbol}{summaryPrice.toFixed(2)}
                </span>
                <span className="inline-flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 rounded-full px-2.5 py-1 text-[10px] font-bold whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  10% Cashback
                </span>
              </div>

              {/* Caja oscura con el paquete seleccionado */}
              {selectedProductData ? (
                <div className="flex items-center gap-3 bg-[#0a061e] p-3 rounded-xl border border-[rgba(147,51,234,0.25)]">
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
                className="mt-2 w-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-base py-3.5 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.35)] hover:shadow-[0_0_30px_rgba(245,158,11,0.55)] transition-all transform hover:scale-[1.02] active:scale-[0.98] flex justify-center items-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
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
                className={`relative flex flex-col items-center p-5 rounded-2xl border transition-all duration-200 text-center ${isSelected
                  ? "border-fuchsia-500 shadow-[0_0_20px_rgba(217,70,239,0.35)]"
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

                {/* Centro: imagen con altura fija, fondo oscuro y resplandor azul radial detrás */}
                <div
                  className="my-4 w-full h-24 rounded-xl bg-[#0a061e] flex items-center justify-center"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at center, rgba(56, 189, 248, 0.22) 0%, transparent 70%)",
                  }}
                >
                  <Image
                    src={prod.image}
                    alt={`Recarga de ${prod.name}`}
                    width={72}
                    height={72}
                    className="w-16 h-16 object-contain drop-shadow-[0_0_14px_rgba(56,189,248,0.5)]"
                  />
                </div>

                {/* Pie: precio a la izquierda + badge cashback a la derecha */}
                <div className="w-full flex items-center justify-between mt-auto pt-3 border-t border-purple-900/40">
                  <span className="text-base font-bold text-white whitespace-nowrap">
                    {effectiveCfg.symbol}{shownPrice.toFixed(2)}
                  </span>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 rounded-md px-2 py-1 whitespace-nowrap">
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
        <div
          className="rounded-2xl p-6 md:p-8"
          style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
        >
          <h3 className="text-xl md:text-2xl font-black text-white mb-6 text-center">
            ¿Por qué recargar con{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#a855f7] to-[#38bdf8]">
              nosotros?
            </span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Zap,
                tint: "text-[#38bdf8]",
                ring: "bg-[#38bdf8]/10 border-[#38bdf8]/40",
                title: "Entrega instantánea",
                desc: "Tus diamantes llegan en 1-5 minutos después de confirmar el pago.",
              },
              {
                icon: ShieldCheck,
                tint: "text-emerald-400",
                ring: "bg-emerald-400/10 border-emerald-400/40",
                title: "100% Seguro",
                desc: "Solo necesitamos tu User ID y Zone ID. Nunca te pediremos tu contraseña.",
              },
              {
                icon: BadgeCheck,
                tint: "text-[#d946ef]",
                ring: "bg-[#d946ef]/10 border-[#d946ef]/40",
                title: "Top-up oficial",
                desc: "Diamantes globales entregados directamente a través de socios verificados.",
              },
              {
                icon: Headset,
                tint: "text-[#a855f7]",
                ring: "bg-[#a855f7]/10 border-[#a855f7]/40",
                title: "Soporte 24/7",
                desc: "Nuestro equipo está disponible a cualquier hora por WhatsApp.",
              },
            ].map((feature) => (
              <div key={feature.title} className="flex flex-col items-center text-center gap-3">
                <div className={`w-12 h-12 rounded-full border flex items-center justify-center ${feature.ring}`}>
                  <feature.icon className={`w-6 h-6 ${feature.tint}`} />
                </div>
                <div>
                  <div className="font-bold text-white text-sm mb-1">{feature.title}</div>
                  <p className="text-xs text-gray-400 leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= BARRA DE MÉTODOS DE PAGO ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 pb-4">
        <div
          className="rounded-2xl px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
        >
          <div className="text-center sm:text-left">
            <div className="text-xs font-black uppercase tracking-widest text-white">
              Métodos aceptados
            </div>
            <div className="text-[11px] text-gray-500">
              {effectiveRegion === "eu" ? "Región Europa (€)" : "Región Latinoamérica (US$)"}
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {effectiveCfg.methods.map((m) => (
              <span
                key={m.id}
                className="flex items-center gap-1.5 bg-white rounded-lg px-2.5 py-1.5"
                title={m.label}
              >
                {m.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.logo} alt={m.label} className="h-4 w-auto object-contain" />
                ) : (
                  <span className="text-[10px] font-bold text-gray-700">{m.label}</span>
                )}
                <span className="text-[10px] font-semibold text-gray-700 whitespace-nowrap">
                  {m.label}
                </span>
              </span>
            ))}
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