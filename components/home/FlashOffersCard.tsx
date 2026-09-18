import { Zap } from "lucide-react";
import { FLASH_OFFER_TIMER } from "@/lib/home-data";

const PANEL_STYLE = {
  border: "1.5px solid #9333ea",
  borderRadius: "14px",
  boxShadow:
    "0 0 14px rgba(147, 51, 234, 0.5), inset 0 0 8px rgba(147, 51, 234, 0.08)",
  background: "rgba(10, 2, 30, 0.85)",
} as const;

// Rayo con brillo rojizo/rosado
const BOLT_GLOW = "drop-shadow(0 0 4px #ff3b3b) drop-shadow(0 0 12px rgba(255, 59, 59, 0.6))";

function TimerCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="px-2 py-1 rounded text-white text-[22px] leading-none font-mono font-bold"
        style={{
          background: "rgba(6, 1, 22, 0.9)",
          border: "1px solid rgba(147, 51, 234, 0.55)",
          boxShadow: "0 0 8px rgba(147, 51, 234, 0.25)",
        }}
      >
        {value}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#e879f9" }}>
        {label}
      </span>
    </div>
  );
}

export function FlashOffersCard() {
  const { hours, minutes, seconds } = FLASH_OFFER_TIMER;
  return (
    <div className="relative overflow-hidden p-5 flex flex-col items-center w-[220px]" style={PANEL_STYLE}>
      {/* Barra lateral izquierda */}
      <div
        className="absolute top-0 left-0 w-[2px] h-full rounded-l-[14px]"
        style={{ background: "#d946ef", boxShadow: "0 0 10px #d946ef, 0 0 20px rgba(217,70,239,0.5)" }}
      />

      {/* Contenedor del título centrado */}
      <div className="mb-4 flex items-center justify-center gap-3">
        <Zap
          className="w-8 h-8 animate-pulse shrink-0"
          strokeWidth={1.5}
          style={{ color: "#ff4b4b", filter: BOLT_GLOW }}
        />
        <div className="flex flex-col justify-center">
          <span
            className="text-[14px] font-extrabold uppercase tracking-wide leading-tight"
            style={{ color: "#60a5fa", textShadow: "0 0 8px rgba(96, 165, 250, 0.6)" }} // Celeste/Cyan
          >
            OFERTAS
          </span>
          <span
            className="text-[22px] font-black uppercase tracking-wide leading-none"
            style={{ color: "#e879f9", textShadow: "0 0 10px rgba(232, 121, 249, 0.6)" }} // Magenta/Rosa claro
          >
            FLASH
          </span>
        </div>
      </div>

      {/* Label del Timer */}
      <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "#e2e8f0" }}>
        TERMINA EN:
      </p>

      {/* Timer */}
      <div className="flex items-start justify-center gap-2 mb-6">
        <TimerCell value={hours} label="HRS" />
        <span className="text-xl font-bold pt-1" style={{ color: "#e879f9" }}>:</span>
        <TimerCell value={minutes} label="MIN" />
        <span className="text-xl font-bold pt-1" style={{ color: "#e879f9" }}>:</span>
        <TimerCell value={seconds} label="SEC" />
      </div>

      {/* Botón CTA */}
      <button
        className="w-[70%] py-1.5 rounded-lg font-bold text-[11px] uppercase tracking-[0.1em] text-white transition-all duration-200 hover:border-[#d946ef] hover:shadow-[0_0_12px_rgba(217,70,239,0.5)]"
        style={{
          background: "rgba(6, 1, 22, 0.85)",
          border: "1.5px solid #9333ea",
          boxShadow: "0 0 8px rgba(147, 51, 234, 0.2)",
        }}
      >
        VER OFERTAS
      </button>
    </div>
  );
}
