import { SIDEBAR_FEATURES } from "@/lib/home-data";

const ICON_GLOW =
  "drop-shadow(0 0 4px #d946ef) drop-shadow(0 0 9px rgba(168, 85, 247, 0.7))";

// No circle border — just the icon with neon glow, matching the reference
function NeonIcon({
  icon: Icon,
}: {
  icon: (typeof SIDEBAR_FEATURES)[number]["icon"];
}) {
  return (
    <Icon
      className="w-6 h-6 shrink-0"
      strokeWidth={1.8}
      style={{ color: "#d946ef", filter: ICON_GLOW }}
    />
  );
}

export function FeatureList() {
  return (
    <div
      className="relative py-5 pl-4 pr-6 space-y-5 w-[220px]"
      style={{
        border: "1.5px solid #9333ea",
        borderRadius: "14px",
        boxShadow:
          "0 0 14px rgba(147, 51, 234, 0.5), inset 0 0 8px rgba(147, 51, 234, 0.08)",
        background: "rgba(10, 2, 30, 0.85)",
      }}
    >
      {SIDEBAR_FEATURES.map((feature, index) => {
        const words = feature.title.split(" ");
        const mid = Math.ceil(words.length / 2);
        const line1 = words.slice(0, mid).join(" ");
        const line2 = words.slice(mid).join(" ");

        return (
          <div key={index} className="flex items-center gap-3">
            <NeonIcon icon={feature.icon} />

            <div className="flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] leading-tight" style={{ color: "#e879f9" }}>
                {line1}
              </span>
              {line2 && (
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] leading-tight" style={{ color: "#e879f9" }}>
                  {line2}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}