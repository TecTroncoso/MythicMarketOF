import Image from 'next/image';
import { Zap, HelpCircle } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { ReviewsSectionLoader } from '@/components/ReviewsSectionLoader';
import dynamic from 'next/dynamic';

const CheckoutSection = dynamic(() => import('@/components/CheckoutSection').then(mod => mod.CheckoutSection));

export default function MobileLegendsStore() {
  return (
    <main className="min-h-screen bg-[#0a0f1a] text-white font-sans selection:bg-[#ffaa00] selection:text-black pb-20">
      <Navbar />

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#182232] to-[#0a0f1a] border-b border-[#1c2534]">
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, #ffaa00 0%, transparent 70%)' }}></div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 relative flex flex-col md:flex-row items-center gap-8">
          <div className="w-32 h-32 md:w-48 md:h-48 relative flex items-center justify-center shrink-0">
            <Image 
              src="/mlbb-logo.png" 
              alt="Mobile Legends: Bang Bang" 
              width={200} 
              height={200} 
              sizes="(max-width: 768px) 128px, 192px"
              className="w-full h-auto drop-shadow-[0_0_20px_rgba(255,170,0,0.4)]" 
              priority
              fetchPriority="high"
            />
          </div>
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1c2534] text-[#ffaa00] text-xs font-bold uppercase tracking-wider mb-4 border border-[#344050]">
              <Zap className="w-3 h-3" /> Entrega Instantánea
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-3 tracking-tight">Mobile Legends: Bang Bang</h2>
            <p className="text-gray-400 max-w-xl text-lg mx-auto md:mx-0">
              Recarga tus Diamantes y Twilight Pass de forma segura. Ingresa tu ID, elige la cantidad y paga mediante nuestros métodos seguros.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8 relative mt-0">
        
        {/* Interactive Checkout Area */}
        <CheckoutSection />

        {/* Static FAQ Section */}
        <section className="bg-[#121824] rounded-2xl p-6 md:p-8 border border-[#1c2534] shadow-xl lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <HelpCircle className="w-8 h-8 text-[#ffaa00]" />
            <h3 className="text-2xl font-bold">Preguntas Frecuentes</h3>
          </div>
          
          <div className="space-y-4">
            <div className="bg-[#0a0f1a] rounded-xl p-5 border border-[#2a3441]">
              <h4 className="font-bold text-lg mb-2 text-white">¿Cuánto tiempo tarda en llegar mi recarga?</h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                Las recargas se procesan de forma instantánea. Generalmente, los diamantes o pases se reflejarán en tu cuenta de Mobile Legends en menos de 5 minutos una vez confirmado el pago.
              </p>
            </div>
            
            <div className="bg-[#0a0f1a] rounded-xl p-5 border border-[#2a3441]">
              <h4 className="font-bold text-lg mb-2 text-white">¿Es seguro proveer mi User ID y Zone ID?</h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                Sí, es un proceso 100% seguro. Solo utilizamos tu User ID y Zone ID para conectarnos con los servidores oficiales y enviar los diamantes directamente a tu cuenta. <strong className="text-gray-300">Nunca te pediremos tu contraseña.</strong>
              </p>
            </div>
            
            <div className="bg-[#0a0f1a] rounded-xl p-5 border border-[#2a3441]">
              <h4 className="font-bold text-lg mb-2 text-white">¿Qué métodos de pago aceptan?</h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                Aceptamos una gran variedad de métodos de pago seguros, incluyendo tarjetas de crédito, débito, PayPal, y opciones de pago locales dependiendo de tu región, garantizando tu comodidad y seguridad.
              </p>
            </div>
          </div>
        </section>

        {/* Interactive Reviews Area */}
        <ReviewsSectionLoader />

      </div>
    </main>
  );
}
