"use client";

import { usePathname, useRouter } from "next/navigation";

export default function FooterLangToggle() {
  const pathname = usePathname();
  const router = useRouter();

  const isEn = pathname.startsWith("/en");
  const basePath = isEn ? pathname.slice(3) || "/" : pathname;

  function switchTo(locale: "fr" | "en") {
    router.push(locale === "en" ? `/en${basePath}` : basePath);
  }

  return (
    <div
      className="relative flex rounded-full"
      style={{ backgroundColor: "#e8ebdc", width: 90, height: 32, padding: 3 }}
    >
      {/* Sliding thumb */}
      <div
        className="absolute rounded-full"
        style={{
          backgroundColor: "#636e40",
          width: 42,
          height: 26,
          top: 3,
          left: 3,
          transform: isEn ? "translateX(42px)" : "translateX(0)",
          transition: "transform 200ms ease",
        }}
      />
      <button
        onClick={() => switchTo("fr")}
        className="relative z-10 flex-1 flex items-center justify-center font-medium"
        style={{ fontSize: 13, color: !isEn ? "white" : "#9ca3af" }}
      >
        FR
      </button>
      <button
        onClick={() => switchTo("en")}
        className="relative z-10 flex-1 flex items-center justify-center font-medium"
        style={{ fontSize: 13, color: isEn ? "white" : "#9ca3af" }}
      >
        EN
      </button>
    </div>
  );
}
