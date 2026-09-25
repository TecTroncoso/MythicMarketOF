"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Search } from "lucide-react";
import { searchStore, type SearchResult } from "@/lib/actions/search";

/**
 * Navbar live search: debounced query against the LIVE store catalog
 * (server action `searchStore`; supplier snapshot + combos + static
 * fallback). Selecting a result navigates to /topup/mlbb with the package
 * pre-selected via ?product=<id>.
 */
export function NavbarSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce the server round-trip; stale responses are discarded by closure.
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
        const hits = await searchStore(q);
        setResults(hits);
        setOpen(hits.length > 0);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Close the dropdown on outside click.
  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const goTo = (id: string) => {
    setOpen(false);
    setQuery("");
    router.push(`/topup/mlbb?product=${encodeURIComponent(id)}`);
  };

  return (
    <div ref={containerRef} className="flex-1 max-w-xl hidden md:block relative">
      <div className="flex items-center relative">
        <Search className="absolute left-3 text-slate-400 h-4 w-4 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "Enter" && results.length > 0) goTo(results[0].id);
          }}
          placeholder="Buscar juegos, recargas, tarjetas..."
          aria-label="Buscar en la tienda"
          className="w-full bg-[#120c2e] border border-purple-500/25 focus:border-purple-500/80 rounded-xl pl-10 pr-10 py-2 text-sm text-white placeholder-slate-400 outline-none transition-all shadow-inner"
        />
        {isPending && (
          <Loader2 className="absolute right-3 h-4 w-4 animate-spin text-slate-400" />
        )}
      </div>

      {open && results.length > 0 && (
        <div
          role="listbox"
          className="absolute top-full left-0 right-0 mt-2 bg-[#120c2e] border border-purple-500/30 rounded-xl shadow-2xl shadow-black/60 overflow-hidden z-50"
        >
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              role="option"
              aria-selected="false"
              onClick={() => goTo(r.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-purple-500/10 transition-colors border-b border-purple-900/20 last:border-0"
            >
              <span className="relative w-10 h-10 rounded-lg overflow-hidden bg-[#0d0926] shrink-0">
                <Image src={r.image} alt="" fill sizes="40px" className="object-contain p-1" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-white truncate">{r.label}</span>
                <span className="block text-[11px] text-slate-400">{r.categoryLabel}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
