import { Gamepad2 } from "lucide-react";
import { TRUST_ITEMS } from "@/lib/home-data";

// Glow neón de los iconos de beneficios.
const NEON_ICON_GLOW = "drop-shadow(0 0 5px #d946ef)";

// Cápsula con corte tecnológico biselado (esquinas superior-izquierda e
// inferior-derecha cortadas en ángulo).
const BEVEL_CLIP =
  "polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)";

export function TrustBanner() {
  return (
    <div className="max-w-7xl mx-auto px-4 mt-12">
      {/* Barra horizontal compacta */}
      <div className="flex flex-row items-center justify-between px-6 py-3.5 rounded-2xl bg-[rgba(12,1,45,0.85)] backdrop-blur-[10px] border-[1.5px] border-[rgba(158,64,192,0.5)] shadow-[0_0_15px_rgba(158,64,192,0.2)]">
        {/* Los 5 beneficios en una sola fila con divisores verticales */}
        <div className="hidden lg:flex flex-row items-center flex-1 justify-between pr-6 min-w-0">
          {TRUST_ITEMS.map((item, index) => (
            <div
              key={item.title}
              className={`flex items-center gap-3 ${index < TRUST_ITEMS.length - 1 ? "border-r border-[rgba(158,64,192,0.25)] pr-4" : ""
                }`}
            >
              <item.icon
                className="w-5 h-5 shrink-0 text-[#d946ef]"
                style={{ filter: NEON_ICON_GLOW }}
              />
              <div className="leading-tight">
                <div className="text-xs font-bold uppercase text-white whitespace-nowrap">
                  {item.title}
                </div>
                <div className="text-[10px] font-semibold uppercase text-[#c084fc] whitespace-nowrap">
                  {item.subtitle}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Fallback compacto en pantallas pequeñas: solo iconos */}
        <div className="flex lg:hidden flex-row items-center justify-center gap-6 flex-1 pr-4">
          {TRUST_ITEMS.map((item) => (
            <item.icon key={item.title} className="w-5 h-5 text-[#d946ef]" style={{ filter: NEON_ICON_GLOW }} />
          ))}
        </div>

        <GameOnBadge />
      </div>
    </div>
  );
}

function GameOnBadge() {
  return (
    <div
      className="relative shrink-0 ml-6"
      style={{ filter: "drop-shadow(0 0 20px rgba(217, 70, 239, 0.6))" }}
    >
      {/* Borde neón intenso siguiendo la forma biselada */}
      <div className="absolute inset-0 bg-[#d946ef]" style={{ clipPath: BEVEL_CLIP }} />
      {/* Interior oscuro + glow interno */}
      <div
        className="absolute inset-[2px] bg-[#0C012D]"
        style={{ clipPath: BEVEL_CLIP, boxShadow: "inset 0 0 10px rgba(217, 70, 239, 0.2)" }}
      />
      {/* Contenido */}
      <div className="relative z-10 flex items-center gap-3 px-5 py-2.5">
        <Gamepad2
          className="w-8 h-8 text-[#e879f9]"
          style={{ filter: "drop-shadow(0 0 6px #d946ef)" }}
        />
        <div className="leading-tight">
          <div
            className="font-extrabold text-lg tracking-wide"
            style={{ color: "#ff2a85", textShadow: "0 0 8px #ff2a85" }}
          >
            GAME ON.
          </div>
          <div className="font-bold text-xs tracking-wider text-[#ede9fe]">AHORRA MÁS.</div>
        </div>
      </div>
    </div>
  );
}