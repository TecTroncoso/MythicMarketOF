import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import type { Product } from "@/lib/home-data";
import { PLATFORM_ICONS } from "./platform-icons";

export function ProductCard({ product }: { product: Product }) {
  const PlatformIcon = PLATFORM_ICONS[product.platform];

  const cardClassName =
    "group relative block bg-[#0C012D] border border-[rgba(158,64,192,0.4)] rounded-2xl overflow-hidden shadow-[0_0_12px_rgba(158,64,192,0.15)] transition-all duration-300 hover:border-[#9E40C0] hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(158,64,192,0.4)]";

  const content = (
    <>
      {/* Portada */}
      <div className="aspect-[3/4] relative overflow-hidden bg-[#0C012D]">
        <Image
          src={product.image}
          alt={product.title}
          fill
          className={`${product.imageContain ? "object-contain p-8" : "object-cover"} group-hover:scale-105 transition-transform duration-500 z-0`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0C012D] via-transparent to-transparent z-10 pointer-events-none" />

        {/* Botón de favoritos (arriba a la derecha) */}
        <span
          className="absolute top-2.5 right-2.5 z-20 text-slate-300/90 hover:text-pink-500 hover:scale-110 transition-all cursor-pointer"
          aria-label={`Agregar ${product.title} a favoritos`}
        >
          <Heart className="w-[18px] h-[18px]" />
        </span>

        {/* Badge de plataforma (abajo a la izquierda) */}
        <span className="absolute bottom-2 left-2 z-20 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md flex items-center gap-1.5">
          <PlatformIcon className="w-3 h-3 text-slate-200" />
          <span className="text-[10px] font-bold uppercase text-slate-200">{product.platform}</span>
        </span>
      </div>

      {/* Barra de precios compacta (sin título) */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-[#0C012D]">
        <span className={`${product.badgeClass} font-black text-xs px-2 py-1 rounded-md whitespace-nowrap`}>
          {product.badge}
        </span>
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-sm font-bold text-white whitespace-nowrap">{product.price}</span>
          {product.originalPrice && (
            <span className="text-[11px] text-purple-300/60 line-through whitespace-nowrap">
              {product.originalPrice}
            </span>
          )}
        </div>
      </div>
    </>
  );

  if (product.href) {
    return (
      <Link href={product.href} className={cardClassName}>
        {content}
      </Link>
    );
  }

  return <div className={cardClassName}>{content}</div>;
}