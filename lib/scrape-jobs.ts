// Background runner for the supplier price scrapers (one script per game,
// registered in lib/scrapers.ts). Launches the script as a child process and,
// on success, parses its results JSON and imports it as a new supplier price
// snapshot for that game.
//
// State is in-memory and process-local: this feature is meant for a
// self-hosted/long-running server (a local dev server works). On serverless
// deployments the child process cannot outlive the request, so the admin UI
// notes the limitation. Only one job runs at a time globally — our scrape
// providers (ScrapingAnt free tier) cap concurrent requests anyway.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getScraperForGame } from "@/lib/scrapers";
import { getSupplierGame } from "@/lib/supplier-games";
import {
  importSupplierPrices,
  parseEnebaResultsPayload,
} from "@/lib/supplier-prices";

export type ScrapeJobStatus = "running" | "done" | "error";

export interface ScrapeJob {
  id: string;
  game: string;
  status: ScrapeJobStatus;
  startedAt: Date;
  finishedAt: Date | null;
  /** Last lines of scraper output, for UI feedback. */
  logTail: string[];
  error: string | null;
  snapshotId: string | null;
  packages: number | null;
}

const MAX_LOG_LINES = 120;
const PROJECT_ROOT = process.cwd();

// Module-level registry: latest job per game. A dev-server hot reload resets
// this map; worst case the button loses track of an in-flight scrape that
// still finishes and imports on its own.
const jobsByGame = new Map<string, ScrapeJob>();

function resolvePythonExecutable(): string {
  if (process.env.ENEBA_PYTHON_PATH) return process.env.ENEBA_PYTHON_PATH;
  const venvPython = path.join(PROJECT_ROOT, "venv", "Scripts", "python.exe");
  if (existsSync(venvPython)) return venvPython;
  return "python";
}

function hasRunningJob(): boolean {
  for (const job of jobsByGame.values()) {
    if (job.status === "running") return true;
  }
  return false;
}

function pushLog(job: ScrapeJob, chunk: string) {
  const lines = chunk
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
  job.logTail.push(...lines);
  if (job.logTail.length > MAX_LOG_LINES) {
    job.logTail.splice(0, job.logTail.length - MAX_LOG_LINES);
  }
}

async function importResultsIntoSnapshot(
  job: ScrapeJob,
  resultsFile: string
): Promise<void> {
  const resultsPath = path.join(PROJECT_ROOT, resultsFile);
  const raw = JSON.parse(await readFile(resultsPath, "utf-8"));
  const parsed = parseEnebaResultsPayload(raw);
  if (parsed.game !== job.game) {
    throw new Error(
      `El JSON pertenece a "${parsed.game}" pero el job es de "${job.game}".`
    );
  }
  const snapshotId = await importSupplierPrices(parsed);
  job.snapshotId = snapshotId;
  job.packages = parsed.rows.length;
}

/**
 * Starts the game's scraper in the background and returns immediately.
 * Throws when the game is unknown, has no scraper configured, or another
 * scrape is already running. The returned job is updated in place; readers
 * always go through getLatestScrapeJob(), which returns detached copies.
 */
export function startScrapeJob(game: string): ScrapeJob {
  if (!getSupplierGame(game)) {
    throw new Error(`Juego desconocido: ${game}`);
  }
  const scraper = getScraperForGame(game);
  if (!scraper) {
    throw new Error(`El juego "${game}" no tiene scraper configurado.`);
  }
  if (hasRunningJob()) {
    throw new Error("Ya hay una actualización de precios en curso.");
  }

  const job: ScrapeJob = {
    id: crypto.randomUUID(),
    game,
    status: "running",
    startedAt: new Date(),
    finishedAt: null,
    logTail: [],
    error: null,
    snapshotId: null,
    packages: null,
  };
  jobsByGame.set(game, job);

  const python = resolvePythonExecutable();
  pushLog(job, `Lanzando ${python} ${scraper.script}...`);

  const child = spawn(python, [scraper.script], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    windowsHide: true,
  });

  child.stdout.on("data", (data: Buffer) => pushLog(job, data.toString("utf-8")));
  child.stderr.on("data", (data: Buffer) => pushLog(job, data.toString("utf-8")));

  child.on("error", (error) => {
    job.status = "error";
    job.finishedAt = new Date();
    job.error = `No se pudo lanzar el scraper: ${error.message}`;
  });

  child.on("close", (code) => {
    void (async () => {
      if (code !== 0) {
        job.status = "error";
        job.finishedAt = new Date();
        job.error = `El scraper terminó con código ${code ?? "desconocido"}.`;
        return;
      }
      try {
        pushLog(job, "Importando resultados a la base de datos...");
        await importResultsIntoSnapshot(job, scraper.resultsFile);
        job.status = "done";
        pushLog(job, `Snapshot importado (${job.packages} paquetes).`);
      } catch (error) {
        job.status = "error";
        job.error =
          error instanceof Error
            ? `El scrape terminó bien pero falló la importación: ${error.message}`
            : "El scrape terminó bien pero la importación falló.";
      } finally {
        job.finishedAt = new Date();
      }
    })();
  });

  return job;
}

/**
 * Detached copy of the latest job. With a game id, returns that game's job
 * (or null); without one, returns whichever job ran most recently.
 */
export function getLatestScrapeJob(game?: string): ScrapeJob | null {
  let job: ScrapeJob | null = null;
  if (game) {
    job = jobsByGame.get(game) ?? null;
  } else {
    for (const candidate of jobsByGame.values()) {
      if (!job || candidate.startedAt > job.startedAt) job = candidate;
    }
  }
  if (!job) return null;
  return { ...job, logTail: [...job.logTail] };
}
