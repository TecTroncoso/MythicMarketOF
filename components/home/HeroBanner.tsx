import Image from "next/image";

// Paleta del hero.
const PURPLE = "#9E40C0";
const MAGENTA = "#ff2a85";
const CYAN = "#00f0ff";
const DARK = "rgba(12, 1, 45, 1)";

// Hexágono regular (punta arriba) para el badge de descuento.
const HEX_CLIP = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

export function HeroBanner() {
  return (
    <div
      className="relative overflow-hidden min-h-[400px] flex items-center"
      style={{
        borderRadius: 20,
        border: `2px solid ${PURPLE}`,
        boxShadow: `0 0 20px rgba(158, 64, 192, 0.35)`,
      }}
    >
      {/* Imagen cyberpunk ocupando todo el ancho */}
      <Image
        src="/images/hero_banner.png"
        alt="Hero Banner"
        fill
        className="object-cover object-center absolute inset-0 z-0"
        priority
      />
      {/* Degradado oscuro suave a la izquierda para integrar el texto */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, rgba(12,1,45,0.95) 25%, rgba(12,1,45,0.4) 60%, transparent 100%)",
        }}
      />

      {/* Contenido principal */}
      <div className="relative z-20 p-8 md:p-12 max-w-lg">
        <h1
          className="text-5xl md:text-7xl leading-[1.05] mb-3"
          style={{ fontFamily: "var(--font-display), cursive" }}
        >
          <span
            className="block"
            style={{
              color: MAGENTA,
              textShadow: `0 0 12px rgba(255, 42, 133, 0.8)`,
            }}
          >
            LEVEL UP
          </span>
          <span
            className="block"
            style={{
              color: CYAN,
              textShadow: `0 0 12px rgba(0, 240, 255, 0.8)`,
            }}
          >
            YOUR GAME
          </span>
        </h1>
        <p className="text-gray-200 font-semibold tracking-widest text-sm md:text-base uppercase mb-8">
          Juegos y tarjetas al mejor precio
        </p>
        <button
          className="bg-[#0C012D]/80 border-2 text-white px-8 py-3 rounded-full font-bold uppercase tracking-wider transition-all hover:scale-[1.03]"
          style={{ borderColor: PURPLE }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = `0 0 20px rgba(158, 64, 192, 0.6)`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          Comprar Ahora
        </button>
      </div>

      <DiscountBadge />

      {/* Indicadores de carrusel (dots) */}
      <CarouselDots />
    </div>
  );
}

function DiscountBadge() {
  return (
    <div className="absolute right-8 top-1/2 -translate-y-1/2 z-20 hidden md:block">
      <div
        className="relative w-36 h-40 grid place-items-center"
        style={{ filter: `drop-shadow(0 0 14px rgba(158, 64, 192, 0.5))` }}
      >
        {/* Borde neón violeta del hexágono */}
        <div className="absolute inset-0" style={{ clipPath: HEX_CLIP, background: PURPLE }} />
        {/* Fondo oscuro translúcido interior */}
        <div
          className="absolute inset-[2px] grid place-items-center backdrop-blur-sm"
          style={{ clipPath: HEX_CLIP, backgroundColor: DARK, opacity: 0.85 }}
        >
          <div className="text-center">
            <div className="text-sm font-bold text-gray-300 tracking-widest">HASTA</div>
            <div
              className="text-5xl font-black my-1"
              style={{ color: CYAN, textShadow: `0 0 12px rgba(0, 240, 255, 0.8)` }}
            >
              -90%
            </div>
            <div className="text-xs font-bold text-white tracking-widest">DESCUENTO</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CarouselDots() {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
      {[0, 1, 2, 3, 4].map((dot) => (
        <span
          key={dot}
          className={`rounded-full transition-all ${dot === 0 ? "w-5 h-1.5 bg-neon-cyan shadow-[0_0_8px_rgba(0,240,255,0.8)]" : "w-1.5 h-1.5 bg-white/30"
            }`}
        />
      ))}
    </div>
  );
}