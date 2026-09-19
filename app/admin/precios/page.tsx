import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ChevronRight, CircleDollarSign } from "lucide-react";
import { auth } from "@/auth";
import { Navbar } from "@/components/Navbar";
import { SUPPLIER_GAMES } from "@/lib/supplier-games";
import { getScraperForGame } from "@/lib/scrapers";
import { getSupplierGamesOverview } from "@/lib/supplier-prices";

export const metadata = {
  title: "Precios por juego | Mythic Market",
};

export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function AdminPricesIndexPage() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    redirect("/");
  }

  const overview = await getSupplierGamesOverview();
  const overviewByGame = new Map(overview.map((entry) => [entry.game, entry]));

  return (
    <main className="min-h-screen bg-[#0a0f1a] text-white font-sans pb-20">
      <Navbar session={session} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <header className="mb-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#ffaa00] transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al panel
          </Link>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2 flex items-center gap-3">
            <CircleDollarSign className="w-8 h-8 text-[#ffaa00]" />
            Precios proveedor
          </h1>
          <p className="text-gray-400">
            Costos de proveedor por juego. Selecciona uno para ver su lista de
            precios o lanzar su scraper.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SUPPLIER_GAMES.map((game) => {
            const entry = overviewByGame.get(game.id);
            const hasScraper = Boolean(getScraperForGame(game.id));
            return (
              <Link
                key={game.id}
                href={`/admin/precios/${game.id}`}
                className="group bg-[#121824] border border-[#1c2534] rounded-2xl p-5 hover:border-[#ffaa00]/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-[#0a0f1a] border border-[#1c2534] shrink-0">
                    <Image
                      src={game.image}
                      alt={game.name}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-gray-100 truncate group-hover:text-[#ffaa00] transition-colors">
                      {game.name}
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      {entry
                        ? `Actualizado: ${formatDate(entry.lastScrapedAt)}`
                        : "Sin datos importados"}
                    </p>
                    <span
                      className={`inline-block mt-2 text-[10px] font-bold uppercase tracking-wider rounded-full border px-2 py-0.5 ${
                        hasScraper
                          ? "border-green-500/40 text-green-400"
                          : "border-gray-600 text-gray-500"
                      }`}
                    >
                      {hasScraper ? "Scraper disponible" : "Sin scraper"}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-[#ffaa00] transition-colors shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>

        {SUPPLIER_GAMES.length === 0 && (
          <p className="text-gray-500">
            No hay juegos registrados en <code>lib/supplier-games.ts</code>.
          </p>
        )}
      </div>
    </main>
  );
}
