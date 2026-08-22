"use client";

import { Share2 } from "lucide-react";

// Botón de compartir: usa la Web Share API cuando está disponible y
// copia la URL al portapapeles como alternativa.
export function ShareButton() {
    const handleShare = async () => {
        const url = typeof window !== "undefined" ? window.location.href : "";
        const shareData = {
            title: "Mythic Market — Top Up Mobile Legends",
            text: "Recargá diamantes de Mobile Legends al mejor precio",
            url,
        };
        try {
            if (typeof navigator !== "undefined" && navigator.share) {
                await navigator.share(shareData);
                return;
            }
            if (typeof navigator !== "undefined" && navigator.clipboard) {
                await navigator.clipboard.writeText(url);
            }
        } catch {
            // El usuario canceló o la API no está disponible: no-op.
        }
    };

    return (
        <button
            onClick={handleShare}
            className="flex items-center gap-1.5 bg-[#120c2e] border border-purple-500/20 px-2.5 py-1 rounded-lg hover:border-purple-400 text-slate-300 transition-colors cursor-pointer"
        >
            <Share2 className="w-3.5 h-3.5" />
            Compartir
        </button>
    );
}