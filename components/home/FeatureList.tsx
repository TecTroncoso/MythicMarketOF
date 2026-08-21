import { SIDEBAR_FEATURES } from "@/lib/home-data";

// Hexágono regular (punta arriba) usado como marco del icono.
const HEX_CLIP = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

function HexIcon({ icon: Icon }: { icon: typeof SIDEBAR_FEATURES[number]["icon"] }) {
  return (
    <div
      className="relative w-9 h-10 shrink-0"
      style={{ filter: "drop-shadow(0 0 6px rgba(192, 132, 252, 0.45))" }}
    >
      {/* Borde neón del hexágono */}
      <div
        className="absolute inset-0 bg-[#c084fc]"
        style={{ clipPath: HEX_CLIP }}
      />
      {/* Interior oscuro (deja ver el "borde" de 1.5px) */}
      <div
        className="absolute inset-[1.5px] bg-[#150b28] grid place-items-center"
        style={{ clipPath: HEX_CLIP }}
      >
        <Icon className="w-4 h-4 text-white" strokeWidth={2.25} />
      </div>
    </div>
  );
}

export function FeatureList() {
  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{
        background: "rgba(18, 10, 34, 0.75)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(168, 85, 247, 0.4)",
        boxShadow: "0 0 15px rgba(168, 85, 247, 0.15)",
      }}
    >
      {SIDEBAR_FEATURES.map((feature, index) => (
        <div key={index} className="flex items-center gap-3">
          <HexIcon icon={feature.icon} />
          <span className="text-xs font-bold uppercase tracking-wide leading-tight text-[#f1f5f9] max-w-[7.5rem]">
            {feature.title}
          </span>
        </div>
      ))}
    </div>
  );
}