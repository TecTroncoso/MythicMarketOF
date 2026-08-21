import Image from "next/image";

export function HeroBanner() {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-border-dark shadow-[0_0_30px_rgba(82,0,153,0.3)] bg-bg-dark min-h-[400px] flex items-center">
      <div className="absolute inset-0 bg-gradient-to-r from-bg-dark via-bg-dark/60 to-transparent z-10 pointer-events-none" />
      <Image
        src="/images/hero_banner.png"
        alt="Hero Banner"
        fill
        className="object-contain object-right absolute inset-0 z-0 opacity-90"
        priority
      />
      <div className="relative z-20 p-8 md:p-12 max-w-lg">
        <h1 className="text-5xl md:text-7xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-neon-pink to-neon-cyan drop-shadow-[0_0_10px_rgba(255,0,255,0.5)] leading-tight mb-2">
          LEVEL UP
          <br />
          YOUR GAME
       </h1>
        <p className="text-gray-300 font-bold tracking-widest text-sm md:text-base mb-8">
          JUEGOS Y TARJETAS AL MEJOR PRECIO
       </p>
        <button className="bg-transparent border-2 border-neon-pink text-white px-8 py-3 rounded-full font-bold uppercase tracking-wider hover:bg-neon-pink hover:shadow-[0_0_20px_rgba(255,0,255,0.6)] transition-all">
          Comprar Ahora
       </button>
     </div>
      <DiscountBadge />
   </div>
  );
}

function DiscountBadge() {
  return (
    <div className="absolute right-8 top-1/2 -translate-y-1/2 z-20 hidden md:block">
      <div className="w-32 h-32 transform rotate-45 border-4 border-neon-cyan flex items-center justify-center bg-bg-dark/80 backdrop-blur-sm shadow-[0_0_30px_rgba(0,255,255,0.4)]">
        <div className="transform -rotate-45 text-center">
          <div className="text-sm font-bold text-gray-400">HASTA</div>
          <div className="text-4xl font-black text-neon-cyan drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]">-90%</div>
          <div className="text-xs font-bold text-white">DESCUENTO</div>
       </div>
     </div>
   </div>
  );
}
