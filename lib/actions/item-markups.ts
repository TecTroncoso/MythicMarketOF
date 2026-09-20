"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { itemMarkups } from "@/lib/db/schema";
import { ItemMarkupSchema, type ItemMarkupInput } from "@/lib/validations";

export type ItemMarkupResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Admin-only: upserts the per-currency markup of ONE sellable item (a
 * supplier package slug or a combo id). Overrides the game-level default for
 * that item only. Takes effect immediately on the storefront.
 */
export async function saveItemMarkup(
  input: ItemMarkupInput
): Promise<ItemMarkupResult> {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return { success: false, error: "No autorizado." };
  }

  const parsed = ItemMarkupSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { game, itemKey, markupUsd, markupEur } = parsed.data;

  try {
    await db
      .insert(itemMarkups)
      .values({
        game,
        itemKey,
        markupUsd,
        markupEur,
        updatedAt: new Date(),
        updatedBy: session.user.email ?? session.user.id ?? null,
      })
      .onConflictDoUpdate({
        target: [itemMarkups.game, itemMarkups.itemKey],
        set: {
          markupUsd,
          markupEur,
          updatedAt: new Date(),
          updatedBy: session.user.email ?? session.user.id ?? null,
        },
      });
  } catch (error) {
    console.error("Error al guardar el markup del item:", error);
    return {
      success: false,
      error: "No se pudo guardar el markup. ¿Ejecutaste `npm run db:push` tras la migración?",
    };
  }

  revalidatePath(`/admin/precios/${game}`);
  revalidatePath("/topup/mlbb");
  return { success: true };
}

/**
 * Admin-only: removes an item override so it goes back to the game-level
 * default markup.
 */
export async function resetItemMarkup(
  game: string,
  itemKey: string
): Promise<ItemMarkupResult> {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return { success: false, error: "No autorizado." };
  }
  if (typeof game !== "string" || !game || typeof itemKey !== "string" || !itemKey) {
    return { success: false, error: "Item inválido." };
  }

  try {
    await db
      .delete(itemMarkups)
      .where(and(eq(itemMarkups.game, game), eq(itemMarkups.itemKey, itemKey)));
  } catch (error) {
    console.error("Error al restablecer el markup del item:", error);
    return { success: false, error: "No se pudo restablecer el markup." };
  }

  revalidatePath(`/admin/precios/${game}`);
  revalidatePath("/topup/mlbb");
  return { success: true };
}
