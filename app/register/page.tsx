import type { Metadata } from "next";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = {
  title: "Crear Cuenta | Mythic Market",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
