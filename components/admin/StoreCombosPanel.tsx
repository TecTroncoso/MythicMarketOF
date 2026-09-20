"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Layers, Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { createStoreCombo, deleteStoreCombo } from "@/lib/actions/combos";
// Pure markup helper from lib/markup — importing from "@/lib/pricing-settings"
// would drag the DB client into the browser bundle.
import { applyMarkupCents, type GamePricingSettings } from "@/lib/markup";
import { formatAmount } from "@/lib/orders";
import { ItemMarkupEditor } from "./ItemMarkupEditor";

interface ComboPackageRow {
  packageName: string;
  checkoutUsdCents: number | null;
  checkoutEurCents: number | null;
}

interface ExistingCombo {
  id: string;
  name: string;
  components: { packageName: string; qty: number }[];
}

interface StoreCombosPanelProps {
  game: string;
  packages: ComboPackageRow[];
  combos: ExistingCombo[];
  /** Per-item markups keyed by storefront id ("combo-<uuid>"), serialized. */
  itemMarkups: Record<string, GamePricingSettings>;
}

/** Sale price preview: supplier checkout sum marked up per currency. */
function comboCents(
  components: { packageName: string; qty: number }[],
  packages: ComboPackageRow[],
  pick: (p: ComboPackageRow) => number | null
): number | null {
  let total = 0;
  for (const component of components) {
    const row = packages.find((p) => p.packageName === component.packageName);
    const cost = row ? pick(row) : null;
    if (cost === null) return null;
    total += cost * component.qty;
  }
  return total;
}

function Breakdown({ components }: { components: { packageName: string; qty: number }[] }) {
  return (
    <p className="text-xs text-gray-500">
      {components.map((c) => `${c.qty}x ${c.packageName}`).join(" + ")}
    </p>
  );
}

export function StoreCombosPanel({ game, packages, combos, itemMarkups }: StoreCombosPanelProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const pickedPackages = Object.entries(selected).filter(([, qty]) => qty > 0);
  const previewUsd = comboCents(
    pickedPackages.map(([packageName, qty]) => ({ packageName, qty })),
    packages,
    (p) => p.checkoutUsdCents
  );
  const previewEur = comboCents(
    pickedPackages.map(([packageName, qty]) => ({ packageName, qty })),
    packages,
    (p) => p.checkoutEurCents
  );

  const setQty = (packageName: string, qty: number) =>
    setSelected((prev) => ({ ...prev, [packageName]: Math.max(0, Math.min(10, qty)) }));

  const handleCreate = () => {
    setFeedback(null);
    const components = pickedPackages.map(([packageName, qty]) => ({ packageName, qty }));
    if (components.length === 0) {
      setFeedback({ ok: false, text: "Selecciona al menos un paquete con su cantidad." });
      return;
    }
    startTransition(async () => {
      const res = await createStoreCombo({ game, name: name.trim() || undefined, components });
      if (res.success) {
        setFeedback({ ok: true, text: "Combo creado. Ya aparece en el Select Top-Up de la tienda." });
        setSelected({});
        setName("");
        router.refresh();
      } else {
        setFeedback({ ok: false, text: res.error });
      }
    });
  };

  const handleDelete = (id: string) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await deleteStoreCombo(game, id);
      if (res.success) {
        setFeedback({ ok: true, text: "Combo eliminado." });
        router.refresh();
      } else {
        setFeedback({ ok: false, text: res.error });
      }
    });
  };

  return (
    <section className="bg-[#121824] border border-[#1c2534] rounded-2xl p-5 mb-6 flex flex-col gap-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Layers className="w-4 h-4 text-[#ffaa00]" />
          <h2 className="text-sm font-black uppercase tracking-widest text-white">
            Combos personalizados
          </h2>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          Combina paquetes del proveedor (con cantidades) para crear items nuevos de la tienda.
          El coste del combo es la <span className="text-gray-200 font-semibold">suma de los checkout</span> de
          sus paquetes y se revalúa solo cada vez que se actualizan los precios del proveedor.
          Cada combo lleva su <span className="text-gray-200 font-semibold">propio markup USD/EUR</span> —
          asígnalo tras crearlo, o venderá a costo.
        </p>
      </div>

      {/* Combos existentes */}
      {combos.length > 0 && (
        <ul className="flex flex-col gap-2">
          {combos.map((combo) => {
            const costUsd = comboCents(combo.components, packages, (p) => p.checkoutUsdCents);
            const costEur = comboCents(combo.components, packages, (p) => p.checkoutEurCents);
            // Per-combo markup; without one the combo sells at supplier cost.
            const override = itemMarkups[`combo-${combo.id}`];
            const comboMarkupUsd = override?.markupUsd ?? 0;
            const comboMarkupEur = override?.markupEur ?? 0;
            return (
              <li
                key={combo.id}
                className="flex flex-wrap items-center justify-between gap-3 bg-[#0a0f1a] border border-[#1c2534] rounded-xl px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{combo.name}</p>
                  <Breakdown components={combo.components} />
                </div>
                <div className="flex items-center gap-4">
                  {([
                    { cost: costUsd, markup: comboMarkupUsd, currency: "USD" },
                    { cost: costEur, markup: comboMarkupEur, currency: "EUR" },
                  ] as const).map(({ cost, markup, currency }) => (
                    <div key={currency} className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">{currency}</p>
                      <p className="text-xs text-gray-400">
                        {cost === null ? "s/ precio" : `${formatAmount(cost, currency)} → `}
                        {cost !== null && (
                          <span className="text-[#7dd87d] font-bold">
                            {formatAmount(applyMarkupCents(cost, markup), currency)}
                          </span>
                        )}
                      </p>
                    </div>
                  ))}
                  <ItemMarkupEditor
                    game={game}
                    itemKey={`combo-${combo.id}`}
                    markupUsd={comboMarkupUsd}
                    markupEur={comboMarkupEur}
                    hasOverride={Boolean(override)}
                    compact
                  />
                  <button
                    type="button"
                    onClick={() => handleDelete(combo.id)}
                    disabled={isPending}
                    className="text-gray-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10 disabled:opacity-50"
                    aria-label={`Eliminar ${combo.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Constructor de combos */}
      <div className="border border-dashed border-[#2a3547] rounded-xl p-4 flex flex-col gap-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
          Nuevo combo — elige paquetes y cantidades
        </p>
        <ul className="flex flex-col divide-y divide-[#1c2534]">
          {packages.map((pkg) => {
            const qty = selected[pkg.packageName] ?? 0;
            return (
              <li key={pkg.packageName} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-200 truncate">{pkg.packageName}</p>
                  <p className="text-[11px] text-gray-500">
                    Chk {pkg.checkoutUsdCents !== null ? formatAmount(pkg.checkoutUsdCents, "USD") : "—"}
                    {" · "}
                    {pkg.checkoutEurCents !== null ? formatAmount(pkg.checkoutEurCents, "EUR") : "—"}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setQty(pkg.packageName, qty - 1)}
                    disabled={isPending || qty === 0}
                    className="w-7 h-7 rounded-lg border border-[#1c2534] text-gray-300 hover:border-[#ffaa00]/60 disabled:opacity-30 flex items-center justify-center transition-colors"
                    aria-label={`Quitar un ${pkg.packageName}`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-7 text-center text-sm font-black text-white tabular-nums">{qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty(pkg.packageName, qty + 1)}
                    disabled={isPending || qty >= 10}
                    className="w-7 h-7 rounded-lg border border-[#1c2534] text-gray-300 hover:border-[#ffaa00]/60 disabled:opacity-30 flex items-center justify-center transition-colors"
                    aria-label={`Añadir un ${pkg.packageName}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {pickedPackages.length > 0 && (
          <div className="flex flex-wrap items-center gap-4 bg-[#0a0f1a] border border-[#1c2534] rounded-lg px-3 py-2">
            <span className="text-[11px] uppercase tracking-wider text-gray-500 font-bold">Coste</span>
            <span className="text-xs text-gray-300">
              USD:{" "}
              {previewUsd === null ? <span className="text-gray-500">s/ precio</span> : formatAmount(previewUsd, "USD")}
            </span>
            <span className="text-xs text-gray-300">
              EUR:{" "}
              {previewEur === null ? <span className="text-gray-500">s/ precio</span> : formatAmount(previewEur, "EUR")}
            </span>
            <span className="text-[11px] text-gray-500 italic">
              El markup se asigna al combo una vez creado (sin markup vende a costo).
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="Nombre del combo (opcional — se genera solo)"
            className="flex-1 min-w-56 bg-[#0a0f1a] border border-[#1c2534] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#ffaa00]/60 transition-colors"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={isPending || pickedPackages.length === 0}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors bg-[#ffaa00] text-[#0a0f1a] hover:bg-[#ffc233] disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Crear combo
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
      </div>
    </section>
  );
}
