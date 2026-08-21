import { SIDEBAR_FEATURES } from "@/lib/home-data";

// Paleta exacta de la sección de beneficios.
const PURPLE = "#9E40C0";
const CARD_BG = "rgba(12, 1, 45, 0.85)";
const CARD_BORDER = "#1F044E";

// Hexágono regular (punta arriba) usado como marco del icono.
const HEX_CLIP = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

function HexIcon({ icon: Icon }: { icon: typeof SIDEBAR_FEATURES[number]["icon"] }) {
  return (
    <div
      className="relative w-9 h-10 shrink-0"
      style={{ filter: `drop-shadow(0 0 6px ${PURPLE}66)` }}
    >
      {/* Borde neón del hexágono */}
      <div className="absolute inset-0" style={{ clipPath: HEX_CLIP, background: PURPLE }} />
      {/* Interior oscuro (deja ver el "borde" de 1.5px) */}
      <div
        className="absolute inset-[1.5px] grid place-items-center"
        style={{ clipPath: HEX_CLIP, background: "#0C012D" }}
      >
        <Icon className="w-4 h-4" strokeWidth={2.25} style={{ color: PURPLE }} />
      </div>
    </div>
  );
}

export function FeatureList() {
  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{
        backgroundColor: CARD_BG,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: `2.5px solid ${CARD_BORDER}`,
        boxShadow: "0 0 15px rgba(31, 4, 78, 0.4)",
      }}
    >
      {SIDEBAR_FEATURES.map((feature, index) => (
        <div key={index} className="flex items-center gap-3">
          <HexIcon icon={feature.icon} />
          <span
            className="text-xs font-bold uppercase tracking-wide leading-tight max-w-[7.5rem]"
            style={{ color: PURPLE }}
          >
            {feature.title}
          </span>
        </div>
      ))}
    </div>
  );
}