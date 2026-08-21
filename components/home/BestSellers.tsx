import { Zap } from "lucide-react";
import { BEST_SELLERS } from "@/lib/home-data";
import { ProductCard } from "./ProductCard";

export function BestSellers() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-neon-pink" fill="currentColor" />
          <h2 className="text-xl font-bold italic tracking-wide">LOS MÁS VENDIDOS</h2>
       </div>
        <button className="text-xs font-bold px-3 py-1.5 border border-border-dark bg-card-dark hover:bg-border-dark transition-colors">
          VER MÁS
       </button>
     </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {BEST_SELLERS.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
     </div>
   </div>
  );
}
