import NextAuth from "next-auth"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import Email from "next-auth/providers/email"
import bcrypt from "bcryptjs"
import { db } from "./lib/db"
import { users } from "./lib/db/schema"
import { eq } from "drizzle-orm"
import { authConfig } from "./auth.config"
import { LoginSchema } from "./lib/validations"
import { DEFAULT_RESEND_FROM, sendMagicLinkEmail } from "./lib/magic-link-email"

// Re-exported so tests can mock @/auth as a single unit without
// reaching into next-auth directly. Zero runtime impact.
export { AuthError } from "next-auth"

// Cada método se registra SOLO si tiene credenciales. Así un Google OAuth
// deshabilitado (o sin variables en Vercel) no rompe el resto del login, y el
// magic link por email queda opcional.
const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
)
const emailEnabled = Boolean(process.env.RESEND_API_KEY)

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  session: { strategy: "jwt" },
  ...authConfig,
  // En Vercel Auth.js ya lo infiere (env VERCEL), pero lo dejamos explícito
  // para self-hosting y para que los enlaces del magic link usen el host real.
  trustHost: true,
  providers: [
    ...(googleEnabled
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            // Google verifica el email: si ya existe una cuenta con esa
            // dirección (registro con contraseña), la vinculamos en vez de
            // lanzar OAuthAccountNotLinked y rebotar al login sin mensaje.
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    ...(emailEnabled
      ? [
          Email({
            // El provider exige `server` aunque usemos nuestra propia función
            // de envío (el import de nodemailer es de nivel superior).
            server: {
              host: "smtp.resend.com",
              port: 465,
              auth: {
                user: "resend",
                pass: process.env.RESEND_API_KEY,
              },
            },
            from: process.env.RESEND_FROM_EMAIL || DEFAULT_RESEND_FROM,
            // El enlace vence en 10 minutos: menos ventana para reusarlo.
            maxAge: 10 * 60,
            sendVerificationRequest: sendMagicLinkEmail,
          }),
        ]
      : []),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const validatedFields = LoginSchema.safeParse(credentials)

        if (!validatedFields.success) {
          return null
        }

        // Los emails se guardan normalizados (minúsculas) desde register() y
        // desde el magic link; normalizamos acá para no fallar por mayúsculas.
        const email = validatedFields.data.email.trim().toLowerCase()
        const { password } = validatedFields.data

        const userRecord = await db.query.users.findFirst({
          where: eq(users.email, email),
        })

        if (!userRecord || !userRecord.password) {
          return null
        }

        const passwordsMatch = await bcrypt.compare(
          password,
          userRecord.password
        )

        if (!passwordsMatch) return null

        // Never expose the password hash in the returned object / token.
        const { password: _pw, ...safeUser } = userRecord
        return safeUser as typeof userRecord
      },
    }),
  ],
})
