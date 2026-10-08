"use client";

import { usePathname, useRouter } from "next/navigation";

export default function FooterLangToggle() {
  const pathname = usePathname();
  const router = useRouter();

  const isEn = pathname.startsWith("/en");
  const basePath = isEn ? pathname.slice(3) || "/" : pathname;

  function switchTo(locale: "fr" | "en") {
    // Les adresses FR et EN diffèrent souvent (/chalets ↔ /en/cabins, slugs de
    // région traduits…) : on suit le lien hreflang que chaque page déclare,
    // et on ne préfixe/retire « /en » qu'à défaut.
    const alternate = document.querySelector<HTMLLinkElement>(`link[rel="alternate"][hreflang="${locale}"]`);
    if (alternate) {
      const url = new URL(alternate.href, window.location.origin);
      router.push(`${url.pathname}${window.location.search}`);
      return;
    }
    router.push(locale === "en" ? `/en${basePath}` : basePath);
  }

  return (
    <div
      className="relative flex rounded-full"
      style={{ backgroundColor: "#e8ebdc", width: 96, height: 36, padding: 2 }}
    >
      {/* Sliding thumb */}
      {/* Zone tactile : chaque bouton (46 px de large) déborde de 6 px en
          haut/bas (::after) pour atteindre 44 px de haut, visuel de 36 px. */}
      <div
        className={`absolute rounded-full transition-transform duration-200 ease ${isEn ? "translate-x-[46px]" : "translate-x-0"}`}
        style={{ backgroundColor: "#636e40", width: 46, height: 32, top: 2, left: 2 }}
      />
      <button
        type="button"
        onClick={() => switchTo("fr")}
        aria-pressed={!isEn}
        lang="fr"
        className={`relative z-10 flex-1 flex items-center justify-center text-sm font-medium after:absolute after:inset-x-0 after:-inset-y-[6px] after:content-[''] ${!isEn ? "text-white" : "text-charcoal-600"}`}
      >
        FR
      </button>
      <button
        type="button"
        onClick={() => switchTo("en")}
        aria-pressed={isEn}
        lang="en"
        className={`relative z-10 flex-1 flex items-center justify-center text-sm font-medium after:absolute after:inset-x-0 after:-inset-y-[6px] after:content-[''] ${isEn ? "text-white" : "text-charcoal-600"}`}
      >
        EN
      </button>
    </div>
  );
}
