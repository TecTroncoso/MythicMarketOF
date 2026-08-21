import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Iniciar Sesión | Mythic Market",
};

export default function LoginPage() {
  return <LoginForm />;
}
