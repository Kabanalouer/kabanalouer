import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";

// Wraps all /en routes with an EN-locale NextIntlClientProvider.
// The root layout already provides FR messages for the default locale (/).
// Without this, client components (Navbar, SearchBar) keep the FR provider
// during client-side navigation from / to /en, since the root layout persists.
//
// Le segment [locale] attrape aussi tout ce que le middleware ne réécrit pas
// (ex. un fichier inexistant /image.png) : sans cette vérification, Next.js
// rendait la page d'accueil avec un code 200 au lieu d'un vrai 404.
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as Locale)) notFound();
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
