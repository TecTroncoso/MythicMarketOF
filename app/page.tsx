import { HomeNavbar } from "@/components/home/HomeNavbar";
import { CategoryBar } from "@/components/home/CategoryBar";
import { HomeSidebar } from "@/components/home/HomeSidebar";
import { HeroBanner } from "@/components/home/HeroBanner";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { BestSellers } from "@/components/home/BestSellers";
import { TrustBanner } from "@/components/home/TrustBanner";

export default function Home() {
  return (
    <main className="min-h-screen text-white font-sans selection:bg-neon-pink selection:text-white pb-4 overflow-x-hidden relative z-10">
      <HomeNavbar />
      <CategoryBar />

      {/* Contenedor unificado: mismo ancho para juegos, más vendidos y footer */}
      <div className="w-full max-w-[1400px] mx-auto px-4">
        {/* Zona superior: sidebar + hero + categorías */}
        <div className="pt-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
          <HomeSidebar />

          <div className="lg:col-span-3 space-y-6 z-1">
            <HeroBanner />
            <CategoryGrid />
          </div>
        </div>

        {/* Más vendidos a lo ancho completo del contenedor */}
        <BestSellers />

        {/* Footer de confianza anclado al final con separación controlada */}
        <div className="mt-6 pb-4">
          <TrustBanner />
        </div>
      </div>
    </main>
  );
}