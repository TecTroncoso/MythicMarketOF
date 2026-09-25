import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleDollarSign, ShieldCheck, Zap } from "lucide-react";
import { auth } from "@/auth";
import { AdminOrdersPanel } from "@/components/admin/AdminOrdersPanel";
import { getAdminOrders, sanitizeAdminFilters } from "@/lib/admin-orders";
import { TRUST_ITEMS } from "@/lib/home-data";

export const metadata = {
  title: "Panel de Administración | Mythic Market",
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    redirect("/");
  }

  const sp = await searchParams;
  const filters = sanitizeAdminFilters(sp);
  const { orders, stats } = await getAdminOrders(filters);

  return (
    <>
      {/* Hero del panel (modal visual de la maqueta) */}
      <header
        className="relative overflow-hidden rounded-2xl border border-purple-900/40 mb-8 px-6 py-6 md:py-8"
        style={{
          background:
            "radial-gradient(1200px 300px at 70% -10%, rgba(168,85,247,0.28), transparent), radial-gradient(700px 260px at 20% 110%, rgba(217,70,239,0.18), transparent), #0a0520",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <span className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-purple-600/25 border border-purple-400/40 flex items-center justify-center shadow-[0_0_24px_rgba(168,85,247,0.35)]">
              <ShieldCheck className="w-8 h-8 text-fuchsia-300" />
            </span>
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                Panel de{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-400">
                  Administración
                </span>
              </h1>
              <p className="text-gray-400 mt-1">Todas las compras de los usuarios</p>
            </div>
          </div>
          <Link
            href="/admin/precios"
            className="inline-flex items-center gap-2 bg-fuchsia-600/15 border border-fuchsia-500/50 hover:bg-fuchsia-600/25 hover:border-fuchsia-400 text-fuchsia-200 rounded-xl px-5 py-3 text-sm font-bold transition-all shadow-[0_0_18px_rgba(217,70,239,0.25)]"
          >
            <CircleDollarSign className="w-4 h-4" />
            Precios proveedor
          </Link>
        </div>
      </header>

      <AdminOrdersPanel
        initialOrders={orders}
        initialStats={stats}
        initialFilters={filters}
      />

      {/* Trust strip + cierre de marca (estilo maqueta) */}
      <footer className="mt-10 rounded-2xl border border-purple-900/40 bg-[#0a0520] px-6 py-5 flex flex-wrap items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
          {TRUST_ITEMS.map((item) => (
            <div key={item.title} className="flex items-center gap-3">
              <item.icon className="w-6 h-6 text-fuchsia-400" />
              <div>
                <p className="text-[11px] font-black tracking-wide text-white uppercase leading-tight">
                  {item.title}
                </p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide leading-tight">
                  {item.subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-fuchsia-500/50 bg-fuchsia-600/15 px-5 py-3 shadow-[0_0_18px_rgba(217,70,239,0.25)]">
          <Zap className="w-6 h-6 text-fuchsia-400" />
          <div className="text-right">
            <p className="text-sm font-black text-fuchsia-300 tracking-wide">GAME ON.</p>
            <p className="text-[11px] font-bold text-white tracking-widest">AHORRA MÁS.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
