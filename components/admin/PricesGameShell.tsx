"use client";

import { useState } from "react";
import { Layers, Table2, type LucideIcon } from "lucide-react";

// ─── Section menu for /admin/precios/[game] ───────────────────────────────
// Two panes switch with a fade+slide cross transition (no route change, the
// page stays clean showing ONE panel at a time; "Lista de precios" default):
//
//   ┌ Lista de precios ─ default: packages table
//   └ Combos personalizados: existing combos + "Nuevo combo" builder
//
// Both panels stay mounted stacked in the same grid area: the visible one is
// relative (gives the container its height), the hidden one fades out in an
// absolute overlay and ignores pointer events.

type PanelKey = "list" | "combos";

const PANELS: { key: PanelKey; label: string; icon: LucideIcon }[] = [
  { key: "list", label: "Lista de precios", icon: Table2 },
  { key: "combos", label: "Combos personalizados", icon: Layers },
];

interface PricesGameShellProps {
  /** Server-rendered price table (shown by default). */
  listContent: React.ReactNode;
  /** Combos list + builder panel. */
  combosContent: React.ReactNode;
}

export function PricesGameShell({ listContent, combosContent }: PricesGameShellProps) {
  const [panel, setPanel] = useState<PanelKey>("list");

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* --- Section sidebar (desktop) --- */}
      <aside
        className="hidden lg:flex w-56 shrink-0 flex-col border border-purple-900/40 rounded-2xl bg-[#0a0520] p-3 lg:sticky lg:top-28"
        aria-label="Secciones de precios del juego"
      >
        <nav className="flex flex-col gap-1">
          {PANELS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setPanel(key)}
              aria-pressed={panel === key}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all text-left ${
                panel === key
                  ? "bg-gradient-to-r from-purple-600/70 to-fuchsia-600/50 text-white shadow-[0_0_16px_rgba(168,85,247,0.25)]"
                  : "text-gray-400 hover:text-white hover:bg-purple-500/10"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      {/* --- Pill tabs (mobile) --- */}
      <nav
        className="flex lg:hidden w-full rounded-xl border border-purple-900/40 bg-[#0a0520] p-1 gap-1"
        aria-label="Secciones de precios del juego"
      >
        {PANELS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setPanel(key)}
            aria-pressed={panel === key}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
              panel === key
                ? "bg-gradient-to-r from-purple-600/70 to-fuchsia-600/50 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </nav>

      {/* --- Animated pane area --- */}
      <div className="flex-1 min-w-0 relative">
        <div
          className={
            panel === "list"
              ? "relative transition-all duration-300 opacity-100 translate-y-0"
              : "absolute inset-0 transition-all duration-300 opacity-0 -translate-y-2 pointer-events-none"
          }
          aria-hidden={panel !== "list"}
        >
          {listContent}
        </div>
        <div
          className={
            panel === "combos"
              ? "relative transition-all duration-300 opacity-100 translate-y-0"
              : "absolute inset-0 transition-all duration-300 opacity-0 -translate-y-2 pointer-events-none"
          }
          aria-hidden={panel !== "combos"}
        >
          {combosContent}
        </div>
      </div>
    </div>
  );
}
