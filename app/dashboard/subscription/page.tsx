import SubscriptionClient from "./SubscriptionClient";
import { getLocale } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: locale === "en" ? "My subscription" : "Mon abonnement" };
}

export default function SubscriptionPage() {
  return <SubscriptionClient />;
}
