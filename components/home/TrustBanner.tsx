import { Gamepad2 } from "lucide-react";
import { TRUST_ITEMS } from "@/lib/home-data";

export function TrustBanner() {
  return (
    <div className="max-w-7xl mx-auto px-4 mt-12">
      <div className="bg-bg-dark border border-neon-pink/30 rounded-2xl flex flex-col xl:flex-row items-stretch justify-between relative overflow-hidden shadow-[0_0_20px_rgba(255,0,255,0.15)]">
        <div className="absolute inset-0 bg-gradient-to-r from-card-dark to-transparent pointer-events-none" />
        <div className="flex flex-wrap items-center justify-center xl:justify-start gap-x-8 gap-y-6 py-5 px-6 relative z-10 flex-1">
          {TRUST_ITEMS.map((item) => (
            <div key={item.title} className="flex items-center gap-3 group">
              <item.icon className="w-8 h-8 text-neon-pink group-hover:scale-110 transition-transform drop-shadow-[0_0_5px_rgba(255,0,255,0.5)]" />
              <div>
                <div className="font-black text-[12px] tracking-wide text-white">{item.title}</div>
                <div className="text-[10px] text-muted font-bold">{item.subtitle}</div>
              </div>
            </div>
          ))}
        </div>
        <GameOnBadge />
      </div>
    </div>
  );
}

function GameOnBadge() {
  return (
    <div className="relative py-4 px-10 flex items-center justify-center xl:mr-8 mb-4 xl:mb-0 w-[85%] xl:w-auto mx-auto xl:mx-0">
      <div className="absolute inset-0 bg-bg-dark border-[2px] border-neon-pink -skew-x-[15deg] shadow-[0_0_15px_rgba(255,0,255,0.4),inset_0_0_15px_rgba(255,0,255,0.5)] rounded-lg" />
      <div className="relative z-10 flex items-center gap-4">
        <Gamepad2 className="w-9 h-9 text-neon-purple" />
        <div>
          <div className="font-black text-xl italic text-neon-purple tracking-wide leading-tight">GAME ON</div>
          <div className="text-[11px] font-black text-neon-purple tracking-wider">AHORRA MÁS</div>
        </div>
      </div>
    </div>
  );
}
