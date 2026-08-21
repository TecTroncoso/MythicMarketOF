import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/home-data";

const ACCENT_HOVER: Record<Product["accent"], string> = {
  "neon-pink": "hover:border-neon-pink hover:shadow-[0_0_15px_rgba(255,0,255,0.2)] group-hover:text-neon-pink",
  "neon-cyan": "hover:border-neon-cyan hover:shadow-[0_0_15px_rgba(0,255,255,0.2)] group-hover:text-neon-cyan",
  "neon-purple":
    "hover:border-neon-purple hover:shadow-[0_0_15px_rgba(255,170,0,0.2)] group-hover:text-neon-purple",
};

const PLATFORM_BADGE: Record<Product["platform"], string> = {
  STEAM: "bg-black/80",
  "TOP-UP": "bg-black/80 text-neon-cyan",
};

export function ProductCard({ product }: { product: Product }) {
  const cardClassName = `bg-card-dark border border-border-dark rounded-xl overflow-hidden transition-all group block ${ACCENT_HOVER[product.accent]}`;

  const content = (
    <>
      <div className="aspect-[3/4] bg-border-dark relative overflow-hidden">
        <Image
          src={product.image}
          alt={product.title}
          fill
          className={`${product.imageContain ? "object-contain p-8" : "object-cover"} group-hover:scale-105 transition-transform duration-500 z-0`}
        />
        <div className={`absolute inset-0 bg-gradient-to-t from-card-dark via-transparent ${product.imageContain ? "to-card-dark/50" : "to-transparent"} z-10`} />
        <div className="absolute bottom-2 left-2 z-20 flex gap-1">
          <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${PLATFORM_BADGE[product.platform]}`}>
            {product.platform}
          </span>
        </div>
      </div>
      <div className="p-3">
        <h3 className={`font-bold text-sm mb-2 truncate transition-colors ${ACCENT_HOVER[product.accent]}`}>
          {product.title}
        </h3>
        <div className="flex items-center gap-2">
          <span className={`${product.badgeClass} font-black text-xs px-1.5 py-0.5 rounded`}>
            {product.badge}
          </span>
          <span className="font-bold">{product.price}</span>
        </div>
        {product.originalPrice && (
          <div className="text-xs text-gray-500 line-through mt-0.5">{product.originalPrice}</div>
        )}
        {product.meta && <div className="text-[10px] text-green-400 mt-1">{product.meta}</div>}
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
