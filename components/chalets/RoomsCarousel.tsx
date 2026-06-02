"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface BedEntry { type: string; quantity: number; }
interface Room {
  id: string;
  type: string;
  name: string;
  capacity: number;
  beds: BedEntry[];
  photos: string[];
}

const BED_FR: Record<string, string> = {
  simple: "lit simple", double: "lit double", queen: "lit queen", king: "lit king",
};

export default function RoomsCarousel({ rooms }: { rooms: Room[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    el?.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el?.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: (dir === "left" ? -1 : 1) * (el.clientWidth / 2 + 8), behavior: "smooth" });
  };

  const showArrows = rooms.length > 2;

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1 scrollbar-none"
      >
        {rooms.map((room) => (
          <div
            key={room.id}
            className="snap-start shrink-0 w-[calc(50%-8px)]"
          >
            <RoomCard room={room} />
          </div>
        ))}
      </div>

      {showArrows && (
        <>
          <button
            onClick={() => scroll("left")}
            disabled={!canLeft}
            aria-label="Précédent"
            className="hidden sm:flex absolute -left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white border border-[#ebebeb] shadow-sm items-center justify-center transition-opacity disabled:opacity-25 hover:enabled:bg-charcoal-50"
          >
            <svg className="w-4 h-4 text-charcoal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => scroll("right")}
            disabled={!canRight}
            aria-label="Suivant"
            className="hidden sm:flex absolute -right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white border border-[#ebebeb] shadow-sm items-center justify-center transition-opacity disabled:opacity-25 hover:enabled:bg-charcoal-50"
          >
            <svg className="w-4 h-4 text-charcoal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}

function RoomCard({ room }: { room: Room }) {
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
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photos[photoIdx]}
            alt={`${room.name} – photo ${photoIdx + 1}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">
            <svg className="w-8 h-8 text-charcoal-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            <span className="text-xs text-charcoal-300">Aucune photo</span>
          </div>
        )}

        {hasMultiple && (
          <>
            <button
              onClick={() => setPhotoIdx((i) => i - 1)}
              disabled={photoIdx === 0}
              aria-label="Photo précédente"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow transition-opacity disabled:opacity-25"
            >
              <svg className="w-3.5 h-3.5 text-charcoal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setPhotoIdx((i) => i + 1)}
              disabled={photoIdx === photos.length - 1}
              aria-label="Photo suivante"
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
                  aria-label={`Photo ${i + 1}`}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${i === photoIdx ? "bg-white" : "bg-white/50"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Mobile pagination dots */}
      {hasMultiple && (
        <div className="md:hidden flex items-center justify-center gap-1 py-2">
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={() => setPhotoIdx(i)}
              aria-label={`Photo ${i + 1}`}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === photoIdx ? "bg-primary" : "bg-[#ebebeb]"
              }`}
            />
          ))}
        </div>
      )}

      {/* Info */}
      <div className="p-4 flex flex-col gap-1.5 flex-1">
        <p className="font-semibold text-charcoal-800 text-sm">{room.name}</p>
        <p className="text-xs text-charcoal-400">
          {isBedroom ? `${room.capacity} pers.` : `Capacité : ${room.capacity} pers.`}
        </p>
        {isBedroom && beds.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-0.5">
            {beds.map((b, i) => (
              <span key={i} className="text-xs bg-charcoal-50 border border-[#ebebeb] rounded-full px-2.5 py-1 text-charcoal-600">
                {b.quantity}× {BED_FR[b.type] ?? b.type}
              </span>
            ))}
          </div>
        )}
        {!isBedroom && sofaBeds && (
          <span className="text-xs bg-charcoal-50 border border-[#ebebeb] rounded-full px-2.5 py-1 text-charcoal-600 self-start mt-0.5">
            {sofaBeds.quantity} divan{sofaBeds.quantity > 1 ? "s" : ""}-lit
          </span>
        )}
      </div>
    </div>
  );
}
