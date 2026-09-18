import Image from "next/image";

// Paleta del hero.
const PURPLE = "#9E40C0";
const PINK = "#ffe3f5"; // blanco-rosa claro (como la referencia)
const CYAN = "#00f0ff";

// Hexágono regular (punta arriba) para el badge de descuento.
const HEX_CLIP = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

export function HeroBanner() {
  return (
    <div
      className="relative overflow-hidden min-h-[480px] flex items-center"
      style={{
        borderRadius: 20,
        border: `2px solid ${PURPLE}`,
        boxShadow:
          "0 0 32px rgba(158, 64, 192, 0.6), inset 0 0 22px rgba(158, 64, 192, 0.15)",
      }}
    >
      {/* Imagen cyberpunk: encuadre del samurái a la derecha */}
      <Image
        src="/images/hero_banner.png"
        alt="Hero Banner"
        fill
        className="object-cover absolute inset-0 z-0"
        style={{ objectPosition: "right 10%" }}
        priority
      />
      {/* Degradado oscuro solo en la mitad izquierda */}
      <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-r from-[#0C012D] via-[#0C012D]/55 to-transparent" />

      {/* Detalles HUD en las 4 esquinas del marco */}
      <HudCorner position="top-left" />
      <HudCorner position="top-right" />
      <HudCorner position="bottom-left" />
      <HudCorner position="bottom-right" />

      {/* Contenido principal */}
      <div className="relative z-20 p-8 md:p-14 max-w-2xl">
        <h1
          className="leading-[0.95] mb-4 tracking-wide"
          style={{
            fontFamily: "var(--font-display), cursive",
            transform: "skewX(-4deg)",
          }}
        >
          <span
            className="block text-7xl md:text-[7.5rem]"
            style={{
              color: PINK,
              textShadow:
                "0 0 4px rgba(255,255,255,0.9), 0 0 18px rgba(255, 100, 180, 1), 0 0 42px rgba(255, 42, 133, 0.7)",
            }}
          >
            LEVEL UP
          </span>
          <span
            className="block text-7xl md:text-[7.5rem]"
            style={{
              color: CYAN,
              textShadow:
                "0 0 4px rgba(255,255,255,0.7), 0 0 18px rgba(0, 240, 255, 1), 0 0 42px rgba(0, 240, 255, 0.7)",
            }}
          >
            YOUR GAME
          </span>
        </h1>
        <p className="text-white font-bold tracking-[0.22em] text-sm md:text-base uppercase mb-8 drop-shadow-[0_0_8px_rgba(255,255,255,0.25)]">
          Juegos y tarjetas al mejor precio
        </p>
        <button className="bg-[#0C012D]/70 backdrop-blur-sm border-[1.5px] border-[#d946ef] text-white text-sm font-bold uppercase tracking-[0.18em] px-8 py-3 rounded-lg transition-all duration-200 hover:scale-[1.04] hover:shadow-[0_0_20px_rgba(217,70,239,0.7)]">
          Comprar Ahora
        </button>
      </div>

      <DiscountBadge />

      {/* Indicadores de carrusel (dots) */}
      <CarouselDots />
    </div>
  );
}

// Esquina HUD gamer: pequeñas escuadras neón en las cuatro esquinas del marco.
type HudPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const HUD_STYLES: Record<HudPosition, string> = {
  "top-left": "top-3 left-3 border-l-2 border-t-2 rounded-tl-md",
  "top-right": "top-3 right-3 border-r-2 border-t-2 rounded-tr-md",
  "bottom-left": "bottom-3 left-3 border-l-2 border-b-2 rounded-bl-md",
  "bottom-right": "bottom-3 right-3 border-r-2 border-b-2 rounded-br-md",
};

function HudCorner({ position }: { position: HudPosition }) {
  return (
    <div
      className={`absolute ${HUD_STYLES[position]} z-20 w-9 h-9 border-[#d946ef] pointer-events-none`}
      style={{ filter: "drop-shadow(0 0 6px rgba(217, 70, 239, 0.85))" }}
    />
  );
}

function DiscountBadge() {
  return (
    <div className="absolute right-12 top-1/2 -translate-y-1/2 z-20 hidden md:block">
      <div
        className="relative w-52 h-56 grid place-items-center"
        style={{ filter: "drop-shadow(0 0 24px rgba(192, 132, 252, 0.85))" }}
      >
        <div className="absolute inset-0 bg-[#c084fc]" style={{ clipPath: HEX_CLIP }} />
        <div
          className="absolute inset-[2.5px] grid place-items-center backdrop-blur-sm bg-[#0C012D]/90"
          style={{ clipPath: HEX_CLIP }}
        >
          <div className="text-center px-3">
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-white/85">
              Hasta
            </div>
            <div
              className="text-6xl font-black my-2 text-neon-pink"
              style={{ textShadow: "0 0 18px #ff007f, 0 0 40px rgba(255,0,127,0.55)" }}
            >
              -90%
            </div>
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-white/85">
              Descuento
            </div>
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
          className={
            dot === 0
              ? "w-7 h-1.5 rounded-full bg-[#00f0ff] shadow-[0_0_10px_#00f0ff]"
              : "w-1.5 h-1.5 rounded-full bg-purple-300/50"
          }
        />
      ))}
    </div>
  );
}
