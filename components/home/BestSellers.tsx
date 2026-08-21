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
          className="text-xs font-bold uppercase px-4 py-1.5 rounded-lg text-white transition-all hover:scale-[1.03]"
          style={{
            backgroundColor: "#0C012D",
            border: "1px solid #9E40C0",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "0 0 12px rgba(158, 64, 192, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          Ver Más
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
