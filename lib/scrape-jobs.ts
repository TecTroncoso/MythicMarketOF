// Background runner for the supplier price scrapers (one script per game,
// registered in lib/scrapers.ts).
//
// Two execution strategies, picked by environment:
// - Local/self-hosted: spawn the Python script as a child process and import
//   the resulting JSON into Turso from here.
// - Vercel (serverless): lambdas cannot run a 3-minute Python process, so we
//   dispatch the GitHub Actions workflow in .github/workflows/scrape-prices.yml
//   instead. The workflow scrapes AND imports to Turso; status is read back
//   from the GitHub API, which makes it stateless (Vercel lambdas share no
//   memory between requests).
//
// Only one scrape runs at a time globally — our providers (ScrapingAnt free
// tier) cap concurrent requests anyway.

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
const IS_VERCEL = Boolean(process.env.VERCEL);
const GITHUB_REPO = process.env.GITHUB_REPO ?? "";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? "";
const GITHUB_WORKFLOW = "scrape-prices.yml";

// ---------------------------------------------------------------------------
// Local spawn strategy (state: in-memory map, fine for a single long-lived
// server process; a dev-server hot reload just loses track of the job, which
// still finishes and imports on its own).
// ---------------------------------------------------------------------------

const jobsByGame = new Map<string, ScrapeJob>();

interface ScraperEnvironment {
  /** Absolute path of the project virtualenv python. */
  python: string;
  /** Absolute path of the project root (scrapers/, .env, package.json live here). */
  rootDir: string;
}

/**
 * Locates the project's Python and root dir. The Next.js server's cwd is NOT
 * trusted (it varies with how the dev server was started, and bare `python`
 * on Windows often resolves to the Microsoft Store stub, which exits with
 * code -2). We walk up from cwd looking for venv/Scripts/python.exe; an
 * explicit ENEBA_PYTHON_PATH in .env wins over everything.
 */
function resolveScraperEnvironment(): ScraperEnvironment {
  const fromEnv = process.env.ENEBA_PYTHON_PATH?.trim();
  if (fromEnv) {
    if (!existsSync(fromEnv)) {
      throw new Error(
        `ENEBA_PYTHON_PATH no existe en disco: ${fromEnv}. Revisa el valor en .env.`
      );
    }
    // venv/Scripts/python.exe -> 3 levels up is the project root.
    const rootDir = path.resolve(path.dirname(fromEnv), "..", "..");
    return { python: fromEnv, rootDir };
  }

  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const candidate = path.join(dir, "venv", "Scripts", "python.exe");
    if (existsSync(candidate)) {
      return { python: candidate, rootDir: dir };
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  throw new Error(
    "No se encontró el Python del proyecto (venv/Scripts/python.exe). " +
      "Arranca el servidor desde la raíz del proyecto o define ENEBA_PYTHON_PATH en .env."
  );
}

function hasRunningLocalJob(): boolean {
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
  resultsPath: string
): Promise<void> {
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

function startLocalScrapeJob(game: string, script: string, resultsFile: string): ScrapeJob {
  if (hasRunningLocalJob()) {
    throw new Error("Ya hay una actualización de precios en curso.");
  }

  // Resolve python FIRST so a missing interpreter fails before registering.
  const env = resolveScraperEnvironment();
  const scriptPath = path.join(env.rootDir, script);
  if (!existsSync(scriptPath)) {
    throw new Error(`No existe el script del scraper: ${scriptPath}`);
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

  pushLog(job, `Lanzando ${env.python} ${scriptPath}...`);

  const child = spawn(env.python, [scriptPath], {
    cwd: env.rootDir,
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
        await importResultsIntoSnapshot(job, path.join(env.rootDir, resultsFile));
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

// ---------------------------------------------------------------------------
// GitHub Actions strategy (Vercel): dispatch the workflow and read run status
// from the GitHub API. Fully stateless — required on serverless.
// ---------------------------------------------------------------------------

interface GithubRun {
  id: number;
  status: string | null;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  html_url: string;
}

function assertGithubConfig(): void {
  if (!GITHUB_REPO || !GITHUB_TOKEN) {
    throw new Error(
      "En producción el scraper corre en GitHub Actions. Configura GITHUB_REPO " +
        '(ej: "usuario/repo") y GITHUB_TOKEN (PAT con scope actions:write) en las ' +
        "variables de entorno de Vercel."
    );
  }
}

async function githubApi<T>(pathAndQuery: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`https://api.github.com${pathAndQuery}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.method === "POST" ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub API ${res.status}: ${body.slice(0, 200)}`);
  }
  // The dispatch endpoint returns 204 with no body.
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function runsPath(): string {
  return `/repos/${GITHUB_REPO}/actions/workflows/${GITHUB_WORKFLOW}/runs?event=workflow_dispatch&per_page=5`;
}

async function getLatestWorkflowRun(): Promise<GithubRun | null> {
  const data = await githubApi<{ workflow_runs: GithubRun[] }>(runsPath());
  return data.workflow_runs[0] ?? null;
}

async function findActiveWorkflowRun(): Promise<GithubRun | null> {
  const data = await githubApi<{ workflow_runs: GithubRun[] }>(runsPath());
  return (
    data.workflow_runs.find(
      (run) => run.status === "queued" || run.status === "in_progress"
    ) ?? null
  );
}

function runToJob(run: GithubRun, game: string): ScrapeJob {
  let status: ScrapeJobStatus = "running";
  let error: string | null = null;
  if (run.status === "completed") {
    if (run.conclusion === "success") {
      status = "done";
    } else {
      status = "error";
      error = `El workflow de GitHub Actions falló (${run.conclusion ?? "?"}). Revisa ${run.html_url}`;
    }
  }
  return {
    id: String(run.id),
    game,
    status,
    startedAt: new Date(run.created_at),
    finishedAt: run.status === "completed" ? new Date(run.updated_at) : null,
    logTail: [`GitHub Actions: ${run.html_url}`],
    error,
    snapshotId: null,
    packages: null,
  };
}

async function startGithubScrapeJob(game: string): Promise<ScrapeJob> {
  assertGithubConfig();

  const active = await findActiveWorkflowRun();
  if (active) {
    throw new Error("Ya hay una actualización de precios en curso (GitHub Actions).");
  }

  await githubApi<void>(
    `/repos/${GITHUB_REPO}/actions/workflows/${GITHUB_WORKFLOW}/dispatches`,
    {
      method: "POST",
      body: JSON.stringify({ ref: "main", inputs: { game } }),
    }
  );

  // The dispatch API returns 204 without the run id; give GitHub a moment to
  // register the run, then read the newest queued/in_progress one back.
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const run = (await findActiveWorkflowRun()) ?? (await getLatestWorkflowRun());
  if (!run) {
    throw new Error("El workflow se disparó pero GitHub no reporta la run todavía.");
  }
  return runToJob(run, game);
}

async function getLatestGithubJob(game: string): Promise<ScrapeJob | null> {
  if (!GITHUB_REPO || !GITHUB_TOKEN) return null;
  const run = await getLatestWorkflowRun();
  return run ? runToJob(run, game) : null;
}

// ---------------------------------------------------------------------------
// Public API (strategy switch lives here; the route handler stays thin).
// ---------------------------------------------------------------------------

export async function startScrapeJob(game: string): Promise<ScrapeJob> {
  if (!getSupplierGame(game)) {
    throw new Error(`Juego desconocido: ${game}`);
  }
  const scraper = getScraperForGame(game);
  if (!scraper) {
    throw new Error(`El juego "${game}" no tiene scraper configurado.`);
  }
  if (IS_VERCEL) {
    return startGithubScrapeJob(game);
  }
  return startLocalScrapeJob(game, scraper.script, scraper.resultsFile);
}

/** Detached copy of the latest job (per game when given). */
export async function getLatestScrapeJob(game?: string): Promise<ScrapeJob | null> {
  if (IS_VERCEL) {
    return getLatestGithubJob(game ?? "mlbb");
  }
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
