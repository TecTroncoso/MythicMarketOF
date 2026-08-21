import { CATEGORY_ICONS, GAME_CATEGORIES } from "@/lib/home-data";

export function CategoryGrid() {
  return (
    <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
      {GAME_CATEGORIES.map((category) => {
        const Icon = CATEGORY_ICONS[category.icon];
        return (
          <button
            key={category.name}
            className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border-dark bg-card-dark hover:border-neon-cyan hover:shadow-[0_0_15px_rgba(0,255,255,0.3)] transition-all group"
          >
            <Icon className="w-6 h-6 text-neon-pink group-hover:text-neon-cyan transition-colors" />
            <span className="text-[10px] font-bold text-gray-400 group-hover:text-white transition-colors">
              {category.name}
           </span>
         </button>
        );
      })}
   </div>
  );
}
