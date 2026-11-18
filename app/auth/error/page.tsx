import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { authErrorMessage } from "@/lib/auth-errors";

export const metadata: Metadata = {
  title: "Error de acceso | Mythic Market",
};

interface AuthErrorPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function AuthErrorPage({
  searchParams,
}: AuthErrorPageProps) {
  const { error } = await searchParams;
  const message =
    authErrorMessage(error) ?? "Ocurrió un error al iniciar sesión.";

  return (
    <main className="min-h-screen bg-[#070514] text-white flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 mix-blend-screen"
        style={{ backgroundImage: "url('/images/bg.webp')" }}
      />
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-fuchsia-600/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-[480px] bg-[#05030f]/80 backdrop-blur-xl rounded-[20px] p-8 md:p-10 border border-red-500/40 shadow-[0_0_40px_rgba(239,68,68,0.12)] text-center">
        <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-5" />
        <h1 className="text-2xl font-black mb-3">No pudimos entrar</h1>
        <p className="text-sm text-[#b8b3d0] leading-relaxed mb-6">{message}</p>

        <div className="flex flex-col gap-3">
          <Link
            href="/login"
            className="inline-block w-full bg-[#4c1d95]/80 border border-[#7c3aed] hover:bg-[#5b21b6] text-white font-bold text-[13px] uppercase tracking-wide py-3.5 rounded-lg transition-all"
          >
            Intentar de nuevo
          </Link>
          <Link
            href="/login?mode=email"
            className="inline-block w-full bg-[#0b0c10] border border-[#2a1b41] hover:border-[#9333ea] text-white text-[12px] font-bold py-3 rounded-lg transition-all"
          >
            Entrar con un enlace por email
          </Link>
        </div>
      </div>
    </main>
  );
}
