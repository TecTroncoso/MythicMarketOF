import Image from "next/image";
import Link from "next/link";

const SIZES = {
  sm: { box: "w-10 h-10", px: 40, text: "text-xl" },
  md: { box: "w-12 h-12", px: 48, text: "text-2xl" },
} as const;

export type BrandLogoSize = keyof typeof SIZES;

export function BrandLogo({ size = "md" }: { size?: BrandLogoSize }) {
  const s = SIZES[size];
  return (
    <Link href="/" className="inline-flex items-center gap-3 group self-center">
      <div
        className={`${s.box} relative overflow-hidden rounded-xl flex items-center justify-center shadow-lg transform group-hover:rotate-12 transition-transform shrink-0`}
      >
        <Image
          src="/logo.png"
          alt="Mythic Market"
          width={s.px}
          height={s.px}
          priority
          className="object-cover w-full h-full"
        />
      </div>
      <span
        className={`${s.text} font-bold tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300`}
      >
        Mythic Market
      </span>
    </Link>
  );
}
