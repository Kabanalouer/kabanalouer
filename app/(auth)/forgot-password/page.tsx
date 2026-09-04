import ForgotPasswordClient from "./ForgotPasswordForm";
import { getLocale } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: locale === "en" ? "Forgot password" : "Mot de passe oublié" };
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
