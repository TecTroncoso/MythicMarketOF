import { Zap } from "lucide-react";
import { BEST_SELLERS } from "@/lib/home-data";
import { ProductCard } from "./ProductCard";

export function BestSellers() {
  return (
    <div>
      <div className="flex items-center justify-between w-full mb-4 px-1">
        <div className="flex items-center gap-2.5">
          <Zap
            className="w-5 h-5"
            fill="currentColor"
            style={{
              color: "#ff2a85",
              filter: "drop-shadow(0 0 6px rgba(255, 42, 133, 0.8))",
            }}
          />
          <h2 className="text-lg font-extrabold uppercase tracking-[0.08em] text-white">
            Los Más Vendidos
          </h2>
        </div>
        <button
          className="text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-lg text-[#f8fafc] transition-all duration-200 bg-[#0C012D] border border-[#9E40C0] shadow-[0_0_10px_rgba(158,64,192,0.25)] hover:border-[#d946ef] hover:shadow-[0_0_15px_rgba(217,70,239,0.5)] hover:text-white"
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
