import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CircleDollarSign, PackageOpen } from "lucide-react";
import { auth } from "@/auth";
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
      <td className="px-3 py-3 text-right text-emerald-400 font-semibold bg-emerald-500/[0.05]">
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
      <td className="px-3 py-3 text-right text-emerald-400 font-semibold bg-emerald-500/[0.05]">
        <PriceCell
          cents={row.checkoutEurCents === null ? null : applyMarkupCents(row.checkoutEurCents, markup.markupEur)}
          currency="EUR"
        />
      </td>
    </>
  );
}

function CornerFrame() {
  const base = "pointer-events-none absolute w-5 h-5 border-purple-500/60";
  return (
    <>
      <span className={`${base} top-0 left-0 border-t-2 border-l-2 rounded-tl-lg`} />
      <span className={`${base} top-0 right-0 border-t-2 border-r-2 rounded-tr-lg`} />
      <span className={`${base} bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg`} />
      <span className={`${base} bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg`} />
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
    <>
      {/* Hero estilo maqueta */}
      <header
        className="relative overflow-hidden rounded-2xl border border-purple-900/40 mb-8 px-6 py-6 md:py-8"
        style={{
          background:
            "radial-gradient(1200px 300px at 70% -10%, rgba(168,85,247,0.28), transparent), radial-gradient(700px 260px at 20% 110%, rgba(217,70,239,0.18), transparent), #0a0520",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <span className="relative w-14 h-14 md:w-16 md:h-16 rounded-2xl overflow-hidden border border-purple-400/40 shadow-[0_0_24px_rgba(168,85,247,0.35)] shrink-0">
              <Image src={game.image} alt={game.name} fill className="object-cover" sizes="64px" />
            </span>
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <Link
                  href="/admin/precios"
                  className="inline-flex items-center gap-1 hover:text-fuchsia-300 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Todos los juegos
                </Link>
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                Precios{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-400">
                  {game.shortName}
                </span>
              </h1>
              {latest ? (
                <p className="text-gray-400 mt-1 text-sm">
                  Última actualización:{" "}
                  {new Intl.DateTimeFormat("es-AR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(latest.snapshot.scrapedAt)}
                  {latest.snapshot.provider && ` · ${latest.snapshot.provider}`}
                  {latest.snapshot.region && ` · Región ${latest.snapshot.region}`}
                </p>
              ) : (
                <p className="text-gray-400 mt-1 text-sm">
                  Costos de proveedor de {game.name} por paquete y moneda
                </p>
              )}
            </div>
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
        <div className="relative rounded-xl border border-purple-900/40 bg-[#0d0824]/80 py-20 flex flex-col items-center text-center gap-4">
          <CornerFrame />
          <span className="w-16 h-16 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_24px_rgba(34,211,238,0.25)]">
            <PackageOpen className="w-8 h-8 text-cyan-400" />
          </span>
          <div>
            <p className="text-gray-300 font-semibold mb-1">
              Todavía no hay precios importados para {game.shortName}.
            </p>
            <p className="text-sm text-gray-500">
              {scraper
                ? 'Usa el botón "Actualizar precios ahora" para lanzar el scraper desde aquí.'
                : "Este juego todavía no tiene scraper configurado en lib/scrapers.ts."}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-purple-900/40 bg-[#0d0824]/80 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-purple-900/40 text-gray-500 uppercase text-[11px] tracking-widest">
                  <th rowSpan={2} className="px-4 py-3 text-left align-bottom">
                    Paquete
                  </th>
                  <th colSpan={2} className="px-3 py-2 text-center border-l border-purple-900/40">
                    BRL
                  </th>
                  <th colSpan={3} className="px-3 py-2 text-center border-l border-purple-900/40">
                    USD
                  </th>
                  <th colSpan={3} className="px-3 py-2 text-center border-l border-purple-900/40">
                    EUR
                  </th>
                  <th rowSpan={2} className="px-4 py-3 text-center align-bottom">
                    Markup %
                  </th>
                  <th rowSpan={2} className="px-4 py-3 text-right align-bottom">
                    Cashback
                  </th>
                </tr>
                <tr className="border-b border-purple-900/40 text-gray-600 text-[10px] uppercase tracking-wider">
                  <th className="px-3 py-2 text-right border-l border-purple-900/40">Cat.</th>
                  <th className="px-3 py-2 text-right">Chk.</th>
                  <th className="px-3 py-2 text-right border-l border-purple-900/40">Cat.</th>
                  <th className="px-3 py-2 text-right">Chk.</th>
                  <th className="px-3 py-2 text-right text-emerald-500/80 bg-emerald-500/[0.05]">Venta</th>
                  <th className="px-3 py-2 text-right border-l border-purple-900/40">Cat.</th>
                  <th className="px-3 py-2 text-right">Chk.</th>
                  <th className="px-3 py-2 text-right text-emerald-500/80 bg-emerald-500/[0.05]">Venta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-900/20">
                {latest.rows.map((row) => {
                  const itemKey = slugifyPackageName(row.packageName);
                  const rowMarkup = itemMarkupFor(itemKey, itemMarkups);
                  return (
                    <tr key={row.id} className="hover:bg-purple-500/[0.04] transition-colors">
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
                      <td className="px-4 py-3 text-right text-fuchsia-300 font-semibold">
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
          <p className="px-4 py-3 text-xs text-gray-600 border-t border-purple-900/40">
            Cat. = precio de lista en el proveedor · Chk. = total real en
            checkout · Venta = Chk. × (1 + markup del item) — el precio que ve
            el comprador en la tienda (USD en LATAM, EUR en Europa). Sin markup
            propio el item se vende a costo.
            {scraper
              ? ` Scraper: ${scraper.description} (corre en esta máquina vía el botón de arriba).`
              : " Este juego aún no tiene scraper automatizado."}
          </p>
        </div>
      )}
    </>
  );
}
