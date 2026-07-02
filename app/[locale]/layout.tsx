import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

// Wraps all /en routes with an EN-locale NextIntlClientProvider.
// The root layout already provides FR messages for the default locale (/).
// Without this, client components (Navbar, SearchBar) keep the FR provider
// during client-side navigation from / to /en, since the root layout persists.
export default async function LocaleLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
