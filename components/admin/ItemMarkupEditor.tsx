"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, RotateCcw } from "lucide-react";
import { resetItemMarkup, saveItemMarkup } from "@/lib/actions/item-markups";

interface ItemMarkupEditorProps {
  game: string;
  /** Storefront product id (package slug or "combo-<uuid>"). */
  itemKey: string;
  /** Effective markups right now (the item's own, or 0 when unset). */
  markupUsd: number;
  markupEur: number;
  /** True when this item has markup stored; false = sells AT COST. */
  hasOverride: boolean;
  /** Compact rendering for table cells. */
  compact?: boolean;
}

/**
 * Per-item markup editor: USD/LATAM and EUR/EU percentages next to each
 * price-list row. Values are entered in percent (5 = 5%); the server stores
 * fractions. There is no game-level default anymore: an item without markup
 * sells at supplier cost, and is flagged as SIN MARKUP here.
 */
export function ItemMarkupEditor({
  game,
  itemKey,
  markupUsd,
  markupEur,
  hasOverride,
  compact = false,
}: ItemMarkupEditorProps) {
  const router = useRouter();
  const [usdPct, setUsdPct] = useState(formatPct(markupUsd));
  const [eurPct, setEurPct] = useState(formatPct(markupEur));
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const inputClass =
    "w-14 bg-[#0a0f1a] border border-[#1c2534] rounded-lg px-1.5 py-1 text-xs font-bold text-white text-center focus:outline-none focus:border-[#ffaa00]/60 transition-colors";

  const handleSave = () => {
    setFeedback(null);
    const usd = Number(usdPct.replace(",", "."));
    const eur = Number(eurPct.replace(",", "."));
    if (!Number.isFinite(usd) || !Number.isFinite(eur)) {
      setFeedback({ ok: false, text: "Porcentajes inválidos." });
      return;
    }
    startTransition(async () => {
      const res = await saveItemMarkup({ game, itemKey, markupUsd: usd / 100, markupEur: eur / 100 });
      setFeedback(
        res.success
          ? { ok: true, text: "Guardado." }
          : { ok: false, text: res.error }
      );
      if (res.success) router.refresh();
    });
  };

  const handleReset = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await resetItemMarkup(game, itemKey);
      if (res.success) {
        // No markup row => the item sells at supplier cost (0%).
        setUsdPct("0");
        setEurPct("0");
        setFeedback({ ok: true, text: "Markup eliminado: venderá a costo." });
        router.refresh();
      } else {
        setFeedback({ ok: false, text: res.error });
      }
    });
  };

  return (
    <div className={compact ? "flex flex-col items-end gap-1" : "flex flex-col gap-1.5"}>
      <div className="flex items-center gap-1" title="Markup de este item — USD (LATAM) / EUR (Europa). Sin markup propio el item vende al costo del proveedor.">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          max={100}
          step="0.1"
          value={usdPct}
          onChange={(e) => setUsdPct(e.target.value)}
          aria-label="Markup USD %"
          placeholder="0"
          className={inputClass}
        />
        <span className="text-[10px] text-gray-500 font-bold">US%</span>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          max={100}
          step="0.1"
          value={eurPct}
          onChange={(e) => setEurPct(e.target.value)}
          aria-label="Markup EUR %"
          placeholder="0"
          className={inputClass}
        />
        <span className="text-[10px] text-gray-500 font-bold">€%</span>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="p-1.5 rounded-lg bg-[#ffaa00] text-[#0a0f1a] hover:bg-[#ffc233] transition-colors disabled:opacity-50"
          aria-label="Guardar markups del item"
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
        </button>
        {hasOverride && (
          <button
            type="button"
            onClick={handleReset}
            disabled={isPending}
            className="p-1.5 rounded-lg border border-[#1c2534] text-gray-400 hover:text-white hover:border-gray-500 transition-colors disabled:opacity-50"
            aria-label="Quitar markup (vender a costo)"
            title="Quitar el markup del item: pasará a venderse al costo del proveedor"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {!hasOverride && (
        <span className="text-[9px] uppercase tracking-wider text-red-400 font-bold">
          Sin markup — vende a costo
        </span>
      )}
      {feedback && (
        <span className={`text-[11px] font-semibold ${feedback.ok ? "text-green-400" : "text-red-400"}`} role={feedback.ok ? "status" : "alert"}>
          {feedback.text}
        </span>
      )}
    </div>
  );
}

function formatPct(value: number): string {
  // 0.05 -> "5" ; 0.025 -> "2.5" (sin ceros de relleno)
  return String(Number((value * 100).toFixed(2)));
}
