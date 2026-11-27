"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Carrousel d'une rangée (bord de l'eau, accueil) : en-tête (H2 + lien) à gauche, flèches rondes de 44 px à droite
// (cachées sous 768 px : on balaie au doigt), rangée en défilement natif avec accroche (scroll-snap) qui déborde à droite
// jusqu'au bord de l'écran. Les largeurs de cartes sont dans app/globals.css (.show-scroller / .show-card).
export default function ShowcaseCarousel({
  header,
  prevLabel,
  nextLabel,
  children,
}: {
  header: React.ReactNode;
  prevLabel: string;
  nextLabel: string;
  children: React.ReactNode;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const update = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update]);

  // Une largeur de carte + l'espace entre les cartes ; sans animation si le visiteur la réduit.
  const scrollByCard = (dir: 1 | -1) => {
    const el = scroller.current;
    const card = el?.querySelector<HTMLElement>(".show-card");
    if (!el || !card) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 20;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * (card.offsetWidth + gap), behavior: reduced ? "auto" : "smooth" });
  };

  const arrow =
    "hidden md:flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-2)] bg-white transition-colors enabled:text-[var(--fg-1)] enabled:hover:bg-charcoal-50 disabled:cursor-default disabled:text-charcoal-300 disabled:opacity-60";

  return (
    <div className="show-wrap">
      <div className="show-inner mb-6 sm:mb-8 flex items-end justify-between gap-4">
        <div className="min-w-0">{header}</div>
        <div className="flex shrink-0 gap-2">
          <button type="button" aria-label={prevLabel} disabled={atStart} onClick={() => scrollByCard(-1)} className={arrow}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button type="button" aria-label={nextLabel} disabled={atEnd} onClick={() => scrollByCard(1)} className={arrow}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      <div ref={scroller} onScroll={update} className="show-scroller">
        {children}
      </div>
    </div>
  );
}
