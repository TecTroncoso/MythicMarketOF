import Link from "next/link";
import { Search, Heart, ShoppingCart, User } from "lucide-react";

export function HomeNavbar() {
  return (
    <nav className="border-b border-border-dark bg-bg-dark/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-6">
        <Logo />
        <SearchBar />
        <Actions />
    </div>
  </nav>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-pink via-neon-cyan to-neon-purple flex items-center justify-center p-0.5 shadow-[0_0_15px_rgba(255,0,255,0.4)]">
        <div className="w-full h-full bg-bg-dark rounded-full flex items-center justify-center">
          <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-pink to-neon-cyan text-xl">
            M
        </span>
      </div>
    </div>
      <span className="text-xl font-black tracking-tight text-white hidden sm:block">
        Mythic<span className="text-neon-pink">Market</span>
    </span>
  </div>
  );
}

function SearchBar() {
  return (
    <div className="flex-1 max-w-2xl hidden md:flex items-center bg-panel-dark border border-border-mid rounded-xl px-4 py-2.5 focus-within:border-neon-pink focus-within:shadow-[0_0_10px_rgba(255,0,255,0.3)] transition-all">
      <Search className="w-5 h-5 text-muted" />
      <input
        type="text"
        placeholder="Busca juegos, tarjetas regalo, DLC y más..."
        className="bg-transparent border-none outline-none w-full px-3 text-sm text-white placeholder-gray-500"
      />
  </div>
  );
}

function Actions() {
  return (
    <div className="flex items-center gap-4 sm:gap-6">
      <button className="hidden sm:flex items-center gap-2 text-muted hover:text-neon-pink transition-colors">
        <Heart className="w-5 h-5" />
        <span className="text-sm font-medium">Favoritos</span>
    </button>
      <button className="flex items-center gap-2 text-muted hover:text-neon-cyan transition-colors">
        <ShoppingCart className="w-5 h-5" />
        <span className="text-sm font-medium">Carrito</span>
    </button>
      <UserBadge />
  </div>
  );
}

function UserBadge() {
  return (
    <Link href="/login" className="flex items-center gap-3 pl-2 transition-all group">
      <div className="flex flex-col items-end">
        <span className="text-xs font-bold text-muted group-hover:text-white transition-colors">GamerX</span>
        <span className="text-[10px] text-muted">Nivel 42</span>
    </div>
      <div className="relative">
        <div className="w-9 h-9 rounded-full bg-panel-dark border border-border-mid overflow-hidden flex items-center justify-center shadow-[0_0_10px_rgba(255,0,255,0.2)] group-hover:border-neon-cyan transition-colors">
          <User className="w-5 h-5 text-muted group-hover:text-white" />
      </div>
        <div className="absolute -bottom-1 -right-1 bg-bg-dark border border-neon-cyan text-neon-cyan text-[8px] font-black px-1 py-0.5 rounded shadow-[0_0_5px_rgba(255,0,255,0.5)]">
          42
      </div>
    </div>
  </Link>
  );
}
