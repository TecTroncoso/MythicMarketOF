import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingCart, User, LogOut } from "lucide-react";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { signOutAction } from "@/lib/actions/auth";
import { HomeSearchBar } from "./HomeSearchBar";

export async function HomeNavbar() {
  const session = await auth();
  return (
    <nav className="border-b border-border-dark bg-bg-dark/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-[1400px] mx-auto px-4 py-4 flex items-center justify-between gap-6">
        <Logo />
        <HomeSearchBar />
        <Actions session={session} />
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

function Actions({ session }: { session: Session | null }) {
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
      {session?.user ? <UserGreeting user={session.user} /> : <AuthLinks />}
  </div>
  );
}

function UserGreeting({ user }: { user: Session["user"] }) {
  const firstName = user?.name?.split(" ")[0] || "Usuario";
  return (
    <div className="flex items-center gap-3">
      <Link href="/dashboard" title="Mis compras" className="flex items-center gap-3 pl-2 group">
        <div className="w-9 h-9 rounded-full bg-panel-dark border border-border-mid overflow-hidden flex items-center justify-center shadow-[0_0_10px_rgba(255,0,255,0.2)] group-hover:border-neon-cyan transition-colors">
          {user?.image ? (
            <Image src={user.image} alt={firstName} width={36} height={36} className="w-full h-full object-cover" />
          ) : (
            <User className="w-5 h-5 text-muted group-hover:text-white transition-colors" />
          )}
        </div>
        <span className="text-xs font-bold text-muted group-hover:text-neon-cyan transition-colors">
          {firstName}
        </span>
      </Link>
      <form action={signOutAction}>
        <button
          type="submit"
          title="Cerrar sesión"
          className="p-2 text-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}

function AuthLinks() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-panel-dark border border-border-mid flex items-center justify-center shadow-[0_0_10px_rgba(255,0,255,0.2)]">
        <User className="w-5 h-5 text-muted" />
      </div>
      <div className="flex items-center gap-2 text-xs font-bold whitespace-nowrap">
        <Link href="/login" className="text-muted hover:text-neon-cyan transition-colors">
          Iniciar sesión
        </Link>
        <span className="text-muted/50 select-none">|</span>
        <Link href="/register" className="text-muted hover:text-neon-pink transition-colors">
          Registrarse
        </Link>
      </div>
    </div>
  );
}
