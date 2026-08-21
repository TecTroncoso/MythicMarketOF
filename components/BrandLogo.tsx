import Link from "next/link";
import { Gamepad2 } from "lucide-react";

const SIZES = {
  sm: { box: "w-10 h-10", icon: "w-6 h-6", text: "text-xl" },
  md: { box: "w-12 h-12", icon: "w-7 h-7", text: "text-2xl" },
} as const;

export type BrandLogoSize = keyof typeof SIZES;

export function BrandLogo({ size = "md" }: { size?: BrandLogoSize }) {
  const s = SIZES[size];
  return (
    <Link href="/" className="inline-flex items-center gap-3 group self-center">
      <div
        className={`${s.box} bg-gradient-to-tr from-[#ffaa00] to-[#ff5d00] rounded-xl flex items-center justify-center shadow-lg transform group-hover:rotate-12 transition-transform shrink-0`}
      >
        <Gamepad2 className={`text-white ${s.icon}`} />
      </div>
      <h1
        className={`${s.text} font-bold tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300`}
      >
        Mythic Market
      </h1>
    </Link>
  );
}
