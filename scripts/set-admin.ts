/**
 * Marks a user as admin by email.
 *
 * Usage: npm run set-admin -- <email>
 *
 * Sets role = 'admin' on the user row (the column already exists in the
 * schema and in the real Turso DB). Safe to re-run; idempotent.
 */
import "dotenv/config";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Load .env.local (Next.js convention) — dotenv/config alone reads .env.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../.env.local") });

import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { users } from "../lib/db/schema";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npm run set-admin -- <email>");
    process.exit(1);
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  await db.update(users).set({ role: "admin" }).where(eq(users.email, email));

  console.log(`✅ ${user.email} (${user.name ?? "sin nombre"}) ahora es admin.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});