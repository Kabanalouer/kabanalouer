"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import type { PhotoItem } from "@/lib/photo";

interface Props {
  photos: PhotoItem[];
  title: string;
}

export default function PhotoGallery({ photos, title }: Props) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const close = () => setOpen(false);

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

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    thumbRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [idx, open]);

  const caption = photos[idx]?.caption ?? "";

  return (
    <>
      {/* ── Gallery grid ── */}
      <div className="mb-8">

        {/* Mobile: photo de couverture uniquement */}
        <div
          className="md:hidden relative h-72 overflow-hidden rounded-xl cursor-zoom-in"
          onClick={() => { setIdx(0); setOpen(true); }}
        >
          <Image src={photos[0].url} alt={photos[0].caption || title} fill className="object-cover" sizes="100vw" priority />
          <div className="absolute inset-0 bg-black/0 active:bg-black/10 transition-colors pointer-events-none" />
          {photos.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setIdx(0); setOpen(true); }}
              className="absolute bottom-3 right-3 flex items-center gap-2 bg-white text-charcoal-800 text-sm font-semibold px-4 py-2 rounded-xl shadow-lg hover:bg-charcoal-100 active:scale-[0.98] transition-all duration-150 border border-[#ebebeb]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Afficher toutes les photos ({photos.length})
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
              <Image src={photos[0].url} alt={photos[0].caption || title} fill className="object-cover" sizes="50vw" priority />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 pointer-events-none" />
            </div>
            {photos.slice(1, 5).map((p, i) => (
              <div key={i} className="relative overflow-hidden bg-charcoal-50 group">
                <Image src={p.url} alt={p.caption || `Chalet ${title} – photo ${i + 2}`} fill className="object-cover" sizes="25vw" />
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
              Afficher toutes les photos ({photos.length})
            </button>
          )}
        </div>

      </div>

      {/* ── Fullscreen carousel ── */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col select-none">

          {/* Top bar */}
          <div className="flex items-center justify-between px-5 py-4 shrink-0">
            <span className="text-white/70 text-sm font-medium tabular-nums">
              {idx + 1} / {photos.length}
            </span>
            <button
              onClick={close}
              className="text-white/80 hover:text-white transition-colors p-1"
              aria-label="Fermer"
            >
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Main photo + caption */}
          <div className="flex-1 relative min-h-0">
            <div className="absolute inset-0 px-14 sm:px-20 pb-0">
              <div className="relative w-full h-full">
                <Image
                  src={photos[idx].url}
                  alt={photos[idx].caption || `Chalet ${title} – photo ${idx + 1}`}
                  fill
                  className="object-contain"
                  sizes="100vw"
                  priority
                />
              </div>
            </div>

            {/* Caption overlay */}
            {caption && (
              <div className="absolute bottom-0 left-0 right-0 px-14 sm:px-20 pb-3 pointer-events-none">
                <div className="bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2.5 text-center">
                  <p className="text-white text-sm leading-relaxed">{caption}</p>
                </div>
              </div>
            )}

            {/* Prev arrow */}
            {photos.length > 1 && (
              <button
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/25 text-white rounded-full p-3 transition-colors z-10"
                aria-label="Photo précédente"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {/* Next arrow */}
            {photos.length > 1 && (
              <button
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/25 text-white rounded-full p-3 transition-colors z-10"
                aria-label="Photo suivante"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>

          {/* Thumbnail strip */}
          <div
            className="shrink-0 flex gap-2 overflow-x-auto px-4 py-3 [&::-webkit-scrollbar]:hidden"
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
                aria-label={`Aller à la photo ${i + 1}`}
              >
                <Image src={p.url} alt="" fill className="object-cover" sizes="80px" />
              </button>
            ))}
          </div>

        </div>
      )}
    </>
  );
}
