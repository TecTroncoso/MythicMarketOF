import Link from "next/link";
import { redirect } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { PackageOpen, Receipt, FileDown } from "lucide-react";
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

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const userOrders = await db.query.orders.findMany({
    where: eq(orders.userId, session.user.id),
    orderBy: desc(orders.createdAt),
  });

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

        {userOrders.length === 0 ? (
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
          <ul className="space-y-4">
            {userOrders.map((order) => (
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
        )}
      </div>
    </main>
  );
}