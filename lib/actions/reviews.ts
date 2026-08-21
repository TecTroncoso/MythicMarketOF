"use server"

import { desc, eq } from "drizzle-orm"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { reviews, users } from "@/lib/db/schema"

export type ReviewWithAuthor = {
  id: string;
  rating: number;
  text: string;
  createdAt: Date;
  displayName: string;
};

export async function getReviews(): Promise<ReviewWithAuthor[]> {
  const rows = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      text: reviews.text,
      createdAt: reviews.createdAt,
      name: users.name,
      email: users.email,
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.userId, users.id))
    .orderBy(desc(reviews.createdAt))
    .limit(50)

  return rows.map((row) => ({
    id: row.id,
    rating: row.rating,
    text: row.text,
    createdAt: row.createdAt,
    displayName: row.name?.trim() || row.email?.split("@")[0] || "Cliente",
  }))
}

export async function createReview(input: {
  rating: number
  text: string
}): Promise<{ error?: string; review?: ReviewWithAuthor }> {
  // 1. Verificar que el usuario tenga sesión iniciada
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Debés iniciar sesión para dejar una reseña." }
  }

  const { rating, text } = input

  // 2. Validar la calificación: entero entre 1 y 5
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "La calificación debe ser un número entero entre 1 y 5." }
  }

  // 3. Validar el comentario: texto no vacío de hasta 500 caracteres
  if (typeof text !== "string" || text.trim().length === 0) {
    return { error: "El comentario no puede estar vacío." }
  }
  if (text.trim().length > 500) {
    return { error: "El comentario no puede superar los 500 caracteres." }
  }

  const trimmedText = text.trim()

  // 4. Guardar la reseña en la base de datos
  try {
    await db.insert(reviews).values({
      userId: session.user.id,
      rating,
      text: trimmedText,
    })
  } catch (error) {
    console.error("Error al crear la reseña:", error)
    return { error: "No se pudo guardar la reseña. Intentá de nuevo." }
  }

  return {
    review: {
      id: crypto.randomUUID(),
      rating,
      text: trimmedText,
      createdAt: new Date(),
      displayName:
        session.user.name?.trim() || session.user.email?.split("@")[0] || "Cliente",
    },
  }
}