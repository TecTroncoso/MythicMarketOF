"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { storeCombos } from "@/lib/db/schema";
import { getLatestSupplierSnapshot } from "@/lib/supplier-prices";
import { CreateStoreComboSchema, type CreateStoreComboInput } from "@/lib/validations";

export type ComboActionResult =
  | { success: true }
  | { success: false; error: string };

/** "3x Weekly Diamond Pass" or "2x A + 1x B" (80 chars max). */
function autoName(components: { packageName: string; qty: number }[]): string {
  const full = components
    .map((c) => `${c.qty}x ${c.packageName}`)
    .join(" + ");
  return full.length > 80 ? `${full.slice(0, 77)}...` : full;
}

/**
 * Admin-only: creates a combo from packages of the game's LATEST supplier
 * snapshot. Every component name must exist in that snapshot, otherwise the
 * combo could be priced against a package that is no longer offered.
 */
export async function createStoreCombo(
  input: CreateStoreComboInput
): Promise<ComboActionResult> {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return { success: false, error: "No autorizado." };
  }

  const parsed = CreateStoreComboSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { game, components } = parsed.data;
  const name = parsed.data.name?.trim() || autoName(components);

  const snapshot = await getLatestSupplierSnapshot(game);
  if (!snapshot) {
    return {
      success: false,
      error: "Todavía no hay precios del proveedor importados para este juego.",
    };
  }

  const knownNames = new Set(snapshot.rows.map((row) => row.packageName));
  const unknown = components
    .map((c) => c.packageName)
    .filter((packageName) => !knownNames.has(packageName));
  if (unknown.length > 0) {
    return {
      success: false,
      error: `Estos paquetes ya no están en el último snapshot: ${unknown.join(", ")}.`,
    };
  }

  try {
    await db.insert(storeCombos).values({
      game,
      name,
      components: JSON.stringify(components),
    });
  } catch (error) {
    console.error("Error al crear el combo:", error);
    return {
      success: false,
      error: "No se pudo guardar el combo. ¿Ejecutaste `npm run db:push` tras la migración?",
    };
  }

  revalidatePath(`/admin/precios/${game}`);
  revalidatePath("/topup/mlbb");
  return { success: true };
}

/** Admin-only: deletes a combo by id. */
export async function deleteStoreCombo(game: string, id: string): Promise<ComboActionResult> {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return { success: false, error: "No autorizado." };
  }
  if (typeof id !== "string" || id.length === 0) {
    return { success: false, error: "Combo inválido." };
  }

  try {
    await db.delete(storeCombos).where(eq(storeCombos.id, id));
  } catch (error) {
    console.error("Error al eliminar el combo:", error);
    return { success: false, error: "No se pudo eliminar el combo." };
  }

  revalidatePath(`/admin/precios/${game}`);
  revalidatePath("/topup/mlbb");
  return { success: true };
}
