import SignupClient from "./SignupForm";
import { getLocale } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: locale === "en" ? "Create an account" : "Créer un compte" };
}

export default function SignupPage() {
  return <SignupClient />;
}
