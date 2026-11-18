"use server"

import { headers } from "next/headers"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"
import { signIn, signOut } from "@/auth"
import { AuthError } from "next-auth"
import { EmailSchema, LoginSchema, RegisterSchema } from "@/lib/validations"
import {
  authRateLimiter,
  loginRateLimiter,
  magicLinkRateLimiter,
} from "@/lib/rate-limit"
import { getClientIp } from "@/lib/client-ip"
import { authErrorMessage } from "@/lib/auth-errors"
import { verifyTurnstileToken } from "@/lib/turnstile"

// Todos los emails se guardan y se buscan en minúsculas. Sin esto, un usuario
// registrado como "User@Gmail.com" y un magic link pedido como
// "user@gmail.com" serían dos cuentas distintas para el adapter.
function normalizeEmail(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim().toLowerCase()
}

export async function login(formData: FormData) {
  const email = normalizeEmail(formData.get("email"))
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

/**
 * Login sin contraseña: manda un magic link por email (Resend). Crea la cuenta
 * la primera vez que se usa, así que también sirve como registro.
 */
export async function loginWithEmail(formData: FormData) {
  const email = normalizeEmail(formData.get("email"))
  const turnstileResponse = String(formData.get("cf-turnstile-response") ?? "")

  const isHuman = await verifyTurnstileToken(turnstileResponse)
  if (!isHuman) {
    return { error: "Verificación de seguridad fallida. Por favor intenta de nuevo." }
  }

  const parsed = EmailSchema.safeParse({ email })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  // Dos límites: uno por email (5/min) y otro por IP (10/min). El segundo
  // evita que una sola conexión queme los emails mensuales de Resend.
  const perEmail = await authRateLimiter.limit(`magic:${email}`)
  if (!perEmail.success) {
    return { error: "Demasiados intentos. Intenta de nuevo más tarde." }
  }

  const ip = getClientIp(await headers())
  const perIp = await magicLinkRateLimiter.limit(`magic-ip:${ip}`)
  if (!perIp.success) {
    return {
      error: "Demasiados pedidos desde tu conexión. Esperá un minuto e intentá de nuevo.",
    }
  }

  try {
    const redirectUrl = await signIn("email", {
      email,
      redirect: false,
      redirectTo: "/dashboard",
    })
    // Auth.js devuelve la URL de error en vez de lanzar cuando el envío falla.
    if (typeof redirectUrl === "string" && redirectUrl.includes("/error")) {
      return {
        error: "No pudimos enviar el enlace. Revisá el email e intentá de nuevo.",
      }
    }
    return { success: true }
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error:
          authErrorMessage(error.type) ??
          "No pudimos enviar el enlace. Intenta de nuevo.",
      }
    }
    throw error
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
  const email = normalizeEmail(formData.get("email"))
  const turnstileResponse = formData.get("cf-turnstile-response") as string

  const isHuman = await verifyTurnstileToken(turnstileResponse)
  if (!isHuman) {
    return { error: "Verificación de seguridad fallida. Por favor intenta de nuevo." }
  }

  const validatedFields = RegisterSchema.safeParse({ ...data, email })

  if (!validatedFields.success) {
    return { error: validatedFields.error.issues[0].message }
  }

  const { name, password: validatedPassword } = validatedFields.data

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

    const hashedPassword = await bcrypt.hash(validatedPassword, 10)

    await db.insert(users).values({
      name,
      email,
      password: hashedPassword,
    })

    // Auto-login: evita mandar al usuario a /login a reescribir la contraseña
    // (y a pasar Turnstile otra vez) justo después de registrarse.
    try {
      await signIn("credentials", {
        email,
        password: validatedPassword,
        redirect: false,
      })
    } catch (error) {
      // La cuenta ya existe: si el auto-login falla, el login manual funciona.
      console.error("Auto-login tras registro falló:", error)
    }

    return { success: true }
  } catch (error) {
    console.error("Error al registrar usuario:", error)
    return { error: "Error interno del servidor. Inténtalo más tarde." }
  }
}
