import { CATEGORY_ICONS, GAME_CATEGORIES } from "@/lib/home-data";

// Efecto de luz de neón real aplicado a todos los SVGs de categoría.
const NEON_GLOW =
  "drop-shadow(0 0 2px #ffffff) drop-shadow(0 0 6px #d946ef) drop-shadow(0 0 12px rgba(168, 85, 247, 0.8))";

export function CategoryGrid() {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 xl:grid-cols-11 gap-3">
      {GAME_CATEGORIES.map((category) => {
        const Icon = CATEGORY_ICONS[category.icon];
        return (
          <button
            key={category.name}
            className="group flex flex-col items-center justify-center min-w-[85px] h-[85px] p-2 rounded-2xl transition-all duration-[250ms] ease-out bg-[rgba(12,1,45,0.75)] backdrop-blur-[10px] border-[1.5px] border-[rgba(168,85,247,0.45)] shadow-[0_0_12px_rgba(168,85,247,0.15),inset_0_0_8px_rgba(168,85,247,0.05)] hover:border-[#d946ef] hover:shadow-[0_0_20px_rgba(217,70,239,0.5)] hover:-translate-y-[3px]"
          >
            <Icon
              className="w-8 h-8 mb-2 text-[#e879f9] group-hover:scale-110 transition-transform"
              strokeWidth={2}
              style={{ filter: NEON_GLOW }}
            />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#ede9fe]">
              {category.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}