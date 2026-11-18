import type { Metadata } from "next";
import { authErrorMessage } from "@/lib/auth-errors";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Iniciar Sesión | Mythic Market",
};

interface LoginPageProps {
  searchParams: Promise<{ error?: string; mode?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <LoginForm
      initialError={authErrorMessage(params.error)}
      initialMode={params.mode === "email" ? "magic" : "password"}
    />
  );
}
