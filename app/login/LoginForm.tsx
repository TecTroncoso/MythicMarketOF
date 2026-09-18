"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/actions/auth";
import { Turnstile } from "@marsidev/react-turnstile";
import { Mail, Lock, Eye, ShieldCheck, Zap, Percent, HeadphonesIcon } from "lucide-react";
import { googleSignInAction } from "@/lib/actions/google-signin";

function SocialButton({
  icon,
  label,
  action,
}: {
  icon: React.ReactNode;
  label: string;
  action?: () => void;
}) {
  return (
    <button
      type={action ? "submit" : "button"}
      onClick={action ? undefined : (e) => e.preventDefault()}
      className="flex-1 bg-[#0b0c10] border border-[#2a1b41] hover:border-[#9333ea] text-white text-xs font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
    >
      {icon}
      {label}
    </button>
  );
}

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await login(formData);
      if (res?.error) {
        setError(res.error);
        setLoading(false);
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Algo salió mal. Por favor intenta de nuevo.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#070514] text-white flex flex-col relative overflow-hidden font-sans">
      {/* Background Image with Cyberpunk vibe */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 mix-blend-screen"
        style={{ backgroundImage: "url('/images/bg.png')" }}
      />
      
      {/* Neon glowing overlays for cyberpunk feel */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-fuchsia-600/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="flex-1 flex flex-col items-center justify-center p-4 z-10 w-full relative pt-12 pb-24">
        
        {/* Main Card */}
        <div 
          className="w-full max-w-[480px] bg-[#05030f]/80 backdrop-blur-xl rounded-[20px] p-8 md:p-10 relative overflow-hidden"
          style={{
            border: "1.5px solid rgba(147, 51, 234, 0.4)",
            boxShadow: "0 0 40px rgba(147, 51, 234, 0.15), inset 0 0 20px rgba(147, 51, 234, 0.05)"
          }}
        >
          {/* Card subtle glowing border effect */}
          <div className="absolute inset-0 border border-[#d946ef]/20 rounded-[20px] pointer-events-none" />

          {/* Logo Area */}
          <div className="flex justify-center items-center gap-3 mb-8">
            {/* Custom SVG logo resembling the reference (flame/shield shape) */}
            <svg width="42" height="42" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 10 C30 10, 10 30, 20 60 C30 90, 70 90, 80 60 C90 30, 70 10, 50 10 Z" fill="url(#paint0_linear)"/>
              <path d="M50 20 C65 20, 75 35, 70 55 C65 75, 35 75, 30 55 C25 35, 35 20, 50 20 Z" fill="url(#paint1_linear)"/>
              <defs>
                <linearGradient id="paint0_linear" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#fca5a5" />
                  <stop offset="1" stopColor="#d946ef" />
                </linearGradient>
                <linearGradient id="paint1_linear" x1="100" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#fde047" />
                  <stop offset="1" stopColor="#14b8a6" />
                </linearGradient>
              </defs>
            </svg>
            <h1 className="text-3xl font-black tracking-tight">MythicMarket</h1>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-xl font-bold mb-2">Bienvenido de vuelta, Gamer ⚡</h2>
            <p className="text-[#a1a1aa] text-sm">Inicia sesión y sigue ahorrando en tus juegos favoritos</p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-gray-300 block">Correo electrónico</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  disabled={loading}
                  className="w-full bg-[#0b0c10] border border-[#2a1b41] rounded-lg pl-11 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#9333ea] focus:ring-1 focus:ring-[#9333ea] transition-all disabled:opacity-60"
                  placeholder="ejemplo@correo.com"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-gray-300 block">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  className="w-full bg-[#0b0c10] border border-[#2a1b41] rounded-lg pl-11 pr-12 py-3 text-sm text-white placeholder-gray-500 tracking-widest focus:outline-none focus:border-[#9333ea] focus:ring-1 focus:ring-[#9333ea] transition-all disabled:opacity-60"
                  placeholder="••••••••••••"
                />
                <button type="button" className="absolute inset-y-0 right-0 pr-4 flex items-center">
                  <Eye className="h-4 w-4 text-gray-400 hover:text-white transition-colors" />
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Link href="#" className="text-[12px] text-[#d946ef] hover:text-[#f0abfc] transition-colors">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <div className="flex justify-center py-2">
              <Turnstile siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'} />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#4c1d95]/80 border border-[#7c3aed] hover:bg-[#5b21b6] text-white font-bold text-[13px] uppercase tracking-wide py-3.5 rounded-lg transition-all disabled:opacity-70 disabled:pointer-events-none mt-2 shadow-[0_0_15px_rgba(124,58,237,0.4)]"
            >
              {loading ? "Iniciando..." : "INICIAR SESIÓN"}
            </button>
          </form>

          <div className="my-7 flex items-center gap-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#2a1b41]"></div>
            <span className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">o continúa con</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#2a1b41]"></div>
          </div>

          {/* Social Buttons */}
          <div className="flex items-center gap-3">
            <SocialButton
              icon={
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.66 17.5l-2.02-1.92c.62-.64 1.01-1.52 1.01-2.49 0-1.93-1.57-3.5-3.5-3.5H9.69v8.05H8.3V8.3h4.86c2.65 0 4.8 2.15 4.8 4.8 0 1.25-.48 2.39-1.26 3.25l2.12 2.01-1.16 1.14z"/>
                </svg>
              }
              label="STEAM"
            />
            
            <form action={googleSignInAction} className="flex-1 flex">
              <SocialButton
                action={() => {}}
                icon={
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                }
                label="GOOGLE"
              />
            </form>

            <SocialButton
              icon={
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
                </svg>
              }
              label="DISCORD"
            />
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-400 text-[13px]">
              ¿No tienes cuenta?{" "}
              <Link href="/register" className="text-[#d946ef] font-semibold hover:text-[#f0abfc] transition-colors">
                Regístrate
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer Banner Features */}
      <div className="w-full bg-[#05030f]/60 backdrop-blur-md border-t border-[#2a1b41] py-4 px-4 z-10">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-3 justify-center md:justify-start">
            <ShieldCheck className="w-6 h-6 text-[#d946ef]" />
            <div className="flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white">PAGOS 100% SEGUROS</span>
              <span className="text-[10px] text-gray-400">Múltiples métodos</span>
            </div>
          </div>
          <div className="flex items-center gap-3 justify-center md:justify-start">
            <Zap className="w-6 h-6 text-[#d946ef]" />
            <div className="flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white">ENTREGA INSTANTÁNEA</span>
              <span className="text-[10px] text-gray-400">Recibe al momento</span>
            </div>
          </div>
          <div className="flex items-center gap-3 justify-center md:justify-start">
            <Percent className="w-6 h-6 text-[#d946ef]" />
            <div className="flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white">LOS MEJORES PRECIOS</span>
              <span className="text-[10px] text-gray-400">Ahorra en cada compra</span>
            </div>
          </div>
          <div className="flex items-center gap-3 justify-center md:justify-start">
            <HeadphonesIcon className="w-6 h-6 text-[#d946ef]" />
            <div className="flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white">SOPORTE 24/7</span>
              <span className="text-[10px] text-gray-400">Siempre para ti</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
