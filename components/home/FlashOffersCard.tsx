import { Zap } from "lucide-react";
import { FLASH_OFFER_TIMER } from "@/lib/home-data";

function TimerCell({ value, accent = false }: { value: string; accent?: boolean }) {
  return (
    <div
      className={`bg-bg-dark px-2 py-1 border border-border-dark rounded ${
        accent ? "text-neon-pink" : "text-white"
      }`}
    >
      {value}
   </div>
  );
}

export function FlashOffersCard() {
  const { hours, minutes, seconds } = FLASH_OFFER_TIMER;
  return (
    <div className="bg-card-dark border border-border-dark rounded-2xl p-6 relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-1 h-full bg-neon-pink shadow-[0_0_15px_var(--color-neon-pink)]" />
      <div className="flex items-center gap-2 mb-4 text-neon-pink">
        <Zap className="w-6 h-6 animate-pulse" fill="currentColor" />
        <h3 className="font-black text-xl italic tracking-wider">OFERTAS FLASH</h3>
      </div>
      <div className="text-sm text-muted mb-2 font-medium">TERMINA EN</div>
      <div className="flex items-center gap-2 text-2xl font-mono font-bold mb-6">
        <TimerCell value={hours} />
        <span>:</span>
        <TimerCell value={minutes} />
        <span>:</span>
        <TimerCell value={seconds} accent />
     </div>
      <button className="w-full py-2.5 rounded-lg border border-neon-pink text-neon-pink font-bold hover:bg-neon-pink hover:text-white hover:shadow-[0_0_15px_rgba(255,0,255,0.4)] transition-all">
        VER OFERTAS
     </button>
   </div>
  );
}
