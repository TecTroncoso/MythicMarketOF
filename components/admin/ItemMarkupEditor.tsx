"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, RotateCcw } from "lucide-react";
import { resetItemMarkup, saveItemMarkup } from "@/lib/actions/item-markups";

interface ItemMarkupEditorProps {
  game: string;
  /** Storefront product id (package slug or "combo-<uuid>"). */
  itemKey: string;
  /** Effective markups right now (override if set, else the game defaults). */
  markupUsd: number;
  markupEur: number;
  /** True when this item has its own override (enables the reset button). */
  hasOverride: boolean;
  /** Game-level defaults, shown as placeholder/hint. */
  defaultUsd: number;
  defaultEur: number;
  /** Compact rendering for table cells. */
  compact?: boolean;
}

/**
 * Per-item markup editor: USD/LATAM and EUR/EU percentages next to each
 * price-list row. Values are entered in percent (5 = 5%); the server stores
 * fractions. A reset button removes the override and re-applies the game
 * defaults.
 */
export function ItemMarkupEditor({
  game,
  itemKey,
  markupUsd,
  markupEur,
  hasOverride,
  defaultUsd,
  defaultEur,
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
        setUsdPct(formatPct(defaultUsd));
        setEurPct(formatPct(defaultEur));
        setFeedback({ ok: true, text: "Restablecido al default." });
        router.refresh();
      } else {
        setFeedback({ ok: false, text: res.error });
      }
    });
  };

  return (
    <div className={compact ? "flex flex-col items-end gap-1" : "flex flex-col gap-1.5"}>
      <div className="flex items-center gap-1" title="Markup de este item — USD (LATAM) / EUR (Europa). Vacío no es válido: usa el botón de restablecer para volver al default.">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          max={100}
          step="0.1"
          value={usdPct}
          onChange={(e) => setUsdPct(e.target.value)}
          aria-label="Markup USD %"
          placeholder={(defaultUsd * 100).toString()}
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
          placeholder={(defaultEur * 100).toString()}
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
            aria-label="Restablecer al markup por defecto"
            title="Quitar el override: vuelve al markup por defecto del juego"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {hasOverride && (
        <span className="text-[9px] uppercase tracking-wider text-[#ffaa00] font-bold">Propio</span>
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
