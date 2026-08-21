import { Zap } from "lucide-react";
import { BEST_SELLERS } from "@/lib/home-data";
import { ProductCard } from "./ProductCard";

export function BestSellers() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap
            className="w-5 h-5 text-neon-pink"
            fill="currentColor"
            style={{ filter: "drop-shadow(0 0 6px rgba(255, 42, 133, 0.7))" }}
          />
          <h2 className="text-xl font-bold tracking-wider text-white">LOS MÁS VENDIDOS</h2>
        </div>
        <button
          className="text-xs font-bold uppercase px-4 py-1.5 rounded-lg text-white transition-all hover:scale-[1.03] hover:shadow-[0_0_12px_rgba(158,64,192,0.4)] bg-[#0C012D] border border-[#9E40C0]"
        >
          Ver Más
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
        {BEST_SELLERS.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
