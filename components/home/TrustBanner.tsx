import { Gamepad2 } from "lucide-react";
import { TRUST_ITEMS } from "@/lib/home-data";

// Glow neón de los iconos de beneficios.
const NEON_ICON_GLOW = "drop-shadow(0 0 5px #d946ef)";

// Geometría tecnológica de la barra: chaflán en esquina superior izquierda
// y corte diagonal en el lateral superior derecho.
const BAR_CLIP =
  "polygon(14px 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%, 0 14px)";

// Paralelogramo del badge GAME ON: corte diagonal paralelo.
const BADGE_CLIP = "polygon(12px 0%, 100% 0%, calc(100% - 15px) 100%, 0% 100%)";

export function TrustBanner() {
  return (
    <>
      {/* Barra con chaflanes tecnológicos (borde neón por doble capa) */}
      <div
        className="relative"
        style={{ filter: "drop-shadow(0 0 15px rgba(158, 64, 192, 0.3))" }}
      >
        {/* Capa 1: línea neón violeta */}
        <div className="absolute inset-0 bg-[#a855f7]" style={{ clipPath: BAR_CLIP }} />
        {/* Capa 2: fondo oscuro translúcido (deja ver el borde de 1.5px) */}
        <div
          className="absolute inset-[1.5px] bg-[rgba(12,1,45,0.85)] backdrop-blur-[12px]"
          style={{ clipPath: BAR_CLIP }}
        />

        {/* Contenido */}
        <div className="relative z-10 flex flex-row items-center justify-between px-6 py-3.5">
          {/* Los 5 beneficios en una sola fila con divisores verticales */}
          <div className="hidden lg:flex flex-row items-center flex-1 justify-between pr-6 min-w-0">
            {TRUST_ITEMS.map((item, index) => (
              <div key={item.title} className="contents">
                <div className="flex items-center gap-3">
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
                {index < TRUST_ITEMS.length - 1 && (
                  <span className="w-px h-7 shrink-0 bg-[rgba(158,64,192,0.2)]" />
                )}
              </div>
            ))}
          </div>

          {/* Fallback compacto en pantallas pequeñas: solo iconos */}
          <div className="flex lg:hidden flex-row items-center justify-center gap-6 flex-1 pr-4">
            {TRUST_ITEMS.map((item) => (
              <item.icon
                key={item.title}
                className="w-5 h-5 text-[#d946ef]"
                style={{ filter: NEON_ICON_GLOW }}
              />
            ))}
          </div>

          <GameOnBadge />
        </div>
      </div>
    </>
  );
}

function GameOnBadge() {
  return (
    <div
      className="relative shrink-0 ml-6"
      style={{ filter: "drop-shadow(0 0 18px rgba(217, 70, 239, 0.65))" }}
    >
      {/* Capa 1: borde neón ultra brillante siguiendo el corte diagonal */}
      <div className="absolute inset-0 bg-[#d946ef]" style={{ clipPath: BADGE_CLIP }} />
      {/* Capa 2: interior oscuro + glow interno */}
      <div
        className="absolute inset-[2px] bg-[#0C012D]"
        style={{ clipPath: BADGE_CLIP, boxShadow: "inset 0 0 8px rgba(217, 70, 239, 0.2)" }}
      />
      {/* Destello en la esquina superior derecha */}
      <div
        className="absolute top-0 right-0 w-16 h-[3px] z-20"
        style={{
          background: "linear-gradient(90deg, transparent, #ffffff, #ff2a85)",
          filter: "drop-shadow(0 0 6px #ff2a85)",
        }}
      />
      {/* Contenido */}
      <div className="relative z-10 flex items-center gap-3 px-6 py-2.5">
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