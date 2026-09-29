"use client";

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import type { PhotoItem } from "@/lib/photo";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

function displayCaption(photo: PhotoItem, locale: string): string {
  return (locale === "en" && photo.caption_en) ? photo.caption_en : photo.caption;
}

interface Props {
  photos: PhotoItem[];
  title: string;
}

export default function PhotoGallery({ photos, title }: Props) {
  const t = useTranslations("listing");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);
  // Index visé par un défilement programmatique (flèches, miniatures,
  // clavier) : tant qu'il n'est pas atteint, les positions intermédiaires du
  // défilement ne doivent pas réécrire idx.
  const targetRef = useRef<number | null>(null);
  const locale = useLocale();

  // Carrousel mobile en ligne (fiche) — index courant + plus grand index vu,
  // pour ne charger les photos qu'au fil du balayage.
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroIdx, setHeroIdx] = useState(0);
  const [heroMax, setHeroMax] = useState(0);

  const close = () => setOpen(false);
  const openAt = (i: number) => { setIdx(i); setOpen(true); };

  const prev = useCallback(() => {
    setIdx((i) => (i - 1 + photos.length) % photos.length);
  }, [photos.length]);

  const next = useCallback(() => {
    setIdx((i) => (i + 1) % photos.length);
  }, [photos.length]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, prev, next]);

  useBodyScrollLock(open);

  // À l'ouverture : positionner la piste sur la photo choisie, sans animation.
  useLayoutEffect(() => {
    if (!open) return;
    const el = trackRef.current;
    if (el) el.scrollLeft = idx * el.clientWidth;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // idx modifié par flèches / miniatures / clavier → faire défiler la piste.
  useEffect(() => {
    if (!open) return;
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    const current = Math.round(el.scrollLeft / el.clientWidth);
    if (current === idx) { targetRef.current = null; return; }
    targetRef.current = idx;
    el.scrollTo({ left: idx * el.clientWidth, behavior: Math.abs(current - idx) > 1 ? "instant" as ScrollBehavior : "smooth" });
  }, [idx, open]);

  // Rotation / redimensionnement : réaligner sur la photo courante.
  useEffect(() => {
    if (!open) return;
    const onResize = () => {
      const el = trackRef.current;
      if (el) el.scrollLeft = idx * el.clientWidth;
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [idx, open]);

  // Balayage au doigt (scroll-snap natif) → synchroniser le compteur.
  const onTrackScroll = () => {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (targetRef.current !== null) {
      if (i === targetRef.current) targetRef.current = null;
      return;
    }
    if (i !== idx && i >= 0 && i < photos.length) setIdx(i);
  };

  const onHeroScroll = () => {
    const el = heroRef.current;
    if (!el || el.clientWidth === 0) return;
    const i = Math.min(photos.length - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth)));
    if (i !== heroIdx) setHeroIdx(i);
    if (i > heroMax) setHeroMax(i);
  };

  useEffect(() => {
    if (!open) return;
    thumbRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [idx, open]);

  const activePhoto = photos[idx];
  const caption = activePhoto ? displayCaption(activePhoto, locale) : "";

  return (
    <>
      {/* ── Gallery grid ── */}
      <div className="mb-8">

        {/* Mobile : carrousel balayable (scroll-snap), toucher = plein écran */}
        <div className="md:hidden relative h-72 overflow-hidden rounded-xl">
          <div
            ref={heroRef}
            onScroll={onHeroScroll}
            className="flex h-full overflow-x-auto snap-x snap-mandatory overscroll-x-contain [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: "none" }}
          >
            {photos.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => openAt(i)}
                className="relative w-full h-full shrink-0 snap-center snap-always cursor-zoom-in bg-charcoal-100"
                aria-label={t("goToPhoto", { number: i + 1 })}
              >
                {i <= heroMax + 1 && (
                  <Image
                    src={p.url}
                    alt={displayCaption(p, locale) || (i === 0 ? title : `${locale === "en" ? "Cabin" : "Chalet"} ${title} – photo ${i + 1}`)}
                    fill
                    className="object-cover"
                    sizes="100vw"
                    {...(i === 0 ? { priority: true, fetchPriority: "high" as const } : {})}
                  />
                )}
              </button>
            ))}
          </div>
          {photos.length > 1 && (
            <span className="absolute bottom-3 left-3 bg-black/60 text-white text-xs font-semibold px-2.5 py-1 rounded-full tabular-nums pointer-events-none">
              {heroIdx + 1} / {photos.length}
            </span>
          )}
          {photos.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); openAt(heroIdx); }}
              className="absolute bottom-3 right-3 flex items-center gap-2 bg-white text-charcoal-800 text-sm font-semibold px-4 py-2 rounded-xl shadow-lg hover:bg-charcoal-100 active:scale-[0.98] transition-all duration-150 border border-[#ebebeb]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {t("showAllPhotos", { count: photos.length })}
            </button>
          )}
        </div>

        {/* Desktop: 1 grande + 4 miniatures */}
        <div className="hidden md:block relative">
          <div
            className="grid grid-cols-4 grid-rows-2 gap-2 h-96 overflow-hidden rounded-xl cursor-zoom-in"
            onClick={() => { setIdx(0); setOpen(true); }}
          >
            <div className={`relative overflow-hidden group ${photos.length > 1 ? "col-span-2 row-span-2" : "col-span-4 row-span-2"}`}>
              {/* Pas de priority ici : son préchargement partait aussi sur téléphone (grille
                  masquée), en double avec la photo du carrousel mobile. */}
              <Image src={photos[0].url} alt={displayCaption(photos[0], locale) || title} fill className="object-cover" sizes="50vw" fetchPriority="high" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 pointer-events-none" />
            </div>
            {photos.slice(1, 5).map((p, i) => (
              <div key={i} className="relative overflow-hidden bg-charcoal-50 group">
                <Image src={p.url} alt={displayCaption(p, locale) || `${locale === "en" ? "Cabin" : "Chalet"} ${title} – photo ${i + 2}`} fill className="object-cover" sizes="25vw" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 pointer-events-none" />
              </div>
            ))}
          </div>

          {photos.length > 5 && (
            <button
              onClick={(e) => { e.stopPropagation(); setIdx(0); setOpen(true); }}
              className="absolute bottom-3 right-3 flex items-center gap-2 bg-white text-charcoal-800 text-sm font-semibold px-4 py-2 rounded-xl shadow-lg hover:bg-charcoal-100 hover:scale-[1.03] active:scale-[0.98] transition-all duration-150 border border-[#ebebeb]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {t("showAllPhotos", { count: photos.length })}
            </button>
          )}
        </div>

      </div>

      {/* ── Fullscreen carousel ── (portail vers <body> : hors de tout
          contexte d'empilement, au-dessus de la barre de navigation) */}
      {open && createPortal(
        <div
          className="fixed inset-0 z-[70] bg-black flex flex-col select-none"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >

          {/* Top bar */}
          <div className="flex items-center justify-between pl-5 pr-2 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2 shrink-0">
            <span className="text-white/70 text-sm font-medium tabular-nums">
              {idx + 1} / {photos.length}
            </span>
            <button
              onClick={close}
              className="w-11 h-11 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              aria-label={tc("close")}
            >
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Piste balayable : une diapositive par photo, scroll-snap natif */}
          <div className="flex-1 relative min-h-0">
            <div
              ref={trackRef}
              onScroll={onTrackScroll}
              onPointerDown={() => { targetRef.current = null; }}
              className="absolute inset-0 flex overflow-x-auto snap-x snap-mandatory overscroll-x-contain [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: "none" }}
            >
              {photos.map((p, i) => {
                const near = Math.abs(i - idx) <= 1;
                return (
                  <div key={i} className="relative w-full h-full shrink-0 snap-center snap-always sm:px-20">
                    {Math.abs(i - idx) <= 2 && (
                      <div className="relative w-full h-full">
                        <Image
                          src={p.url}
                          alt={displayCaption(p, locale) || `${locale === "en" ? "Cabin" : "Chalet"} ${title} – photo ${i + 1}`}
                          fill
                          className="object-contain"
                          sizes="100vw"
                          loading={near ? "eager" : "lazy"}
                          {...(i === idx ? { fetchPriority: "high" as const } : {})}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Caption overlay */}
            {caption && (
              <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-20 pb-3 pointer-events-none">
                <div className="bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2.5 text-center">
                  <p className="text-white text-sm leading-relaxed">{caption}</p>
                </div>
              </div>
            )}

            {/* Prev arrow — masquée sur écrans tactiles (balayage disponible) */}
            {photos.length > 1 && (
              <button
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/25 text-white rounded-full p-3 transition-colors z-10 [@media(hover:none)]:hidden"
                aria-label={t("photoPrevious")}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {/* Next arrow */}
            {photos.length > 1 && (
              <button
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/25 text-white rounded-full p-3 transition-colors z-10 [@media(hover:none)]:hidden"
                aria-label={t("photoNext")}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>

          {/* Thumbnail strip */}
          <div
            className="shrink-0 flex gap-2 overflow-x-auto px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: "none" }}
          >
            {photos.map((p, i) => (
              <button
                key={i}
                ref={(el) => { thumbRefs.current[i] = el; }}
                onClick={() => setIdx(i)}
                className={`relative shrink-0 w-16 h-12 sm:w-20 sm:h-14 rounded-lg overflow-hidden transition-all ${
                  i === idx ? "ring-2 ring-white opacity-100" : "opacity-40 hover:opacity-70"
                }`}
                aria-label={t("goToPhoto", { number: i + 1 })}
              >
                <Image src={p.url} alt="" fill className="object-cover" sizes="80px" />
              </button>
            ))}
          </div>

        </div>,
        document.body
      )}
    </>
  );
}
