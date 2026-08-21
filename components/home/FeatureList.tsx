import { SIDEBAR_FEATURES, type SidebarFeature } from "@/lib/home-data";

const COLOR_CLASS: Record<SidebarFeature["color"], string> = {
  "neon-pink": "text-neon-pink",
  "neon-purple": "text-neon-purple",
};

export function FeatureList() {
  return (
    <div className="flex flex-col gap-4">
      {SIDEBAR_FEATURES.map((feature, index) => (
        <div key={index} className="flex items-center gap-4 text-gray-300">
          <div className={`p-2 rounded-full bg-card-dark border border-border-dark ${COLOR_CLASS[feature.color]}`}>
            <feature.icon className="w-5 h-5" />
          </div>
          <span className="font-bold text-sm tracking-wide">{feature.title}</span>
        </div>
      ))}
    </div>
  );
}
