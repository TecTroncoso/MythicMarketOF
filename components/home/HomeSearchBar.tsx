"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Search } from "lucide-react";
import { searchGames, type GameSearchResult } from "@/lib/actions/search";

/**
 * Home navbar search: looks up GAMES (not packages) — the home sells games,
 * not in-game items. Debounced against the server action `searchGames`;
 * selecting a hit navigates to that game's top-up page.
 */
export function HomeSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GameSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      queueMicrotask(() => {
        setResults([]);
        setOpen(false);
      });
      return;
    }
    const timer = setTimeout(() => {
      startTransition(async () => {
        const hits = await searchGames(q);
        setResults(hits);
        setOpen(hits.length > 0);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const goTo = (path: string) => {
    setOpen(false);
    setQuery("");
    router.push(path);
  };

  return (
    <div ref={containerRef} className="flex-1 max-w-2xl hidden md:block relative">
      <div className="flex items-center bg-panel-dark border border-[#9E40C0]/70 rounded-xl px-4 py-2.5 shadow-[0_0_12px_rgba(158,64,192,0.25)] focus-within:border-neon-pink focus-within:shadow-[0_0_14px_rgba(255,0,255,0.35)] transition-all">
        <Search className="w-5 h-5 text-muted shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "Enter" && results.length > 0) goTo(results[0].path);
          }}
          placeholder="Busca juegos, tarjetas regalo, DLC y más..."
          aria-label="Buscar juegos"
          className="bg-transparent border-none outline-none w-full px-3 text-sm text-white placeholder-gray-500"
        />
        {isPending && <Loader2 className="w-4 h-4 animate-spin text-muted shrink-0" />}
      </div>

      {open && results.length > 0 && (
        <div
          role="listbox"
          className="absolute top-full left-0 right-0 mt-2 bg-panel-dark border border-[#9E40C0]/50 rounded-xl shadow-2xl shadow-black/60 overflow-hidden z-50"
        >
          {results.map((game) => (
            <button
              key={game.id}
              type="button"
              role="option"
              aria-selected="false"
              onClick={() => goTo(game.path)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#9E40C0]/15 transition-colors border-b border-[#2a1540] last:border-0"
            >
              <span className="relative w-10 h-10 rounded-lg overflow-hidden bg-bg-dark shrink-0">
                <Image src={game.image} alt="" fill sizes="40px" className="object-cover" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-white truncate">{game.name}</span>
                <span className="block text-[11px] text-gray-500">Top-Up · Entrega instantánea</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
