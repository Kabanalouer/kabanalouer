import LoginClient from "./LoginForm";
import { getLocale } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: locale === "en" ? "Log in" : "Se connecter" };
}

export default function LoginPage() {
  return <LoginClient />;
}
