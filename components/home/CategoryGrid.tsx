import { CATEGORY_ICONS, GAME_CATEGORIES } from "@/lib/home-data";

// Paleta de la barra de categorías.
const MAGENTA = "#e879f9";

export function CategoryGrid() {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 xl:grid-cols-11 gap-3">
      {GAME_CATEGORIES.map((category) => {
        const Icon = CATEGORY_ICONS[category.icon];
        return (
          <button
            key={category.name}
            className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-all group bg-[#0C012D] border border-[#1F044E] hover:border-[#9E40C0] hover:shadow-[0_0_12px_rgba(158,64,192,0.35)]"
          >
            <Icon
              className="w-6 h-6 group-hover:scale-110 transition-transform"
              style={{ color: MAGENTA, filter: "drop-shadow(0 0 6px rgba(158, 64, 192, 0.6))" }}
            />
            <span
              className="text-[10px] font-bold uppercase tracking-wide text-[#f1f5f9] group-hover:text-white transition-colors"
            >
              {category.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}