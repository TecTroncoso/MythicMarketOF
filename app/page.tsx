import { HomeNavbar } from "@/components/home/HomeNavbar";
import { CategoryBar } from "@/components/home/CategoryBar";
import { HomeSidebar } from "@/components/home/HomeSidebar";
import { HeroBanner } from "@/components/home/HeroBanner";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { BestSellers } from "@/components/home/BestSellers";
import { TrustBanner } from "@/components/home/TrustBanner";

export default function Home() {
  return (
    <main className="min-h-screen text-white font-sans selection:bg-neon-pink selection:text-white pb-20 overflow-x-hidden relative z-10">
      <HomeNavbar />
      <CategoryBar />

      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
        <HomeSidebar />

        <div className="lg:col-span-3 space-y-8 z-1">
          <HeroBanner />
          <CategoryGrid />
          <BestSellers />
       </div>
   </div>

      <TrustBanner />
 </main>
  );
}
