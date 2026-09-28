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
      style={{ backgroundColor: "#e8ebdc", width: 80, height: 30, padding: 2 }}
    >
      {/* Sliding thumb */}
      <div
        className={`absolute rounded-full transition-transform duration-200 ease ${isEn ? "translate-x-[38px]" : "translate-x-0"}`}
        style={{ backgroundColor: "#636e40", width: 38, height: 26, top: 2, left: 2 }}
      />
      <button
        onClick={() => switchTo("fr")}
        className={`relative z-10 flex-1 flex items-center justify-center text-sm font-medium ${!isEn ? "text-white" : "text-[#888]"}`}
      >
        FR
      </button>
      <button
        onClick={() => switchTo("en")}
        className={`relative z-10 flex-1 flex items-center justify-center text-sm font-medium ${isEn ? "text-white" : "text-[#888]"}`}
      >
        EN
      </button>
    </div>
  );
}
