import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: "user" | "admin"
    } & DefaultSession["user"]
  }

  interface User {
    role: "user" | "admin"
  }
}

// Auth.js v5 declares the JWT interface in @auth/core/jwt; augmenting only
// "next-auth/jwt" leaves token.role as unknown in the callbacks.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string
    role: "user" | "admin"
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: "user" | "admin"
  }
}
