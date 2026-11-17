"use client";

import { useRef, useState, useEffect, useCallback, useSyncExternalStore } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";

interface BedEntry { type: string; quantity: number; }
interface Room {
  id: string;
  type: string;
  name: string;
  name_en?: string | null;
  capacity: number;
  beds: BedEntry[];
  photos: string[];
}

const BED_LABEL: Record<string, { fr: string; en: string }> = {
  simple: { fr: "lit simple", en: "single bed" },
  double: { fr: "lit double", en: "double bed" },
  queen: { fr: "lit queen", en: "queen bed" },
  king: { fr: "lit king", en: "king bed" },
};

function bedLabel(type: string, locale: string): string {
  const entry = BED_LABEL[type];
  if (!entry) return type;
  return locale === "en" ? entry.en : entry.fr;
}

// Hôtes autorisés par images.remotePatterns (next.config.ts). Une URL hors de
// cette liste ferait planter next/image : on la sert alors sans optimisation.
function isOptimizableHost(src: string): boolean {
  try {
    const { protocol, hostname } = new URL(src);
    if (protocol !== "https:") return false;
    return (
      hostname === "images.unsplash.com" ||
      hostname === "fgdwhbemzmccchemtzog.supabase.co" ||
      hostname.endsWith(".muscache.com")
    );
  } catch {
    // URL relative (ex. /images/...) : servie par l'app, optimisable.
    return src.startsWith("/");
  }
}

function displayRoomName(room: Room, locale: string): string {
  return (locale === "en" && room.name_en) ? room.name_en : room.name;
}

// Espace entre les cartes (gap-4 = 16 px) : un « pas » de page = largeur visible + cet espace.
const GAP = 16;

// Cartes visibles à la fois : 2 dès md (768 px), 1 en dessous. Lu côté serveur comme 2
// (ordinateur) puis corrigé à l'hydratation sur mobile.
const DESKTOP_QUERY = "(min-width: 768px)";
function subscribeDesktop(onChange: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
function useCardsPerPage(): number {
  return useSyncExternalStore(
    subscribeDesktop,
    () => (window.matchMedia(DESKTOP_QUERY).matches ? 2 : 1),
    () => 2
  );
}

export default function RoomsCarousel({ rooms, title }: { rooms: Room[]; title: string }) {
  const locale = useLocale();
  const t = useTranslations("listing");
  const scrollRef = useRef<HTMLDivElement>(null);
  const perPage = useCardsPerPage();
  const totalPages = Math.max(1, Math.ceil(rooms.length / perPage));
  const [page, setPage] = useState(0);

  // Page courante à partir du défilement (flèches, balayage au doigt, redimensionnement).
  // Au bout de la rangée on est toujours sur la dernière page, même si elle est incomplète.
  const syncPage = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const step = el.clientWidth + GAP;
    const atEnd = el.scrollLeft >= max - 4;
    setPage(atEnd ? totalPages - 1 : Math.min(totalPages - 1, Math.max(0, Math.round(el.scrollLeft / step))));
  }, [totalPages]);

  useEffect(() => {
    syncPage();
    const el = scrollRef.current;
    el?.addEventListener("scroll", syncPage, { passive: true });
    window.addEventListener("resize", syncPage);
    return () => {
      el?.removeEventListener("scroll", syncPage);
      window.removeEventListener("resize", syncPage);
    };
  }, [syncPage]);

  const goToPage = (target: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    el.scrollTo({ left: Math.min(target * (el.clientWidth + GAP), max), behavior: "smooth" });
  };

  const showControls = totalPages > 1;

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-heading-2 font-semibold text-charcoal-800">{title}</h2>
        {showControls && (
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-base text-charcoal-700 tabular-nums" aria-live="polite">
              {page + 1} / {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={page === 0}
                aria-label={t("roomsPrevious")}
                className="w-10 h-10 rounded-full bg-white border border-[#ebebeb] flex items-center justify-center transition-colors hover:enabled:border-primary disabled:opacity-35 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 text-charcoal-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={page === totalPages - 1}
                aria-label={t("roomsNext")}
                className="w-10 h-10 rounded-full bg-white border border-[#ebebeb] flex items-center justify-center transition-colors hover:enabled:border-primary disabled:opacity-35 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 text-charcoal-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1 scrollbar-none"
      >
        {rooms.map((room) => (
          <div
            key={room.id}
            className="snap-start shrink-0 w-full md:w-[calc(50%-8px)]"
          >
            <RoomCard room={room} locale={locale} />
          </div>
        ))}
      </div>
    </div>
  );
}

function RoomCard({ room, locale }: { room: Room; locale: string }) {
  const t = useTranslations("listing");
  const [photoIdx, setPhotoIdx] = useState(0);
  const beds = Array.isArray(room.beds) ? room.beds : [];
  const photos = Array.isArray(room.photos) ? room.photos as string[] : [];
  const isBedroom = room.type === "bedroom";
  const sofaBeds = beds.find((b) => b.type === "sofa_bed");
  const hasMultiple = photos.length > 1;

  return (
    <div className="border border-[#ebebeb] rounded-xl overflow-hidden bg-white h-full flex flex-col">
      {/* Photo — 16:9 with optional carousel */}
      <div className="relative w-full aspect-video overflow-hidden bg-charcoal-50">
        {photos.length > 0 ? (
          <Image
            src={photos[photoIdx]}
            alt={`${displayRoomName(room, locale)} – photo ${photoIdx + 1}`}
            fill
            sizes="(max-width: 768px) 100vw, 380px"
            unoptimized={!isOptimizableHost(photos[photoIdx])}
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">
            <svg className="w-8 h-8 text-charcoal-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            <span className="text-xs text-charcoal-300">{t("noPhoto")}</span>
          </div>
        )}

        {hasMultiple && (
          <>
            <button
              onClick={() => setPhotoIdx((i) => i - 1)}
              disabled={photoIdx === 0}
              aria-label={t("photoPrevious")}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow transition-opacity disabled:opacity-25"
            >
              <svg className="w-3.5 h-3.5 text-charcoal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setPhotoIdx((i) => i + 1)}
              disabled={photoIdx === photos.length - 1}
              aria-label={t("photoNext")}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow transition-opacity disabled:opacity-25"
            >
              <svg className="w-3.5 h-3.5 text-charcoal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {photos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPhotoIdx(i)}
                  aria-label={t("goToPhoto", { number: i + 1 })}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${i === photoIdx ? "bg-white" : "bg-white/50"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Mobile pagination dots */}
      {hasMultiple && (
        <div className="md:hidden flex items-center justify-center py-0.5">
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={() => setPhotoIdx(i)}
              aria-label={t("goToPhoto", { number: i + 1 })}
              aria-current={i === photoIdx ? "true" : undefined}
              className="w-6 h-6 flex items-center justify-center"
            >
              <span className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === photoIdx ? "bg-primary" : "bg-[#ebebeb]"
              }`} />
            </button>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="p-4 flex flex-col gap-1.5 flex-1">
        <p className="font-semibold text-charcoal-800 text-base">{displayRoomName(room, locale)}</p>
        <p className="text-sm text-charcoal-400">
          {isBedroom ? t("roomCapacity", { count: room.capacity }) : t("roomCapacityLabel", { count: room.capacity })}
        </p>
        {isBedroom && beds.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-0.5">
            {beds.map((b, i) => (
              <span key={i} className="text-sm bg-charcoal-50 border border-[#ebebeb] rounded-full px-2.5 py-1 text-charcoal-600">
                {b.quantity}× {bedLabel(b.type, locale)}
              </span>
            ))}
          </div>
        )}
        {!isBedroom && sofaBeds && (
          <span className="text-sm bg-charcoal-50 border border-[#ebebeb] rounded-full px-2.5 py-1 text-charcoal-600 self-start mt-0.5">
            {t("sofaBedCount", { count: sofaBeds.quantity })}
          </span>
        )}
      </div>
    </div>
  );
}
