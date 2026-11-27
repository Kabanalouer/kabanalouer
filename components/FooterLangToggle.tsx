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

  // Pastille à deux positions : la langue active est en noir forêt (aria-current), l'autre en gris.
  // Zone tactile : boutons de 36 px + 3 px de marge + bordure = 44 px de haut.
  const base =
    "min-h-9 rounded-[var(--radius-pill)] px-3.5 py-[7px] text-[13px] font-bold leading-none transition-colors focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]";
  const active = "bg-inverse text-white";
  const inactive = "bg-transparent text-charcoal-600 hover:text-charcoal-800";

  return (
    <div className="inline-flex gap-1 rounded-[var(--radius-pill)] border border-[var(--border-2)] bg-white p-[3px]">
      <button type="button" onClick={() => switchTo("fr")} aria-current={!isEn ? "true" : undefined} lang="fr" className={`${base} ${!isEn ? active : inactive}`}>
        FR
      </button>
      <button type="button" onClick={() => switchTo("en")} aria-current={isEn ? "true" : undefined} lang="en" className={`${base} ${isEn ? active : inactive}`}>
        EN
      </button>
    </div>
  );
}
