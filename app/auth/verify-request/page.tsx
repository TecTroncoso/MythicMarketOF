import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Revisá tu correo | Mythic Market",
};

export default function VerifyRequestPage() {
  return (
    <main className="min-h-screen bg-[#070514] text-white flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 mix-blend-screen"
        style={{ backgroundImage: "url('/images/bg.webp')" }}
      />
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-fuchsia-600/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-[480px] bg-[#05030f]/80 backdrop-blur-xl rounded-[20px] p-8 md:p-10 border border-[#9333ea]/40 shadow-[0_0_40px_rgba(147,51,234,0.15)] text-center">
        <MailCheck className="h-12 w-12 text-[#d946ef] mx-auto mb-5" />
        <h1 className="text-2xl font-black mb-3">Revisá tu correo</h1>
        <p className="text-sm text-[#b8b3d0] leading-relaxed mb-6">
          Te enviamos un enlace de acceso. Hacé clic en el botón para entrar.
          <br />
          El enlace vence en 10 minutos y solo puede usarse una vez.
        </p>
        <p className="text-xs text-gray-500 mb-6">
          ¿No lo ves? Revisá la carpeta de spam o promociones.
        </p>
        <Link
          href="/login"
          className="inline-block w-full bg-[#4c1d95]/80 border border-[#7c3aed] hover:bg-[#5b21b6] text-white font-bold text-[13px] uppercase tracking-wide py-3.5 rounded-lg transition-all"
        >
          Volver al login
        </Link>
      </div>
    </main>
  );
}
