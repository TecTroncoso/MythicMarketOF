import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getLatestScrapeJob,
  startScrapeJob,
  type ScrapeJob,
} from "@/lib/scrape-jobs";

// The scraper runs as a child process of the Node server (local) or via a
// GitHub Actions dispatch (Vercel).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serializeJob(job: ScrapeJob | null) {
  if (!job) return null;
  return {
    id: job.id,
    game: job.game,
    status: job.status,
    startedAt: job.startedAt.toISOString(),
    finishedAt: job.finishedAt?.toISOString() ?? null,
    logTail: job.logTail,
    error: job.error,
    snapshotId: job.snapshotId,
    packages: job.packages,
  };
}

/**
 * Start a scrape+import job. Body: { "game": "mlbb" }.
 * 202 with the job descriptor; 400 if the game has no scraper; 409 when
 * another scrape is already running.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const game =
    typeof body === "object" && body !== null && "game" in body
      ? String((body as { game: unknown }).game)
      : "";

  try {
    const job = await startScrapeJob(game);
    return NextResponse.json(serializeJob(job), { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo iniciar.";
    const busy = message.includes("en curso");
    return NextResponse.json(
      { error: message, job: serializeJob(await getLatestScrapeJob(game || undefined)) },
      { status: busy ? 409 : 400 }
    );
  }
}

/** Poll the latest job status. Optional ?game= filter. */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const game = new URL(request.url).searchParams.get("game") ?? undefined;

  return NextResponse.json(
    { job: serializeJob(await getLatestScrapeJob(game)) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
