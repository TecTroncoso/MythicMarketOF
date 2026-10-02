import Link from "next/link";
import { redirect } from "next/navigation";
import { eq, desc, count } from "drizzle-orm";
import { ChevronLeft, ChevronRight, PackageOpen, Receipt, FileDown } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { formatAmount, ORDER_STATUS_LABELS } from "@/lib/orders";
import { Navbar } from "@/components/Navbar";

export const metadata = {
  title: "Mis compras | Mythic Market",
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/40",
  paid: "bg-green-500/10 text-green-400 border-green-500/40",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/40",
};

const PAGE_SIZE = 20;

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/** Parses ?page=N defensively (garbage, negatives, floats) -> >= 1. */
function parsePage(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const sp = await searchParams;
  const page = parsePage(sp.page);

  // Count + page fetch run in parallel; the (userId, createdAt) index serves
  // both the WHERE and the ORDER BY, so no rows shift under pagination.
  const [countRows, pageOrders] = await Promise.all([
    db.select({ total: count() }).from(orders).where(eq(orders.userId, session.user.id)),
    db.query.orders.findMany({
      where: eq(orders.userId, session.user.id),
      orderBy: desc(orders.createdAt),
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
  ]);

  const total = countRows[0]?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Out-of-range ?page=N (stale bookmark, deleted orders): bounce to last page.
  if (total > 0 && page > totalPages) {
    redirect(`/dashboard?page=${totalPages}`);
  }

  const firstShown = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastShown = (page - 1) * PAGE_SIZE + pageOrders.length;

  return (
    <main className="min-h-screen bg-[#0a0f1a] text-white font-sans pb-20">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2 flex items-center gap-3">
            <Receipt className="w-8 h-8 text-[#ffaa00]" />
            Mis compras
          </h1>
          <p className="text-gray-400">{session.user.email}</p>
        </header>

        {total === 0 ? (
          <div className="bg-[#121824] rounded-2xl p-10 border border-[#1c2534] shadow-xl flex flex-col items-center text-center gap-4">
            <PackageOpen className="w-12 h-12 text-gray-600" />
            <p className="text-gray-400 font-medium">Todavía no tenés compras.</p>
            <Link
              href="/"
              className="text-sm font-semibold bg-[#ffaa00] hover:bg-[#ffbf33] text-black px-5 py-2.5 rounded-xl transition-all"
            >
              Ir a la tienda
            </Link>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-4">
              Mostrando {firstShown}–{lastShown} de {total}{" "}
              {total === 1 ? "compra" : "compras"}
            </p>

            <ul className="space-y-4">
              {pageOrders.map((order) => (
              <li
                key={order.id}
                className="bg-[#121824] rounded-2xl p-6 border border-[#1c2534] shadow-xl"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <span className="font-mono text-sm text-[#ffaa00] bg-[#0a0f1a] border border-[#2a3441] px-2.5 py-1 rounded-lg">
                        {order.orderNumber}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                          STATUS_BADGE_STYLES[order.status] ?? "bg-gray-500/10 text-gray-400 border-gray-500/40"
                        }`}
                      >
                        {ORDER_STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold">{order.productName}</h2>
                    <p className="text-sm text-gray-400 mt-1">
                      User ID <span className="font-mono text-gray-300">{order.mlbbUserId}</span>{" "}
                      (Zona <span className="font-mono text-gray-300">{order.zoneId}</span>)
                    </p>
                    <p className="text-xs text-gray-500 mt-2">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <span className="text-xl font-black text-[#ffaa00]">
                      {formatAmount(order.amountCents, order.currency)}
                    </span>
                    <a
                      href={`/api/orders/${order.id}/invoice`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-semibold bg-[#1c2534] hover:bg-[#2a3441] border border-[#2a3441] px-4 py-2 rounded-xl transition-all"
                    >
                      <FileDown className="w-4 h-4" />
                      Ver factura (PDF)
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav
              aria-label="Paginación de compras"
              className="mt-8 flex items-center justify-between gap-4 bg-[#121824] border border-[#1c2534] rounded-2xl px-4 py-3"
            >
              <Link
                href={`/dashboard?page=${page - 1}`}
                aria-disabled={page === 1}
                className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-lg transition-colors ${
                  page === 1
                    ? "text-gray-600 pointer-events-none"
                    : "text-gray-300 hover:text-[#ffaa00] hover:bg-[#1c2534]"
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </Link>

              <span className="text-sm text-gray-400">
                Página <span className="text-white font-bold">{page}</span> de {totalPages}
              </span>

              <Link
                href={`/dashboard?page=${page + 1}`}
                aria-disabled={page === totalPages}
                className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-lg transition-colors ${
                  page === totalPages
                    ? "text-gray-600 pointer-events-none"
                    : "text-gray-300 hover:text-[#ffaa00] hover:bg-[#1c2534]"
                }`}
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </Link>
            </nav>
          )}
        </>
      )}
      </div>
    </main>
  );
}