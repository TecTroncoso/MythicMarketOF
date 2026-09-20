"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { pricingSettings } from "@/lib/db/schema";
import { PricingSettingsSchema, type PricingSettingsInput } from "@/lib/validations";

export type SavePricingResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Admin-only: upserts the per-currency retail markups of a game. Both the
 * admin prices page and the storefront top-up page are revalidated so the
 * new prices are visible immediately.
 */
export async function savePricingSettings(
  input: PricingSettingsInput
): Promise<SavePricingResult> {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return { success: false, error: "No autorizado." };
  }

  const parsed = PricingSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { game, markupUsd, markupEur } = parsed.data;

  try {
    await db
      .insert(pricingSettings)
      .values({
        game,
        markupUsd,
        markupEur,
        updatedAt: new Date(),
        updatedBy: session.user.email ?? session.user.id ?? null,
      })
      .onConflictDoUpdate({
        target: pricingSettings.game,
        set: {
          markupUsd,
          markupEur,
          updatedAt: new Date(),
          updatedBy: session.user.email ?? session.user.id ?? null,
        },
      });
  } catch (error) {
    console.error("Error al guardar los markups:", error);
    return {
      success: false,
      error: "No se pudieron guardar los markups. ¿Ejecutaste `npm run db:push` tras la migración?",
    };
  }

  revalidatePath(`/admin/precios/${game}`);
  revalidatePath("/topup/mlbb");
  return { success: true };
}
