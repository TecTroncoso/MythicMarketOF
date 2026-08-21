import Link from "next/link";
import { Menu } from "lucide-react";
import { NAV_CATEGORIES, type NavCategory } from "@/lib/home-data";

function navLinkClass(category: NavCategory): string {
  const base = "whitespace-nowrap text-sm font-medium py-3 transition-colors";
  if (category.highlight) {
    return `${base} text-neon-pink font-bold drop-shadow-[0_0_8px_rgba(255,0,255,0.6)]`;
  }
  return `${base} text-gray-300 hover:text-white`;
}

export function CategoryBar() {
  return (
    <div className="border-t border-border-dark bg-bg-dark/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-6 overflow-x-auto no-scrollbar">
        <button className="flex items-center gap-2 text-white font-bold text-sm py-3 border-b-2 border-transparent hover:text-neon-pink hover:border-neon-pink transition-all whitespace-nowrap">
          <Menu className="w-5 h-5" />
          Todas las categorías
       </button>
        {NAV_CATEGORIES.map((category) => (
          <Link key={category.label} href={category.href} className={navLinkClass(category)}>
            {category.label}
         </Link>
        ))}
     </div>
   </div>
  );
}
