"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { register } from "@/lib/actions/auth";
import { Turnstile } from "@marsidev/react-turnstile";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Zap,
  BadgePercent,
  Headphones,
} from "lucide-react";
import { googleSignInAction } from "@/lib/actions/google-signin";

const CARD_CLIP =
  "polygon(28px 0, 100% 0, 100% calc(100% - 28px), calc(100% - 28px) 100%, 0 100%, 0 28px)";

function FieldIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
      {children}
    </div>
  );
}

const inputClass =
  "w-full bg-[#100a24] border border-[#3b2373] rounded-lg pl-11 pr-4 py-3 text-sm text-white placeholder-[#6d6296] focus:outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7] transition-all disabled:opacity-60";

function SocialButton({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => e.preventDefault()}
      className="flex-1 bg-[#12092b] border border-[#2a1b41] hover:border-[#9333ea] text-white text-xs font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
    >
      {icon}
      {label}
    </button>
  );
}

function FeatureItem({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 justify-center md:justify-start">
      {icon}
      <div className="flex flex-col">
        <span className="text-[11px] font-bold uppercase tracking-wider text-white">
          {title}
        </span>
        <span className="text-[10px] text-gray-400">{subtitle}</span>
      </div>
    </div>
  );
}

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    <main className="min-h-screen bg-[#070514] text-white flex flex-col relative overflow-hidden font-sans">
      {/* Fondo cyberpunk púrpura */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 mix-blend-screen"
        style={{ backgroundImage: "url('/images/bg.png')" }}
      />

      {/* Halos de neón */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-fuchsia-600/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="flex-1 flex flex-col items-center justify-center p-4 z-10 w-full relative pt-10 pb-10">
        {/* Marco neón con esquinas biseladas */}
        <div
          className="w-full max-w-[500px]"
          style={{ filter: "drop-shadow(0 0 22px rgba(192, 38, 211, 0.35))" }}
        >
          <div
            className="bg-gradient-to-br from-[#e879f9] via-[#7c3aed] to-[#d946ef]"
            style={{ clipPath: CARD_CLIP, padding: "1.5px" }}
          >
            <div
              className="bg-[#0a0618]/90 backdrop-blur-xl p-8 md:p-10 relative"
              style={{ clipPath: CARD_CLIP }}
            >
              {/* Logo */}
              <div className="flex justify-center items-center gap-3 mb-7">
                <svg
                  width="42"
                  height="42"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M50 10 C30 10, 10 30, 20 60 C30 90, 70 90, 80 60 C90 30, 70 10, 50 10 Z"
                    fill="url(#reg_paint0)"
                  />
                  <path
                    d="M50 20 C65 20, 75 35, 70 55 C65 75, 35 75, 30 55 C25 35, 35 20, 50 20 Z"
                    fill="url(#reg_paint1)"
                  />
                  <defs>
                    <linearGradient
                      id="reg_paint0"
                      x1="0"
                      y1="0"
                      x2="100"
                      y2="100"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#fca5a5" />
                      <stop offset="1" stopColor="#d946ef" />
                    </linearGradient>
                    <linearGradient
                      id="reg_paint1"
                      x1="100"
                      y1="0"
                      x2="0"
                      y2="100"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#fde047" />
                      <stop offset="1" stopColor="#14b8a6" />
                    </linearGradient>
                  </defs>
                </svg>
                <h1 className="text-3xl font-black tracking-tight">
                  MythicMarket
                </h1>
              </div>

              <div className="text-center mb-7">
                <h2 className="text-2xl font-bold mb-2">Crear cuenta ⚡</h2>
                <p className="text-[#b8b3d0] text-sm leading-relaxed">
                  Únete a la comunidad de gamers y accede a los mejores juegos,
                  <br />
                  tarjetas y mucho más.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400 text-sm text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nombre de usuario */}
                <div className="space-y-2">
                  <label
                    htmlFor="name"
                    className="text-[13px] font-medium text-[#d4ccf0] block"
                  >
                    Nombre de usuario
                  </label>
                  <div className="relative">
                    <FieldIcon>
                      <User className="h-4 w-4 text-[#a78bfa]" />
                    </FieldIcon>
                    <input
                      id="name"
                      type="text"
                      name="name"
                      autoComplete="name"
                      required
                      disabled={loading}
                      className={inputClass}
                      placeholder="Elige un nombre de usuario"
                    />
                  </div>
                </div>

                {/* Correo electrónico */}
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="text-[13px] font-medium text-[#d4ccf0] block"
                  >
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <FieldIcon>
                      <Mail className="h-4 w-4 text-[#a78bfa]" />
                    </FieldIcon>
                    <input
                      id="email"
                      type="email"
                      name="email"
                      autoComplete="email"
                      required
                      disabled={loading}
                      className={inputClass}
                      placeholder="ejemplo@correo.com"
                    />
                  </div>
                </div>

                {/* Contraseña */}
                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="text-[13px] font-medium text-[#d4ccf0] block"
                  >
                    Contraseña
                  </label>
                  <div className="relative">
                    <FieldIcon>
                      <Lock className="h-4 w-4 text-[#a78bfa]" />
                    </FieldIcon>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      autoComplete="new-password"
                      required
                      disabled={loading}
                      className={`${inputClass} pr-12`}
                      placeholder="Mínimo 8 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={
                        showPassword
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
                      }
                      className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-[#a78bfa] hover:text-white transition-colors" />
                      ) : (
                        <Eye className="h-4 w-4 text-[#a78bfa] hover:text-white transition-colors" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirmar contraseña */}
                <div className="space-y-2">
                  <label
                    htmlFor="confirmPassword"
                    className="text-[13px] font-medium text-[#d4ccf0] block"
                  >
                    Confirmar contraseña
                  </label>
                  <div className="relative">
                    <FieldIcon>
                      <Lock className="h-4 w-4 text-[#a78bfa]" />
                    </FieldIcon>
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      autoComplete="new-password"
                      required
                      disabled={loading}
                      className={`${inputClass} pr-12`}
                      placeholder="Repite tu contraseña"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={
                        showConfirmPassword
                          ? "Ocultar confirmación"
                          : "Mostrar confirmación"
                      }
                      className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-[#a78bfa] hover:text-white transition-colors" />
                      ) : (
                        <Eye className="h-4 w-4 text-[#a78bfa] hover:text-white transition-colors" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-center py-1">
                  <Turnstile
                    siteKey={
                      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
                      "1x00000000000000000000AA"
                    }
                    options={{ theme: "dark" }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[#7c3aed] via-[#a855f7] to-[#d946ef] hover:from-[#8b5cf6] hover:to-[#e879f9] text-white font-bold text-[13px] uppercase tracking-[0.15em] py-3.5 rounded-lg transition-all disabled:opacity-70 disabled:pointer-events-none shadow-[0_0_25px_rgba(168,85,247,0.5)]"
                >
                  {loading ? "Creando cuenta..." : "REGISTRARSE"}
                </button>
              </form>

              <div className="my-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#3b2373]"></div>
                <span className="text-[11px] text-gray-400 font-medium">
                  o regístrate con
                </span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#3b2373]"></div>
              </div>

              {/* Botones sociales */}
              <div className="flex items-center gap-3">
                <SocialButton
                  icon={
                    <svg
                      className="w-4 h-4 text-[#66c0f4]"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.457-.397.957-1.497 1.41-2.454 1.012zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z" />
                    </svg>
                  }
                  label="STEAM"
                />

                <form action={googleSignInAction} className="flex-1 flex">
                  <button
                    type="submit"
                    className="flex-1 bg-[#12092b] border border-[#2a1b41] hover:border-[#9333ea] text-white text-xs font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    GOOGLE
                  </button>
                </form>

                <SocialButton
                  icon={
                    <svg
                      className="w-4 h-4 text-[#7289da]"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
                    </svg>
                  }
                  label="DISCORD"
                />
              </div>

              <div className="mt-7 text-center">
                <p className="text-gray-400 text-[13px]">
                  ¿Ya tienes una cuenta?{" "}
                  <Link
                    href="/login"
                    className="text-[#e879f9] font-semibold hover:text-[#f5d0fe] transition-colors"
                  >
                    Iniciar sesión
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Franja inferior de garantías */}
      <div className="w-full bg-[#05030f]/60 backdrop-blur-md border-t border-[#2a1b41] py-4 px-4 z-10">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          <FeatureItem
            icon={<ShieldCheck className="w-6 h-6 text-[#d946ef]" />}
            title="PAGOS 100% SEGUROS"
            subtitle="Múltiples métodos"
          />
          <FeatureItem
            icon={<Zap className="w-6 h-6 text-[#d946ef]" />}
            title="ENTREGA INSTANTÁNEA"
            subtitle="Recibe al momento"
          />
          <FeatureItem
            icon={<BadgePercent className="w-6 h-6 text-[#d946ef]" />}
            title="LOS MEJORES PRECIOS"
            subtitle="Ahorra en cada compra"
          />
          <FeatureItem
            icon={<Headphones className="w-6 h-6 text-[#d946ef]" />}
            title="SOPORTE 24/7"
            subtitle="Siempre para ti"
          />
        </div>
      </div>
    </main>
  );
}
