"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { register } from "@/lib/actions/auth";
import { Turnstile } from "@marsidev/react-turnstile";
import { BrandLogo } from "@/components/BrandLogo";
import { AuthCard } from "@/components/AuthCard";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await register(formData);
      if (res.error) {
        setError(res.error);
        setLoading(false);
      } else if (res.success) {
        router.push("/login");
      }
    } catch {
      setError("Algo salió mal. Por favor intenta de nuevo.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0f1a] text-white selection:bg-[#ffaa00] selection:text-black">
      <div className="sticky top-0 z-50 bg-[#121824]/90 backdrop-blur-md border-b border-[#2a3441] shadow-2xl">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center">
          <BrandLogo size="sm" />
        </div>
      </div>
      <div className="flex flex-col items-center justify-center p-4 pt-12">
        <div className="mb-8">
          <BrandLogo size="md" />
        </div>

      <AuthCard title="Crear Cuenta">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-500 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-400 block">Nombre Completo</label>
            <input
              type="text"
              name="name"
              autoComplete="name"
              required
              disabled={loading}
              className="w-full bg-[#0a0f1a] border border-[#2a3441] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#ffaa00] focus:ring-1 focus:ring-[#ffaa00] transition-all disabled:opacity-60"
              placeholder="Juan Pérez"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-400 block">Correo Electrónico</label>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              disabled={loading}
              className="w-full bg-[#0a0f1a] border border-[#2a3441] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#ffaa00] focus:ring-1 focus:ring-[#ffaa00] transition-all disabled:opacity-60"
              placeholder="tu@correo.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-400 block">Contraseña</label>
              <input
                type="password"
                name="password"
                autoComplete="new-password"
                required
                disabled={loading}
                className="w-full bg-[#0a0f1a] border border-[#2a3441] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#ffaa00] focus:ring-1 focus:ring-[#ffaa00] transition-all disabled:opacity-60"
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-400 block">Confirmar</label>
              <input
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                required
                disabled={loading}
                className="w-full bg-[#0a0f1a] border border-[#2a3441] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#ffaa00] focus:ring-1 focus:ring-[#ffaa00] transition-all disabled:opacity-60"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex justify-center pt-2">
            <Turnstile siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'} />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#ffaa00] to-[#ff5d00] hover:from-[#ffbf33] hover:to-[#ff7b33] text-black font-black text-lg py-3 rounded-xl shadow-[0_0_20px_rgba(255,170,0,0.4)] transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none mt-2"
          >
            {loading ? "Registrando..." : "Registrarse"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#2a3441]"></div>
          <span className="text-sm text-gray-500 font-medium">O regístrate con</span>
          <div className="h-px flex-1 bg-[#2a3441]"></div>
        </div>

        <GoogleSignInButton />

        <div className="mt-6 pt-6 border-t border-[#2a3441] text-center">
          <p className="text-gray-400 text-sm">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-[#ffaa00] font-semibold hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </AuthCard>
      </div>
    </main>
  );
}
