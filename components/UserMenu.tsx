"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { LogOut, ShieldCheck, User } from 'lucide-react';
import type { Session } from 'next-auth';
import { signOutAction } from '@/lib/actions/auth';

export function UserMenu({ initialSession }: { initialSession?: Session | null }) {
  const [session, setSession] = useState<Session | null>(initialSession ?? null);

  useEffect(() => {
    // When no session was passed from the server, resolve it once on the
    // client. An explicit prop (including null) skips the fetch.
    if (initialSession === undefined) {
      const controller = new AbortController();
      (async () => {
        try {
          const res = await fetch("/api/auth/session", { signal: controller.signal });
          const data = (await res.json()) as { user?: unknown } | null;
          if (data?.user) {
            setSession(data as Session);
          }
        } catch {
          // Stay logged-out on failure.
        }
      })();
      return () => controller.abort();
    }
  }, [initialSession]);

  if (session?.user) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          title="Mis compras"
          className="hidden sm:flex items-center gap-2 bg-[#1c2534] px-3 py-1.5 rounded-lg border border-[#2a3441] hover:border-[#ffaa00]/50 hover:bg-[#232e41] transition-colors"
        >
          {session.user.image ? (
            <Image src={session.user.image} alt="User" width={24} height={24} className="rounded-full" />
          ) : (
            <User className="w-4 h-4 text-gray-400" />
          )}
          <span className="text-sm font-medium text-gray-200">{session.user.name?.split(" ")[0] || "Usuario"}</span>
        </Link>
        {session.user.role === "admin" && (
          <Link
            href="/admin"
            title="Panel de administración"
            className="hidden sm:flex items-center gap-2 bg-[#1c2534] px-3 py-1.5 rounded-lg border border-[#2a3441] hover:border-[#ffaa00]/50 hover:bg-[#232e41] transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-[#ffaa00]" />
            <span className="text-sm font-medium text-gray-200">Admin</span>
          </Link>
        )}
        <form action={signOutAction}>
          <button
            type="submit"
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
            title="Cerrar Sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </form>
      </div>
    );
  }

  return (
    <Link href="/login" className="text-sm font-semibold bg-[#2a3441] hover:bg-[#344050] px-4 py-2 rounded-lg transition-all text-white">
      Iniciar Sesión
    </Link>
  );
}