"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

interface Props {
  photos: string[];
  title: string;
}

export default function PhotoGallery({ photos, title }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const openModal = () => setModalOpen(true);
  const closeModal = () => {
    setModalOpen(false);
    setLightboxIdx(null);
  };
  const openLightbox = (idx: number) => setLightboxIdx(idx);
  const closeLightbox = () => setLightboxIdx(null);

  const prevPhoto = useCallback(() => {
    setLightboxIdx((i) => (i === null ? null : (i - 1 + photos.length) % photos.length));
  }, [photos.length]);

  const nextPhoto = useCallback(() => {
    setLightboxIdx((i) => (i === null ? null : (i + 1) % photos.length));
  }, [photos.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (lightboxIdx !== null) closeLightbox();
        else if (modalOpen) closeModal();
      }
      if (lightboxIdx !== null) {
        if (e.key === "ArrowLeft") prevPhoto();
        if (e.key === "ArrowRight") nextPhoto();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [modalOpen, lightboxIdx, prevPhoto, nextPhoto]);

  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modalOpen]);

  return (
    <>
      {/* ── Gallery grid ── */}
      <div className="relative mb-8">
        <div className="grid grid-cols-4 grid-rows-2 gap-2 h-72 sm:h-96 overflow-hidden rounded-2xl">
          <div className={`relative overflow-hidden ${photos.length > 1 ? "col-span-2 row-span-2" : "col-span-4 row-span-2"}`}>
            <Image src={photos[0]} alt={title} fill className="object-cover" sizes="(max-width:640px) 100vw, 50vw" priority />
          </div>
          {photos.slice(1, 5).map((p, i) => (
            <div key={i} className="relative overflow-hidden bg-gray-100">
              <Image src={p} alt={`Photo ${i + 2}`} fill className="object-cover" sizes="25vw" />
            </div>
          ))}
        </div>

        {photos.length > 5 && (
          <button
            onClick={openModal}
            className="absolute bottom-3 right-3 flex items-center gap-2 bg-white text-gray-900 text-sm font-semibold px-4 py-2 rounded-xl shadow-lg hover:bg-gray-50 transition-colors border border-gray-200"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Afficher toutes les photos ({photos.length})
          </button>
        )}
      </div>

      {/* ── Modal (photo grid) ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <div className="absolute inset-0 bg-black/85" onClick={closeModal} />
          <div className="relative z-10 flex flex-col h-full w-full max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 shrink-0">
              <span className="text-white font-semibold text-sm">{photos.length} photos · {title}</span>
              <button
                onClick={closeModal}
                className="text-white/80 hover:text-white transition-colors p-1"
                aria-label="Fermer"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable grid */}
            <div className="flex-1 overflow-y-auto px-5 pb-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {photos.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => openLightbox(i)}
                    className="relative aspect-video overflow-hidden rounded-xl bg-gray-800 hover:opacity-85 transition-opacity focus:outline-none focus:ring-2 focus:ring-white/50"
                  >
                    <Image src={p} alt={`Photo ${i + 1}`} fill className="object-cover" sizes="(max-width:640px) 50vw, 33vw" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightboxIdx !== null && (
        <div className="fixed inset-0 z-[60] bg-black/97 flex items-center justify-center">
          {/* Counter */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium tabular-nums">
            {lightboxIdx + 1} / {photos.length}
          </div>

          {/* Close */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors p-1"
            aria-label="Fermer"
          >
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Image */}
          <div className="relative w-full h-full px-16 sm:px-20 py-16">
            <Image
              src={photos[lightboxIdx]}
              alt={`Photo ${lightboxIdx + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>

          {/* Prev */}
          {photos.length > 1 && (
            <button
              onClick={prevPhoto}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/25 text-white rounded-full p-3 transition-colors"
              aria-label="Photo précédente"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Next */}
          {photos.length > 1 && (
            <button
              onClick={nextPhoto}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/25 text-white rounded-full p-3 transition-colors"
              aria-label="Photo suivante"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      )}
    </>
  );
}
