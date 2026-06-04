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
    <div className="flex items-center gap-2">
      <button
        onClick={() => switchTo("fr")}
        className={`px-4 py-1.5 rounded-full font-medium transition-colors border ${
          !isEn
            ? "bg-primary text-white border-primary"
            : "bg-transparent text-charcoal-400 border-[#ebebeb] hover:text-charcoal-600"
        }`}
        style={{ fontSize: 13 }}
      >
        FR
      </button>
      <button
        onClick={() => switchTo("en")}
        className={`px-4 py-1.5 rounded-full font-medium transition-colors border ${
          isEn
            ? "bg-primary text-white border-primary"
            : "bg-transparent text-charcoal-400 border-[#ebebeb] hover:text-charcoal-600"
        }`}
        style={{ fontSize: 13 }}
      >
        EN
      </button>
    </div>
  );
}
