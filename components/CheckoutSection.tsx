"use client";

import React, { useState, useTransition, useEffect } from 'react';
import Image from 'next/image';
import { Info, ShoppingCart, ShieldCheck, ChevronRight, Loader2, Check } from 'lucide-react';
import { getCheckoutContext, processCheckout } from '@/lib/actions/checkout';
import { PRODUCTS } from '@/lib/catalog';
import { PAYMENT_REGIONS, validatePaymentDetail, buildComprobanteUrl, buildPaypalMeUrl, PAYPAL_ME_URL } from '@/lib/payments';
import type { PaymentRegion } from '@/lib/payments';
import { PaymentModal } from './PaymentModal';

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
    getCheckoutContext().then(setContext).catch(() => {});
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

  return (
    <>
      <div className="lg:col-span-2 space-y-8">
        {/* Step 1: User ID */}
        <section className="bg-[#121824] rounded-2xl p-6 md:p-8 border border-[#1c2534] shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#ffaa00]"></div>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-full bg-[#1c2534] flex items-center justify-center font-bold text-[#ffaa00] text-lg border border-[#2a3441]">1</div>
            <h3 className="text-2xl font-bold">Información de la Cuenta</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-400 block">User ID</label>
              <input 
                type="text" 
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Ej. 12345678" 
                className="w-full bg-[#0a0f1a] border border-[#2a3441] rounded-xl px-4 py-3 md:py-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#ffaa00] focus:ring-1 focus:ring-[#ffaa00] transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-400 block">Zone ID</label>
              <input 
                type="text" 
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                placeholder="Ej. (1234)" 
                className="w-full bg-[#0a0f1a] border border-[#2a3441] rounded-xl px-4 py-3 md:py-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#ffaa00] focus:ring-1 focus:ring-[#ffaa00] transition-all"
              />
            </div>
          </div>
          <div className="mt-4 flex items-start gap-2 bg-[#1c2534]/50 p-3 rounded-lg border border-[#2a3441]">
            <Info className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
            <p className="text-xs text-gray-400 leading-relaxed">
              Para encontrar tu User ID, haz clic en tu avatar en la esquina superior izquierda de la pantalla principal del juego. El ID y Zone ID estarán allí (ej. <span className="text-white font-mono bg-[#0a0f1a] px-1 rounded">12345678(1234)</span>).
            </p>
          </div>
          <div aria-live="polite" className="mt-4">
            {nicknameStatus.kind === "loading" && (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" aria-label="Verificando jugador" />
                <span>Verificando jugador...</span>
              </div>
            )}
            {nicknameStatus.kind === "success" && (
              <div className="flex items-center gap-2 text-green-400 text-sm">
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
        </section>

        {/* Step 2: Select Top-up */}
        <section className="bg-[#121824] rounded-2xl p-6 md:p-8 border border-[#1c2534] shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#ffaa00]"></div>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-full bg-[#1c2534] flex items-center justify-center font-bold text-[#ffaa00] text-lg border border-[#2a3441]">2</div>
            <h3 className="text-2xl font-bold">Selecciona una Recarga</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
            {PRODUCTS.map((prod) => {
              const isSelected = selectedProduct === prod.id;
              const shownPrice = shownPriceFor(prod.id, prod.price);
              return (
                <button
                  key={prod.id}
                  onClick={() => setSelectedProduct(prod.id)}
                  className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                    isSelected 
                      ? 'border-[#ffaa00] bg-[#ffaa00]/10 shadow-[0_0_20px_rgba(255,170,0,0.15)] scale-[1.02]' 
                      : 'border-[#2a3441] bg-[#0a0f1a] hover:border-gray-500 hover:bg-[#1c2534]'
                  }`}
                >
                  {prod.bonus && (
                    <div className="absolute top-0 right-0 bg-[#c51f00] text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                      {prod.bonus}
                    </div>
                  )}
                  <Image src={prod.image} alt={`Recarga de ${prod.name}`} width={64} height={64} className="w-12 h-12 md:w-16 md:h-16 mb-3 object-contain drop-shadow-lg" />
                  <span className="font-bold text-sm md:text-base text-center line-clamp-2 leading-tight mb-1">{prod.name}</span>
                  <span className={`text-xs font-medium ${isSelected ? 'text-[#ffaa00]' : 'text-gray-400'}`}>
                    {effectiveCfg.symbol}{shownPrice.toFixed(2)}
                  </span>
                  {isSelected && (
                    <div className="absolute inset-0 pointer-events-none ring-inset ring-2 ring-[#ffaa00] rounded-xl"></div>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Right Column: Checkout Sidebar */}
      <div className="lg:col-span-1">
        <div className="sticky top-24 space-y-6">
          {/* Summary Card */}
          <div className="bg-[#121824] p-6 lg:p-8 rounded-2xl border border-[#1c2534] shadow-2xl">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-[#ffaa00]" /> Resumen
            </h3>
            
            {selectedProductData ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 bg-[#0a0f1a] p-4 rounded-xl border border-[#2a3441]">
                  <Image src={selectedProductData.image} alt={`Resumen de ${selectedProductData.name}`} width={48} height={48} className="w-12 h-12 rounded bg-[#1c2534] object-contain" />
                  <div>
                    <div className="font-bold text-lg">{selectedProductData.name}</div>
                    <div className="text-sm text-gray-400">Mobile Legends</div>
                  </div>
                </div>
                
                <div className="space-y-2 py-4 border-y border-[#2a3441]">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Precio</span>
                    <span className="font-medium">{effectiveCfg.symbol}{summaryPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Tarifa de procesamiento</span>
                    <span className="text-green-400">Gratis</span>
                  </div>
                </div>

                <div className="flex justify-between items-end pt-2 mb-4">
                  <span className="text-gray-300 font-medium">Total</span>
                  <span className="text-3xl font-black text-[#ffaa00]">{effectiveCfg.symbol}{summaryPrice.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Método</span>
                  <span className="font-medium">{selectedMethod ? (effectiveCfg.methods.find((m) => m.id === selectedMethod)?.label ?? selectedMethod) : "—"}</span>
                </div>
                {paymentDetail && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Detalle</span>
                    <span className="font-medium">{paymentDetail}</span>
                  </div>
                )}

                {checkoutError && (
                  <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-500 text-sm text-center font-medium">
                    {checkoutError}
                  </div>
                )}

                <button 
                  onClick={handleCheckout}
                  disabled={isPending}
                  className="w-full bg-gradient-to-r from-[#ffaa00] to-[#ff5d00] hover:from-[#ffbf33] hover:to-[#ff7b33] text-black font-black text-lg py-4 rounded-xl shadow-[0_0_20px_rgba(255,170,0,0.4)] transition-all transform hover:scale-[1.02] active:scale-[0.98] flex justify-center items-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
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
                    <>Comprar Ahora <ChevronRight className="w-5 h-5" /></>
                  )}
                </button>
                <p className="text-[11px] text-gray-500 text-center mt-4">
                  Al hacer clic en Comprar, aceptas que la venta puede ser gestionada mediante socios externos (ej. Lootbar API).
                </p>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center border-2 border-dashed border-[#2a3441] rounded-xl flex-col gap-3">
                <ShoppingCart className="w-8 h-8 text-gray-600" />
                <span className="text-gray-500 font-medium text-sm text-center">Selecciona un producto <br/>para ver el resumen</span>
              </div>
            )}
          </div>

          {/* Accepted Payment Methods (region-aware) */}
          <div className="bg-[#121824] p-5 rounded-xl border border-[#1c2534]">
            <h4 className="font-bold text-sm mb-1">Métodos aceptados</h4>
            <p className="text-[11px] text-gray-500 mb-3">
              {effectiveRegion === "eu" ? "Región Europa" : "Región Latinoamérica"}
            </p>
            <div className="flex flex-wrap gap-2">
              {effectiveCfg.methods.map((m) => (
                <span
                  key={m.id}
                  className="flex flex-col items-center justify-center gap-1 w-16 bg-white rounded-lg border border-gray-700 px-1 py-2"
                >
                  {m.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.logo} alt={m.label} className="h-5 w-auto object-contain" />
                  ) : (
                    <span className="text-[10px] font-bold text-gray-700">{m.label}</span>
                  )}
                  <span className="text-[9px] font-semibold text-gray-700 text-center leading-tight">
                    {m.label}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* Trust Badges */}
          <div className="bg-[#121824] p-5 rounded-xl border border-[#1c2534] flex items-center gap-4">
            <ShieldCheck className="w-10 h-10 text-green-500 shrink-0" />
            <div>
              <h4 className="font-bold text-sm">Pagos 100% Seguros</h4>
              <p className="text-xs text-gray-400 mt-1">Tus datos están encriptados y protegidos mediante pasarelas verificadas.</p>
            </div>
          </div>
        </div>
      </div>

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
