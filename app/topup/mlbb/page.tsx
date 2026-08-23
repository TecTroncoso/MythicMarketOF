import Link from 'next/link';
import { ChevronRight, Home, HelpCircle } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { ReviewsSectionLoader } from '@/components/ReviewsSectionLoader';
import dynamic from 'next/dynamic';

const CheckoutSection = dynamic(() => import('@/components/CheckoutSection').then(mod => mod.CheckoutSection));

const CARD_BORDER = "rgba(147, 51, 234, 0.25)";

export default function MobileLegendsStore() {
  return (
    <main className="min-h-screen bg-[#070417] text-white font-sans selection:bg-[#d946ef] selection:text-white pb-10">
      <Navbar />

      {/* Breadcrumbs + compartir (directamente sobre el hero) */}
      <div className="px-4 lg:px-8 py-3 flex items-center justify-between text-xs text-slate-400 max-w-7xl mx-auto w-full">
        <nav className="flex items-center gap-1.5 min-w-0" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-white transition-colors shrink-0" aria-label="Inicio">
            <Home className="w-3.5 h-3.5" />
          </Link>
          <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
          <span className="hover:text-white cursor-pointer transition-colors whitespace-nowrap">Tienda</span>
          <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
          <span className="hover:text-white cursor-pointer transition-colors whitespace-nowrap truncate">
            Mobile Legends: Bang Bang
          </span>
          <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
          <span className="text-purple-300 whitespace-nowrap">Diamantes</span>
        </nav>
      </div>

      {/* Checkout premium: hero 2 columnas + tarjeta flotante + grid de diamantes */}
      <CheckoutSection />

      {/* SECCIÓN FAQ TEMPORALMENTE OCULTA (el código se conserva para el futuro) */}
      {false && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-14">
          <div
            className="rounded-2xl p-6 md:p-8"
            style={{ backgroundColor: "#110c2c", border: `1px solid ${CARD_BORDER}` }}
          >
            <div className="flex items-center gap-3 mb-6">
              <HelpCircle className="w-7 h-7 text-[#a855f7]" />
              <h3 className="text-xl md:text-2xl font-black text-white">Preguntas Frecuentes</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-[#0a061e] rounded-xl p-5 border border-[rgba(147,51,234,0.25)]">
                <h4 className="font-bold mb-2 text-white">¿Cuánto tiempo tarda en llegar mi recarga?</h4>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Las recargas se procesan de forma instantánea. Generalmente, los diamantes o pases se reflejarán en tu cuenta de Mobile Legends en menos de 5 minutos una vez confirmado el pago.
                </p>
              </div>

              <div className="bg-[#0a061e] rounded-xl p-5 border border-[rgba(147,51,234,0.25)]">
                <h4 className="font-bold mb-2 text-white">¿Es seguro proveer mi User ID y Zone ID?</h4>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Sí, es un proceso 100% seguro. Solo utilizamos tu User ID y Zone ID para conectarnos con los servidores oficiales y enviar los diamantes directamente a tu cuenta. <strong className="text-gray-300">Nunca te pediremos tu contraseña.</strong>
                </p>
              </div>

              <div className="bg-[#0a061e] rounded-xl p-5 border border-[rgba(147,51,234,0.25)]">
                <h4 className="font-bold mb-2 text-white">¿Qué métodos de pago aceptan?</h4>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Aceptamos una gran variedad de métodos de pago seguros, incluyendo tarjetas de crédito, débito, PayPal, y opciones de pago locales dependiendo de tu región, garantizando tu comodidad y seguridad.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SECCIÓN RESEÑAS TEMPORALMENTE OCULTA (el código se conserva para el futuro) */}
      {false && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-10">
          <ReviewsSectionLoader />
        </section>
      )}
    </main>
  );
}