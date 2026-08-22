import Link from 'next/link';
import type { Session } from 'next-auth';
import { Search, Heart, ShoppingCart, ChevronDown, Globe, Menu } from 'lucide-react';
import { UserMenu } from './UserMenu';
import { BrandLogo } from './BrandLogo';

// Enlaces rápidos de la sub-barra de categorías.
const QUICK_LINKS: { label: string; href?: string; badge?: string }[] = [
  { label: 'Juegos', badge: '-90%' },
  { label: 'Software' },
  { label: 'Tarjetas de Regalo' },
  { label: 'Gift Cards Mythic' },
  { label: 'Mobile Legends', href: '/topup/mlbb' },
  { label: 'VPN' },
  { label: 'GTA 6' },
];

export function Navbar({ session }: { session?: Session | null }) {
  return (
    <header className="sticky top-0 z-50">
      {/* ============ NAVBAR 1: BARRA PRINCIPAL SUPERIOR ============ */}
      <div className="bg-[#070417] border-b border-purple-950/50 px-4 lg:px-8 py-3 flex items-center justify-between gap-4 backdrop-blur-md">
        {/* Marca / Logo */}
        <BrandLogo size="sm" />

        {/* Buscador ancho (centro) */}
        <div className="flex-1 max-w-xl hidden md:flex items-center relative">
          <Search className="absolute left-3 text-slate-400 h-4 w-4 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar juegos, recargas, tarjetas..."
            className="w-full bg-[#120c2e] border border-purple-500/25 focus:border-purple-500/80 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-400 outline-none transition-all shadow-inner"
          />
        </div>

        {/* Acciones y usuario */}
        <div className="flex items-center gap-4 text-slate-300">
          {/* Selector de moneda/idioma */}
          <button className="hidden sm:flex items-center gap-1.5 text-xs font-semibold hover:text-white cursor-pointer px-2 py-1">
            <Globe className="w-3.5 h-3.5" />
            Español | USD
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>

          {/* Favoritos */}
          <button className="p-2 hover:text-purple-400 transition-colors cursor-pointer" aria-label="Favoritos">
            <Heart className="w-5 h-5" />
          </button>

          {/* Carrito */}
          <button className="p-2 hover:text-purple-400 transition-colors cursor-pointer relative" aria-label="Carrito">
            <ShoppingCart className="w-5 h-5" />
          </button>

          {/* Perfil de usuario / Iniciar sesión (autenticación existente) */}
          <UserMenu initialSession={session} />
        </div>
      </div>

      {/* ============ NAVBAR 2: BARRA DE CATEGORÍAS Y OFERTAS ============ */}
      <div className="bg-[#0a0520] border-b border-purple-900/30 px-4 lg:px-8 py-2 flex items-center justify-between text-xs font-semibold text-slate-300">
        {/* Menú de categorías */}
        <button className="flex items-center gap-2 hover:text-white cursor-pointer shrink-0">
          <Menu className="w-4 h-4" />
          Categorías
        </button>

        {/* Enlaces rápidos */}
        <nav className="hidden md:flex items-center gap-6">
          {QUICK_LINKS.map((link) =>
            link.href ? (
              <Link
                key={link.label}
                href={link.href}
                className="hover:text-purple-400 transition-colors cursor-pointer"
              >
                {link.label}
              </Link>
            ) : (
              <span
                key={link.label}
                className="hover:text-purple-400 transition-colors cursor-pointer flex items-center gap-1"
              >
                {link.label}
                {link.badge && (
                  <span className="text-[10px] font-extrabold text-rose-400">{link.badge}</span>
                )}
              </span>
            ),
          )}
        </nav>

        {/* Badge de ofertas */}
        <button className="shrink-0 bg-gradient-to-r from-rose-600 to-pink-600 text-white font-extrabold text-[11px] uppercase px-3 py-0.5 rounded-full shadow-[0_0_10px_rgba(225,29,72,0.4)] hover:brightness-110 cursor-pointer">
          Ofertas
        </button>
      </div>
    </header>
  );
}