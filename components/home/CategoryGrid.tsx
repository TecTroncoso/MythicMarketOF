import { CATEGORY_ICONS, GAME_CATEGORIES } from "@/lib/home-data";

const NEON_GLOW =
  "drop-shadow(0 0 5px #9333ea) drop-shadow(0 0 14px rgba(124, 58, 237, 0.85)) drop-shadow(0 0 28px rgba(109, 40, 217, 0.4))";

export function CategoryGrid() {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 xl:grid-cols-11 gap-3">
      {GAME_CATEGORIES.map((category) => {
        const Icon = CATEGORY_ICONS[category.icon];
        return (
          <button
            key={category.name}
            className="group flex flex-col items-center justify-center min-w-[85px] h-[90px] p-3 rounded-xl transition-all duration-[200ms] ease-out hover:-translate-y-[2px]"
            style={{
              background: "rgba(6, 1, 22, 0.88)",
              border: "1px solid rgba(100, 50, 180, 0.25)",
              boxShadow: "0 0 8px rgba(109, 40, 217, 0.1)",
            }}
          >
            <Icon
              className="w-9 h-9 mb-2 transition-transform duration-200 group-hover:scale-110"
              strokeWidth={1.8}
              style={{ color: "#9333ea", filter: NEON_GLOW }}
            />
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/90">
              {category.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}