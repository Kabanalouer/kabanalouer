import ResetPasswordClient from "./ResetPasswordForm";
import { getLocale } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: locale === "en" ? "Reset password" : "Réinitialiser le mot de passe" };
}

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
