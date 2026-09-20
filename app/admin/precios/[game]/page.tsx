import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CircleDollarSign } from "lucide-react";
import { auth } from "@/auth";
import { Navbar } from "@/components/Navbar";
import { ScrapePricesButton } from "@/components/admin/ScrapePricesButton";
import { getScraperForGame } from "@/lib/scrapers";
import { getSupplierGame } from "@/lib/supplier-games";
import { getLatestSupplierSnapshot } from "@/lib/supplier-prices";
import { getStoreCombos } from "@/lib/store-combos";
import { StoreCombosPanel } from "@/components/admin/StoreCombosPanel";
import { ItemMarkupEditor } from "@/components/admin/ItemMarkupEditor";
import { getItemMarkups, itemMarkupFor } from "@/lib/item-markups";
import { slugifyPackageName } from "@/lib/store-catalog";
import { applyMarkupCents } from "@/lib/markup";
import type { GamePricingSettings } from "@/lib/markup";
import { formatAmount } from "@/lib/orders";
import type { SupplierPriceRow } from "@/lib/db/schema";

// Always show the freshest snapshot; this list changes on every import.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ game: string }>;
}) {
  const game = getSupplierGame((await params).game);
  return { title: `Precios proveedor ${game?.shortName ?? ""} | Mythic Market` };
}

function PriceCell({ cents, currency }: { cents: number | null; currency: string }) {
  if (cents === null) {
    return <span className="text-gray-600">—</span>;
  }
  return <>{formatAmount(cents, currency)}</>;
}

function PriceCatalogGroup({
  row,
  markup,
}: {
  row: SupplierPriceRow;
  markup: GamePricingSettings;
}) {
  return (
    <>
      <td className="px-3 py-3 text-right text-gray-300">
        <PriceCell cents={row.catalogBrlCents} currency="BRL" />
      </td>
      <td className="px-3 py-3 text-right text-white font-semibold">
        <PriceCell cents={row.checkoutBrlCents} currency="BRL" />
      </td>
      <td className="px-3 py-3 text-right text-gray-300">
        <PriceCell cents={row.catalogUsdCents} currency="USD" />
      </td>
      <td className="px-3 py-3 text-right text-white font-semibold">
        <PriceCell cents={row.checkoutUsdCents} currency="USD" />
      </td>
      <td className="px-3 py-3 text-right text-[#7dd87d] font-semibold bg-green-500/[0.04]">
        <PriceCell
          cents={row.checkoutUsdCents === null ? null : applyMarkupCents(row.checkoutUsdCents, markup.markupUsd)}
          currency="USD"
        />
      </td>
      <td className="px-3 py-3 text-right text-gray-300">
        <PriceCell cents={row.catalogEurCents} currency="EUR" />
      </td>
      <td className="px-3 py-3 text-right text-white font-semibold">
        <PriceCell cents={row.checkoutEurCents} currency="EUR" />
      </td>
      <td className="px-3 py-3 text-right text-[#7dd87d] font-semibold bg-green-500/[0.04]">
        <PriceCell
          cents={row.checkoutEurCents === null ? null : applyMarkupCents(row.checkoutEurCents, markup.markupEur)}
          currency="EUR"
        />
      </td>
    </>
  );
}

export default async function AdminGamePricesPage({
  params,
}: {
  params: Promise<{ game: string }>;
}) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    redirect("/");
  }

  const gameId = (await params).game;
  const game = getSupplierGame(gameId);
  if (!game) {
    notFound();
  }

  const scraper = getScraperForGame(game.id);
  const [latest, combos, itemMarkups] = await Promise.all([
    getLatestSupplierSnapshot(game.id),
    getStoreCombos(game.id),
    getItemMarkups(game.id),
  ]);

  return (
    <main className="min-h-screen bg-[#0a0f1a] text-white font-sans pb-20">
      <Navbar session={session} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <header className="mb-8">
          <Link
            href="/admin/precios"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#ffaa00] transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Todos los juegos
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2 flex items-center gap-3">
                <CircleDollarSign className="w-8 h-8 text-[#ffaa00]" />
                Precios proveedor — {game.shortName}
              </h1>
              {latest ? (
                <p className="text-gray-400">
                  Última actualización:{" "}
                  {new Intl.DateTimeFormat("es-AR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(latest.snapshot.scrapedAt)}
                  {latest.snapshot.provider && ` · ${latest.snapshot.provider}`}
                  {latest.snapshot.region && ` · Región ${latest.snapshot.region}`}
                </p>
              ) : (
                <p className="text-gray-400">
                  Costos de proveedor de {game.name} por paquete y moneda
                </p>
              )}
            </div>
            {scraper && <ScrapePricesButton game={game.id} />}
          </div>
        </header>

        <StoreCombosPanel
          game={game.id}
          packages={(latest?.rows ?? []).map((row) => ({
            packageName: row.packageName,
            checkoutUsdCents: row.checkoutUsdCents,
            checkoutEurCents: row.checkoutEurCents,
          }))}
          combos={combos}
          itemMarkups={Object.fromEntries(itemMarkups)}
        />

        {!latest ? (
          <div className="bg-[#121824] border border-[#1c2534] rounded-2xl p-10 text-center">
            <p className="text-gray-300 font-semibold mb-2">
              Todavía no hay precios importados para {game.shortName}.
            </p>
            <p className="text-sm text-gray-500">
              {scraper
                ? 'Usa el botón "Actualizar precios ahora" para lanzar el scraper desde aquí.'
                : "Este juego todavía no tiene scraper configurado en lib/scrapers.ts."}
            </p>
          </div>
        ) : (
          <div className="bg-[#121824] border border-[#1c2534] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-[#1c2534] text-gray-500 uppercase text-xs tracking-wider">
                    <th rowSpan={2} className="px-4 py-3 text-left align-bottom">
                      Paquete
                    </th>
                    <th colSpan={2} className="px-3 py-2 text-center border-l border-[#1c2534]">
                      BRL
                    </th>
                    <th colSpan={3} className="px-3 py-2 text-center border-l border-[#1c2534]">
                      USD
                    </th>
                    <th colSpan={3} className="px-3 py-2 text-center border-l border-[#1c2534]">
                      EUR
                    </th>
                    <th rowSpan={2} className="px-4 py-3 text-center align-bottom">
                      Markup %
                    </th>
                    <th rowSpan={2} className="px-4 py-3 text-right align-bottom">
                      Cashback
                    </th>
                  </tr>
                  <tr className="border-b border-[#1c2534] text-gray-600 text-[11px] uppercase tracking-wider">
                    <th className="px-3 py-2 text-right border-l border-[#1c2534]">Cat.</th>
                    <th className="px-3 py-2 text-right">Chk.</th>
                    <th className="px-3 py-2 text-right border-l border-[#1c2534]">Cat.</th>
                    <th className="px-3 py-2 text-right">Chk.</th>
                    <th className="px-3 py-2 text-right text-green-500/80 bg-green-500/[0.04]">Venta</th>
                    <th className="px-3 py-2 text-right border-l border-[#1c2534]">Cat.</th>
                    <th className="px-3 py-2 text-right">Chk.</th>
                    <th className="px-3 py-2 text-right text-green-500/80 bg-green-500/[0.04]">Venta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1c2534]">
                  {latest.rows.map((row) => {
                    const itemKey = slugifyPackageName(row.packageName);
                    const rowMarkup = itemMarkupFor(itemKey, itemMarkups);
                    return (
                      <tr key={row.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 font-semibold text-gray-100">
                          {row.packageName}
                        </td>
                        <PriceCatalogGroup row={row} markup={rowMarkup} />
                        <td className="px-3 py-3">
                          <ItemMarkupEditor
                            game={game.id}
                            itemKey={itemKey}
                            markupUsd={rowMarkup.markupUsd}
                            markupEur={rowMarkup.markupEur}
                            hasOverride={itemMarkups.has(itemKey)}
                            compact
                          />
                        </td>
                        <td className="px-4 py-3 text-right text-[#ffaa00] font-semibold">
                          {row.cashbackPercent !== null
                            ? `${row.cashbackPercent}%`
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="px-4 py-3 text-xs text-gray-600 border-t border-[#1c2534]">
              Cat. = precio de lista en el proveedor · Chk. = total real en
              checkout · Venta = Chk. × (1 + markup del item) — el precio que ve
              el comprador en la tienda (USD en LATAM, EUR en Europa). El markup
              se edita por paquete; sin override usa el default del juego.
              {scraper
                ? ` Scraper: ${scraper.description} (corre en esta máquina vía el botón de arriba).`
                : " Este juego aún no tiene scraper automatizado."}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
