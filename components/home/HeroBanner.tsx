import Image from "next/image";

// Paleta del hero.
const PURPLE = "#9E40C0";
const MAGENTA = "#ff2a85";
const CYAN = "#00f0ff";

// Hexágono regular (punta arriba) para el badge de descuento.
const HEX_CLIP = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

export function HeroBanner() {
  return (
    <div
      className="relative overflow-hidden min-h-[400px] flex items-center"
      style={{
        borderRadius: 20,
        border: `2px solid ${PURPLE}`,
        boxShadow:
          "0 0 20px rgba(158, 64, 192, 0.4), inset 0 0 15px rgba(158, 64, 192, 0.1)",
      }}
    >
      {/* Imagen cyberpunk: encuadre que respeta la cabeza/capucha del personaje */}
      <Image
        src="/images/hero_banner.png"
        alt="Hero Banner"
        fill
        className="object-cover absolute inset-0 z-0"
        style={{ objectPosition: "right 15%" }}
        priority
      />
      {/* Degradado oscuro a la izquierda para legibilidad del texto */}
      <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-r from-[#0C012D] via-[#0C012D]/60 to-transparent" />

      {/* Detalles HUD en las esquinas superiores */}
      <HudCorner position="left" />
      <HudCorner position="right" />

      {/* Contenido principal */}
      <div className="relative z-20 p-8 md:p-12 max-w-lg">
        <h1
          className="text-5xl md:text-7xl leading-[1.05] mb-3 italic"
          style={{
            fontFamily: "var(--font-display), cursive",
            transform: "skewX(-5deg)",
          }}
        >
          <span
            className="block"
            style={{
              color: MAGENTA,
              textShadow:
                "0 0 12px rgba(255, 42, 133, 0.9), 0 0 25px rgba(255, 42, 133, 0.5)",
            }}
          >
            LEVEL UP
          </span>
          <span
            className="block"
            style={{
              color: CYAN,
              textShadow:
                "0 0 12px rgba(0, 240, 255, 0.9), 0 0 25px rgba(0, 240, 255, 0.5)",
            }}
          >
            YOUR GAME
          </span>
        </h1>
        <p className="text-gray-200 font-semibold tracking-widest text-sm md:text-base uppercase mb-8">
          Juegos y tarjetas al mejor precio
        </p>
        <button
          className="bg-[#0C012D]/80 backdrop-blur-sm border-[1.5px] border-[#d946ef] text-white text-xs font-bold uppercase tracking-wider px-6 py-2.5 rounded-xl transition-all duration-200 hover:scale-[1.03] hover:shadow-[0_0_18px_rgba(217,70,239,0.65)]"
          style={{ boxShadow: "0 0 12px rgba(217, 70, 239, 0.5)" }}
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

// Esquina HUD gamer: pequeñas escuadras neón en los bordes superiores.
function HudCorner({ position }: { position: "left" | "right" }) {
  const isLeft = position === "left";
  return (
    <div
      className={`absolute top-3 ${isLeft ? "left-3 border-l-2 border-t-2 rounded-tl-md" : "right-3 border-r-2 border-t-2 rounded-tr-md"} z-20 w-8 h-8 border-[#d946ef]/70 pointer-events-none`}
      style={{ filter: "drop-shadow(0 0 4px rgba(217, 70, 239, 0.6))" }}
    />
  );
}

function DiscountBadge() {
  return (
    <div className="absolute right-8 top-1/2 -translate-y-1/2 z-20 hidden md:block">
      <div
        className="relative w-36 h-40 grid place-items-center"
        style={{ filter: "drop-shadow(0 0 14px rgba(158, 64, 192, 0.55))" }}
      >
        {/* Borde neón violeta/magenta del hexágono */}
        <div className="absolute inset-0 bg-[#c084fc]" style={{ clipPath: HEX_CLIP }} />
        {/* Fondo oscuro translúcido interior */}
        <div
          className="absolute inset-[2px] grid place-items-center backdrop-blur-sm bg-[#0C012D]/90"
          style={{ clipPath: HEX_CLIP }}
        >
          <div className="text-center px-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-200">
              Hasta
            </div>
            <div
              className="text-3xl font-black my-1.5 text-[#00f0ff] drop-shadow-[0_0_10px_#00f0ff]"
            >
              -90%
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-200">
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
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
      {[0, 1, 2, 3, 4].map((dot) => (
        <span
          key={dot}
          className={
            dot === 0
              ? "w-6 h-1.5 rounded-full bg-[#00f0ff] shadow-[0_0_8px_#00f0ff]"
              : "w-1.5 h-1.5 rounded-full bg-purple-300/40"
          }
        />
      ))}
    </div>
  );
}