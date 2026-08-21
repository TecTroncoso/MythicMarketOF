import type { NextAuthConfig } from "next-auth"

/**
 * Config LIGERA para el middleware (Edge Runtime).
 * NO debe importar nada de Node.js (ni db, ni bcrypt, ni libsql).
 * Solo define las páginas y los callbacks que el middleware necesita.
 */
export const authConfig = {
  pages: {
    signIn: '/login',
  },
  providers: [], // Se rellenan en auth.ts con el spread
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role
      }
      return session
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnAdminPath = nextUrl.pathname.startsWith("/admin");

      if (isOnAdminPath) {
        if (!isLoggedIn) return false; // Redirige a signIn page
        if (auth?.user?.role !== "admin") {
          return Response.redirect(new URL("/", nextUrl));
        }
      }
      return true;
    }
  }
} satisfies NextAuthConfig
