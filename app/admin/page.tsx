import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { Navbar } from "@/components/Navbar";
import { AdminOrdersPanel } from "@/components/admin/AdminOrdersPanel";
import { getAdminOrders, sanitizeAdminFilters } from "@/lib/admin-orders";

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
    <main className="min-h-screen bg-[#0a0f1a] text-white font-sans pb-20">
      <Navbar session={session} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2 flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-[#ffaa00]" />
            Panel de Administración
          </h1>
          <p className="text-gray-400">Todas las compras de los usuarios</p>
        </header>

        <AdminOrdersPanel
          initialOrders={orders}
          initialStats={stats}
          initialFilters={filters}
        />
      </div>
    </main>
  );
}
