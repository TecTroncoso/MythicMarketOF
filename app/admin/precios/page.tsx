import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, CircleDollarSign } from "lucide-react";
import { auth } from "@/auth";
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
    <>
      {/* Hero estilo maqueta */}
      <header
        className="relative overflow-hidden rounded-2xl border border-purple-900/40 mb-8 px-6 py-6 md:py-8"
        style={{
          background:
            "radial-gradient(1200px 300px at 70% -10%, rgba(168,85,247,0.28), transparent), radial-gradient(700px 260px at 20% 110%, rgba(217,70,239,0.18), transparent), #0a0520",
        }}
      >
        <div className="flex items-center gap-4">
          <span className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-purple-600/25 border border-purple-400/40 flex items-center justify-center shadow-[0_0_24px_rgba(168,85,247,0.35)]">
            <CircleDollarSign className="w-8 h-8 text-fuchsia-300" />
          </span>
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              Precios{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-400">
                proveedor
              </span>
            </h1>
            <p className="text-gray-400 mt-1">
              Costos de proveedor por juego. Selecciona uno para ver su lista de
              precios o lanzar su scraper.
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SUPPLIER_GAMES.map((game) => {
          const entry = overviewByGame.get(game.id);
          const hasScraper = Boolean(getScraperForGame(game.id));
          return (
            <Link
              key={game.id}
              href={`/admin/precios/${game.id}`}
              className="group bg-[#0d0824]/80 border border-purple-900/40 rounded-2xl p-5 hover:border-fuchsia-500/50 hover:shadow-[0_0_20px_rgba(217,70,239,0.2)] transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-[#070417] border border-purple-800/40 shrink-0">
                  <Image
                    src={game.image}
                    alt={game.name}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold text-gray-100 truncate group-hover:text-fuchsia-300 transition-colors">
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
                        ? "border-emerald-500/40 text-emerald-400"
                        : "border-gray-600 text-gray-500"
                    }`}
                  >
                    {hasScraper ? "Scraper disponible" : "Sin scraper"}
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-fuchsia-400 transition-colors shrink-0" />
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
    </>
  );
}
