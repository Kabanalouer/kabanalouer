import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { themeImage } from "@/lib/themeImages";

// En-tête des pages par thème (spa, bord de l'eau, chiens, billard, borne de recharge, télétravail et leurs
// pages région × type / ville × type). Avec une photo de thème (public/images/themes/, choix de Simon du
// 2026-10-22) : grand hero photo comme les pages région. Sans photo (mobilité réduite, pas cher) : l'ancien
// bandeau gris avec icône. Le z-10 laisse la barre de recherche ouvrir ses menus par-dessus la suite.

export type ThemeCrumb = { label: string; href?: string };

export default function ThemeHero({
  themeKey,
  crumbs,
  title,
  intro,
  icon,
  isEn,
  children,
}: {
  themeKey: string;
  crumbs: ThemeCrumb[];
  title: string;
  intro: string;
  icon: ReactNode;
  isEn: boolean;
  children: ReactNode;
}) {
  const image = themeImage(themeKey);
  const link = image
    ? "inline-block py-2 -my-2 hover:text-white transition-colors"
    : "inline-block py-2 -my-2 hover:text-primary hover:underline transition-colors";

  const content = (
    <div className={image ? "relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-14 text-center text-white" : "max-w-3xl mx-auto px-4 sm:px-6 text-center"}>
      <nav
        className={`text-sm mb-4 flex items-center justify-center gap-1.5 flex-wrap ${image ? "text-white/80" : "text-charcoal-400"}`}
        aria-label={isEn ? "Breadcrumb" : "Fil d’Ariane"}
      >
        {crumbs.map((c, i) => (
          <span key={`${c.label}-${i}`} className="inline-flex items-center gap-1.5">
            {i > 0 && <span>›</span>}
            {c.href ? (
              <Link href={c.href} className={link}>{c.label}</Link>
            ) : (
              <span className={image ? "text-white/90" : "text-charcoal-600"}>{c.label}</span>
            )}
          </span>
        ))}
      </nav>
      {!image && (
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">{icon}</div>
      )}
      <h1 className={`text-3xl md:text-4xl font-bold mb-3 ${image ? "lg:text-5xl leading-tight" : "text-charcoal-900"}`}>{title}</h1>
      <p className={`mb-8 ${image ? "text-lg text-white/85" : "text-base text-charcoal-500"}`}>{intro}</p>
      <div className="flex justify-center">{children}</div>
    </div>
  );

  if (!image) {
    return <section className="bg-charcoal-50 border-b border-charcoal-100 py-16">{content}</section>;
  }

  return (
    <section className="relative min-h-[460px] z-10 flex items-center">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* next/image en priorité plutôt qu'un fond CSS : élément LCP de la page, découvert dès le HTML */}
        <Image src={image} alt="" fill priority fetchPriority="high" quality={60} sizes="100vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/50 to-black/75" />
      </div>
      <div className="relative w-full">{content}</div>
    </section>
  );
}
