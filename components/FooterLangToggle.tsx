"use client";

import { usePathname, useRouter } from "next/navigation";

export default function FooterLangToggle() {
  const pathname = usePathname();
  const router = useRouter();

  const isEn = pathname.startsWith("/en");
  const basePath = isEn ? pathname.slice(3) || "/" : pathname;

  function switchTo(locale: "fr" | "en") {
    if (locale === "en") {
      router.push(`/en${basePath}`);
    } else {
      router.push(basePath);
    }
  }

  return (
    <div className="flex items-center gap-1 rounded-full border border-[#ebebeb] p-0.5">
      <button
        onClick={() => switchTo("fr")}
        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
          !isEn
            ? "bg-primary/10 text-primary"
            : "text-charcoal-400 hover:text-charcoal-600"
        }`}
      >
        FR
      </button>
      <button
        onClick={() => switchTo("en")}
        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
          isEn
            ? "bg-primary/10 text-primary"
            : "text-charcoal-400 hover:text-charcoal-600"
        }`}
      >
        EN
      </button>
    </div>
  );
}
