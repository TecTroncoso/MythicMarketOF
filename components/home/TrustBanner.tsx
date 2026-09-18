import { Gamepad2 } from "lucide-react";
import { TRUST_ITEMS } from "@/lib/home-data";

// Glow neón rosa de los iconos (más intenso, como en la referencia).
const NEON_ICON_GLOW =
  "drop-shadow(0 0 6px rgba(255, 77, 216, 0.9)) drop-shadow(0 0 14px rgba(255, 45, 146, 0.5))";

// Barra: rectángulo con pequeños chaflanes en las cuatro esquinas.
const BAR_CLIP =
  "polygon(16px 0, calc(100% - 16px) 0, 100% 16px, 100% calc(100% - 16px), calc(100% - 16px) 100%, 16px 100%, 0 calc(100% - 16px), 0 16px)";

// Badge GAME ON: hexágono alargado (puntas laterales) como en la referencia.
const BADGE_CLIP =
  "polygon(22px 0, calc(100% - 22px) 0, 100% 50%, calc(100% - 22px) 100%, 22px 100%, 0 50%)";

export function TrustBanner() {
  return (
    <div
      className="relative"
      style={{ filter: "drop-shadow(0 0 18px rgba(168, 85, 247, 0.35))" }}
    >
      {/* Capa 1: borde neón violeta de la barra */}
      <div className="absolute inset-0 bg-[#a855f7]" style={{ clipPath: BAR_CLIP }} />
      {/* Capa 2: fondo oscuro translúcido (deja ver ~1.5px de borde) */}
      <div
        className="absolute inset-[1.5px] bg-[rgba(13,2,40,0.88)] backdrop-blur-[12px]"
        style={{ clipPath: BAR_CLIP }}
      />

      {/* Contenido */}
      <div className="relative z-10 flex flex-row items-center justify-between pl-8 pr-0 py-3">
        {/* Los 5 beneficios en una sola fila, sin divisores, distribuidos */}
        <div className="hidden lg:flex flex-row items-center flex-1 justify-between pr-10 min-w-0">
          {TRUST_ITEMS.map((item) => (
            <div key={item.title} className="flex items-center gap-3">
              <item.icon
                className="w-6 h-6 shrink-0 text-[#ff4fd8]"
                strokeWidth={1.7}
                style={{ filter: NEON_ICON_GLOW }}
              />
              <div className="leading-tight">
                <div className="text-[12px] font-bold uppercase tracking-wide text-white whitespace-nowrap">
                  {item.title}
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-[#d8b4fe] whitespace-nowrap">
                  {item.subtitle}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Fallback compacto en pantallas pequeñas: solo iconos */}
        <div className="flex lg:hidden flex-row items-center justify-center gap-6 flex-1 pr-4">
          {TRUST_ITEMS.map((item) => (
            <item.icon
              key={item.title}
              className="w-5 h-5 text-[#ff4fd8]"
              style={{ filter: NEON_ICON_GLOW }}
            />
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
      className="relative shrink-0 -my-3 mr-[-2px]"
      style={{ filter: "drop-shadow(0 0 16px rgba(255, 45, 146, 0.8))" }}
    >
      {/* Capa 1: borde neón rosa siguiendo la forma hexagonal */}
      <div className="absolute inset-0 bg-[#ff2d92]" style={{ clipPath: BADGE_CLIP }} />
      {/* Capa 2: interior oscuro */}
      <div
        className="absolute inset-[2px] bg-[#12031f]"
        style={{
          clipPath: BADGE_CLIP,
          boxShadow: "inset 0 0 14px rgba(255, 45, 146, 0.25)",
        }}
      />
      {/* Contenido */}
      <div className="relative z-10 flex items-center gap-3 pl-9 pr-8 py-3.5">
        <Gamepad2
          className="w-9 h-9 text-[#ff4fd8]"
          strokeWidth={1.6}
          style={{ filter: "drop-shadow(0 0 8px rgba(255, 45, 146, 0.9))" }}
        />
        <div className="leading-tight">
          <div
            className="font-extrabold text-xl tracking-wide text-[#ff2d92]"
            style={{ textShadow: "0 0 10px rgba(255, 45, 146, 0.9)" }}
          >
            GAME ON.
          </div>
          <div
            className="font-bold text-[13px] tracking-wider text-[#ff9ecf]"
            style={{ textShadow: "0 0 8px rgba(255, 45, 146, 0.6)" }}
          >
            AHORRA MÁS.
          </div>
        </div>
      </div>
    </div>
  );
}
