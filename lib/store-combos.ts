// Store combos: admin-defined packages whose cost is the SUM of other
// supplier packages' checkout prices (x quantities). The component list is
// stored as JSON and resolved live against the latest supplier snapshot, so
// a combo automatically tracks supplier price changes and disappears from
// the storefront if one of its components stops being quoted.

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { storeCombos } from "@/lib/db/schema";

export interface ComboComponent {
  packageName: string;
  qty: number;
}

export interface StoreComboDef {
  id: string;
  name: string;
  components: ComboComponent[];
}

function parseComponents(raw: string): ComboComponent[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c): c is ComboComponent =>
        typeof c === "object" &&
        c !== null &&
        typeof (c as ComboComponent).packageName === "string" &&
        Number.isInteger((c as ComboComponent).qty) &&
        (c as ComboComponent).qty > 0
    );
  } catch {
    return [];
  }
}

/**
 * All combos of a game. Combos whose stored components fail JSON validation
 * are skipped (defensive: a hand-edited row must not break the storefront).
 * Returns [] when the table is unavailable (migration pending).
 */
export async function getStoreCombos(game: string): Promise<StoreComboDef[]> {
  try {
    const rows = await db
      .select()
      .from(storeCombos)
      .where(eq(storeCombos.game, game));

    return rows
      .map((row) => ({
        id: row.id,
        name: row.name,
        components: parseComponents(row.components),
      }))
      .filter((combo) => combo.components.length > 0);
  } catch (error) {
    console.error(`No se pudieron leer los combos de "${game}":`, error);
    return [];
  }
}
