import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: string =
    requested === "fr" || requested === "en" ? requested : routing.defaultLocale;

  const messages =
    locale === "en"
      ? (await import("../messages/en.json")).default
      : (await import("../messages/fr.json")).default;

  return { locale, messages };
});
