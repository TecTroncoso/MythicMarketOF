"use server"

import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { orders } from "@/lib/db/schema"
import { getAdminOrders, sanitizeAdminFilters } from "@/lib/admin-orders"
import type { AdminOrderFilters, AdminOrderRow, AdminStats } from "@/lib/admin-orders"

export async function setOrderStatus(
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  // 1. Verificar autorización de administrador
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    return { error: "No autorizado." }
  }

  // 2. Extraer y validar los datos del formulario
  const orderId = formData.get("orderId")
  const status = formData.get("status")

  if (status !== "paid" && status !== "cancelled") {
    return { error: "El estado de la orden no es válido." }
  }

  if (typeof orderId !== "string" || orderId.length === 0) {
    return { error: "Falta el identificador de la orden." }
  }

  // 3. Actualizar el estado en la base de datos
  try {
    await db.update(orders).set({ status }).where(eq(orders.id, orderId))
  } catch (error) {
    console.error("Error al actualizar el estado de la orden:", error)
    return { error: "No se pudo actualizar la orden. Intentá de nuevo." }
  }

  // 4. Refrescar la vista del panel (los searchParams se conservan)
  revalidatePath("/admin")
  return { success: true }
}

/**
 * Deletes an order permanently. Admin-only; the panel asks for confirmation
 * before submitting.
 */
export async function deleteOrder(
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  // 1. Verificar autorización de administrador
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    return { error: "No autorizado." }
  }

  // 2. Extraer y validar el identificador de la orden
  const orderId = formData.get("orderId")

  if (typeof orderId !== "string" || orderId.length === 0) {
    return { error: "Falta el identificador de la orden." }
  }

  // 3. Borrar la orden en la base de datos
  try {
    await db.delete(orders).where(eq(orders.id, orderId))
  } catch (error) {
    console.error("Error al borrar la orden:", error)
    return { error: "No se pudo borrar la orden. Intentá de nuevo." }
  }

  // 4. Refrescar la vista del panel (los searchParams se conservan)
  revalidatePath("/admin")
  return { success: true }
}

/**
 * Search endpoint for the client admin panel: called after debounce, no page
 * reload. Filters are re-sanitized server-side so the client can never inject
 * invalid query fragments. The panel re-renders from the returned rows/stats.
 */
export async function searchAdminOrders(
  filters: AdminOrderFilters
): Promise<{ orders: AdminOrderRow[]; stats: AdminStats }> {
  // 1. Verificar autorización de administrador
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("No autorizado.")
  }

  // 2. Re-sanitizar los filtros (nunca confiar en el cliente)
  const sanitized = sanitizeAdminFilters(
    filters as Record<string, string | string[] | undefined>
  )

  // 3. Consultar órdenes y estadísticas con los filtros ya saneados
  return getAdminOrders(sanitized)
}