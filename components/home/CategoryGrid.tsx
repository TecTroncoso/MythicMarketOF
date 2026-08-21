import { CATEGORY_ICONS, GAME_CATEGORIES } from "@/lib/home-data";

// Paleta de la barra de categorías.
const PURPLE = "#9E40C0";
const MAGENTA = "#e879f9";
const CARD_BG = "#0C012D";
const CARD_BORDER = "#1F044E";

export function CategoryGrid() {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 xl:grid-cols-11 gap-3">
      {GAME_CATEGORIES.map((category) => {
        const Icon = CATEGORY_ICONS[category.icon];
        return (
          <button
            key={category.name}
            className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-all group"
            style={{
              backgroundColor: CARD_BG,
              border: `1px solid ${CARD_BORDER}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = PURPLE;
              e.currentTarget.style.boxShadow = `0 0 12px rgba(158, 64, 192, 0.35)`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = CARD_BORDER;
              e.currentTarget.style.boxShadow = "none";
            }}
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