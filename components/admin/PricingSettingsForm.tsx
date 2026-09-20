"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Percent, Save } from "lucide-react";
import { savePricingSettings } from "@/lib/actions/pricing";

interface PricingSettingsFormProps {
  game: string;
  /** Current markups as FRACTIONS (0.05 = 5%). */
  markupUsd: number;
  markupEur: number;
}

/**
 * Admin form for the per-currency retail markup of a game. The storefront
 * sale price is supplierCheckout * (1 + markup): markupUsd drives LATAM
 * (US$), markupEur drives Europe (€). Inputs work in human percent units.
 */
export function PricingSettingsForm({ game, markupUsd, markupEur }: PricingSettingsFormProps) {
  const router = useRouter();
  const [usdPct, setUsdPct] = useState((markupUsd * 100).toString());
  const [eurPct, setEurPct] = useState((markupEur * 100).toString());
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const usd = Number(usdPct.replace(",", "."));
    const eur = Number(eurPct.replace(",", "."));
    if (!Number.isFinite(usd) || !Number.isFinite(eur)) {
      setFeedback({ ok: false, text: "Ingresá porcentajes numéricos válidos (ej: 5 o 7.5)." });
      return;
    }

    startTransition(async () => {
      const res = await savePricingSettings({
        game,
        markupUsd: usd / 100,
        markupEur: eur / 100,
      });
      if (res.success) {
        setFeedback({ ok: true, text: "Markups guardados. La tienda ya vende con los nuevos precios." });
        router.refresh();
      } else {
        setFeedback({ ok: false, text: res.error });
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#121824] border border-[#1c2534] rounded-2xl p-5 flex flex-col gap-4"
    >
      <div className="flex items-center gap-2">
        <Percent className="w-4 h-4 text-[#ffaa00]" />
        <h2 className="text-sm font-black uppercase tracking-widest text-white">
          Markup de venta
        </h2>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed">
        El Select Top-Up vende al precio <span className="text-gray-200 font-semibold">Chk × (1 + markup)</span>.
        El markup USD se aplica a los compradores de Latinoamérica (cobran en US$) y el EUR a los
        de Europa (cobran en €).
      </p>

      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Markup USD (LATAM)
          </span>
          <span className="flex items-center gap-1.5 bg-[#0a0f1a] border border-[#1c2534] rounded-xl px-3 py-2 focus-within:border-[#ffaa00]/60 transition-colors">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step="0.1"
              value={usdPct}
              onChange={(e) => setUsdPct(e.target.value)}
              className="w-20 bg-transparent text-white text-sm font-bold outline-none"
            />
            <span className="text-gray-500 text-sm font-bold">%</span>
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Markup EUR (Europa)
          </span>
          <span className="flex items-center gap-1.5 bg-[#0a0f1a] border border-[#1c2534] rounded-xl px-3 py-2 focus-within:border-[#ffaa00]/60 transition-colors">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step="0.1"
              value={eurPct}
              onChange={(e) => setEurPct(e.target.value)}
              className="w-20 bg-transparent text-white text-sm font-bold outline-none"
            />
            <span className="text-gray-500 text-sm font-bold">%</span>
          </span>
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors bg-[#ffaa00] text-[#0a0f1a] hover:bg-[#ffc233] disabled:opacity-60"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isPending ? "Guardando..." : "Guardar markups"}
        </button>
      </div>

      {feedback && (
        <p
          role={feedback.ok ? "status" : "alert"}
          className={`text-xs font-semibold rounded-lg border px-3 py-2 ${
            feedback.ok
              ? "border-green-500/40 bg-green-500/10 text-green-300"
              : "border-red-500/40 bg-red-500/10 text-red-300"
          }`}
        >
          {feedback.text}
        </p>
      )}
    </form>
  );
}
