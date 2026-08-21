"use server"

import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"
import { signIn, signOut } from "@/auth"
import { AuthError } from "next-auth"
import { LoginSchema, RegisterSchema } from "@/lib/validations"
import { authRateLimiter, loginRateLimiter } from "@/lib/rate-limit"
import { verifyTurnstileToken } from "@/lib/turnstile"

export async function login(formData: FormData) {
  const email = formData.get("email")
  const password = formData.get("password")
  const turnstileResponse = formData.get("cf-turnstile-response") as string

  const isHuman = await verifyTurnstileToken(turnstileResponse)
  if (!isHuman) {
    return { error: "Verificación de seguridad fallida. Por favor intenta de nuevo." }
  }

  const validatedFields = LoginSchema.safeParse({ email, password })

  if (!validatedFields.success) {
    return { error: validatedFields.error.issues[0].message }
  }

  const { success } = await loginRateLimiter.limit(validatedFields.data.email)
  if (!success) {
    return { error: "Demasiados intentos fallidos. Intenta de nuevo más tarde." }
  }

  try {
    await signIn("credentials", {
      email: validatedFields.data.email,
      password: validatedFields.data.password,
      redirect: false,
    })
    return { success: true }
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Credenciales inválidas." }
        default:
          return { error: "Hubo un problema al iniciar sesión." }
      }
    }
    throw error // Important: Next.js redirects throw errors, we must rethrow
  }
}

export async function loginWithGoogle() {
  await signIn("google", { redirectTo: "/" })
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" })
}

export async function register(formData: FormData) {
  const data = Object.fromEntries(formData.entries())
  const turnstileResponse = formData.get("cf-turnstile-response") as string

  const isHuman = await verifyTurnstileToken(turnstileResponse)
  if (!isHuman) {
    return { error: "Verificación de seguridad fallida. Por favor intenta de nuevo." }
  }
  
  const validatedFields = RegisterSchema.safeParse(data)

  if (!validatedFields.success) {
    return { error: validatedFields.error.issues[0].message }
  }

  const { name, email, password } = validatedFields.data

  const { success } = await authRateLimiter.limit(email)
  if (!success) {
    return { error: "Demasiados intentos. Intenta de nuevo más tarde." }
  }

  try {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    })

    if (existingUser) {
      return { error: "El correo ya está en uso." }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    await db.insert(users).values({
      name,
      email,
      password: hashedPassword,
    })

    return { success: true }
  } catch (error) {
    console.error("Error al registrar usuario:", error)
    return { error: "Error interno del servidor. Inténtalo más tarde." }
  }
}
