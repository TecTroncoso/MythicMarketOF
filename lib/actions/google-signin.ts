"use server"

import { loginWithGoogle } from "@/lib/actions/auth"

export async function googleSignInAction() {
  await loginWithGoogle()
}
