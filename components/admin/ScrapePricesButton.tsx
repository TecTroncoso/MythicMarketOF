"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";

type JobStatus = "running" | "done" | "error";

interface ScrapeJobDto {
  id: string;
  game: string;
  status: JobStatus;
  error: string | null;
  snapshotId: string | null;
  packages: number | null;
  logTail: string[];
}

const POLL_MS = 3000;

export function ScrapePricesButton({ game }: { game: string }) {
  const router = useRouter();
  const [job, setJob] = useState<ScrapeJobDto | null | "unknown">("unknown");
  const [showLog, setShowLog] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/scrape-prices?game=${encodeURIComponent(game)}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { job: ScrapeJobDto | null };
      setJob(data.job);
      if (data.job && data.job.status !== "running") {
        stopPolling();
        if (data.job.status === "done") router.refresh();
      }
    } catch {
      // Network hiccup: keep polling; next tick may succeed.
    }
  }, [game, router, stopPolling]);

  const ensurePolling = useCallback(() => {
    if (!pollRef.current) {
      pollRef.current = setInterval(() => void fetchStatus(), POLL_MS);
    }
  }, [fetchStatus]);

  // On mount: if a job for this game is already running (e.g. the page was
  // reloaded mid-scrape), pick up its status and keep polling.
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/admin/scrape-prices?game=${encodeURIComponent(game)}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          setJob(null);
          return;
        }
        const data = (await res.json()) as { job: ScrapeJobDto | null };
        setJob(data.job);
        if (data.job?.status === "running") ensurePolling();
      } catch {
        setJob(null);
      }
    })();
    return () => stopPolling();
  }, [game, ensurePolling, stopPolling]);

  const startScrape = useCallback(async () => {
    setJob({ id: "", game, status: "running", error: null, snapshotId: null, packages: null, logTail: [] });
    try {
      const res = await fetch("/api/admin/scrape-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game }),
      });
      const data = (await res.json()) as {
        error?: string;
        job?: ScrapeJobDto | null;
      } & Partial<ScrapeJobDto>;

      if (res.status === 202) {
        setJob({
          id: data.id ?? "",
          game,
          status: "running",
          error: null,
          snapshotId: null,
          packages: null,
          logTail: [],
        });
        ensurePolling();
        return;
      }

      // 409 = another scrape already running. If it is THIS game's job,
      // attach to it; otherwise just report the conflict.
      if (res.status === 409 && data.job?.game === game) {
        setJob(data.job);
        ensurePolling();
        return;
      }
      setJob({
        id: "",
        game,
        status: "error",
        error: data.error ?? "No se pudo iniciar.",
        snapshotId: null,
        packages: null,
        logTail: data.job?.logTail ?? [],
      });
    } catch {
      setJob({ id: "", game, status: "error", error: "Error de red al iniciar.", snapshotId: null, packages: null, logTail: [] });
    }
  }, [game, ensurePolling]);

  const running = job !== null && job !== "unknown" && job.status === "running";
  const finished = job !== null && job !== "unknown" && job.status !== "running";

  return (
    <div className="flex flex-col items-start sm:items-end gap-2 sm:text-right">
      <button
        type="button"
        onClick={startScrape}
        disabled={running}
        className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors bg-[#ffaa00] text-[#0a0f1a] hover:bg-[#ffc233] disabled:opacity-60 disabled:cursor-wait"
      >
        {running ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <RefreshCw className="w-4 h-4" />
        )}
        {running ? "Actualizando precios..." : "Actualizar precios ahora"}
      </button>

      {finished && (
        <div
          className={`max-w-md text-left text-xs rounded-xl border px-3 py-2.5 ${
            job.status === "done"
              ? "border-green-500/40 bg-green-500/10 text-green-300"
              : "border-red-500/40 bg-red-500/10 text-red-300"
          }`}
        >
          <p className="flex items-center gap-1.5 font-semibold">
            {job.status === "done" ? (
              <>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Lista actualizada: {job.packages ?? "?"} paquetes importados.
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {job.error ?? "La actualización falló."}
              </>
            )}
          </p>
          {job.logTail.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setShowLog((v) => !v)}
                className="mt-1.5 text-[11px] underline opacity-80 hover:opacity-100"
              >
                {showLog ? "Ocultar log" : "Ver log"}
              </button>
              {showLog && (
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-black/40 p-2 text-[10px] leading-relaxed text-gray-300">
                  {job.logTail.join("\n")}
                </pre>
              )}
            </>
          )}
        </div>
      )}

      {running && (
        <p className="text-xs text-gray-500">
          El scraper recorre catálogo y checkout; suele tardar 2-4 minutos.
        </p>
      )}
    </div>
  );
}
