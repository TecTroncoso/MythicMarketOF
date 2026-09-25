import Link from "next/link";
import {
  Home,
  Package,
  Users,
  ShoppingCart,
  BarChart3,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

// Barra lateral del panel admin (estilo maqueta): navegación primaria oscura
// con item activo y tarjeta de marca al pie. Los enlaces sin pantalla real
// se muestran apagados (no navegan) hasta que existan.
const NAV_ITEMS: { label: string; icon: LucideIcon; href?: string; active?: boolean }[] = [
  { label: "Inicio", icon: Home, href: "/admin", active: true },
  { label: "Productos", icon: Package },
  { label: "Usuarios", icon: Users },
  { label: "Pedidos", icon: ShoppingCart, href: "/admin" },
  { label: "Reportes", icon: BarChart3 },
  { label: "Configuración", icon: Settings },
];

export function AdminSidebar() {
  return (
    <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-purple-900/30 bg-[#0a0520] px-3 py-5">
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ label, icon: Icon, href, active }) =>
          href ? (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? "bg-gradient-to-r from-purple-600/70 to-fuchsia-600/50 text-white shadow-[0_0_16px_rgba(168,85,247,0.25)]"
                  : "text-gray-400 hover:text-white hover:bg-purple-500/10"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ) : (
            <span
              key={label}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-600 cursor-not-allowed select-none"
              title="Próximamente"
            >
              <Icon className="w-4 h-4" />
              {label}
            </span>
          )
        )}
      </nav>

      <div className="mt-auto rounded-xl border border-purple-500/40 bg-[#120c2e] p-4 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-7 h-7 rounded-lg bg-purple-600/40 border border-purple-400/40 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-purple-300" />
          </span>
          <span className="text-sm font-black text-white">Mythic Market</span>
        </div>
        <p className="text-[11px] text-gray-400 leading-relaxed">
          Gestiona tu tienda, lleva el juego al siguiente nivel
        </p>
      </div>
    </aside>
  );
}
