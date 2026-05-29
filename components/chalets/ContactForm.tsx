"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// ── Calendar helpers ──────────────────────────────────────────────────────────

const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const MONTHS_SHORT = ["jan","fév","mar","avr","mai","jun","jul","aoû","sep","oct","nov","déc"];
const DAYS_FR = ["dim","lun","mar","mer","jeu","ven","sam"];

function toISO(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function formatShort(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]}`;
}
function getGrid(y: number, m: number): (number | null)[] {
  const first = new Date(y, m, 1).getDay();
  const count = new Date(y, m + 1, 0).getDate();
  return [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
}

function CalendarMonth({
  year, month, today, checkin, checkout, hoverDate,
  onDayClick, onDayEnter, onDayLeave,
  showPrev, showNext, onPrev, onNext,
}: {
  year: number; month: number; today: string;
  checkin: string; checkout: string; hoverDate: string;
  onDayClick: (d: string) => void; onDayEnter: (d: string) => void; onDayLeave: () => void;
  showPrev: boolean; showNext: boolean; onPrev: () => void; onNext: () => void;
}) {
  const days = getGrid(year, month);
  const effectiveEnd = checkout || (checkin && hoverDate > checkin ? hoverDate : "");
  return (
    <div className="select-none w-full">
      <div className="flex items-center mb-3">
        <button onClick={onPrev} className={`p-1.5 rounded-lg transition-colors ${showPrev ? "hover:bg-charcoal-50 text-charcoal-600" : "invisible"}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <p className="flex-1 text-center text-sm font-semibold text-charcoal-800">{MONTHS_FR[month]} {year}</p>
        <button onClick={onNext} className={`p-1.5 rounded-lg transition-colors ${showNext ? "hover:bg-charcoal-50 text-charcoal-600" : "invisible"}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAYS_FR.map((d) => (
          <div key={d} className="h-7 flex items-center justify-center text-[10px] font-medium text-charcoal-400 uppercase tracking-wide">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} className="h-8" />;
          const ds = toISO(year, month, day);
          const isPast = ds < today;
          const isStart = ds === checkin;
          const isEnd = ds === checkout;
          const isHoverEnd = !checkout && !!checkin && ds === hoverDate && ds > checkin;
          const inRange = !!checkin && !!effectiveEnd && ds > checkin && ds < effectiveEnd;
          const hasRange = !!(checkin && effectiveEnd);
          return (
            <div key={ds} className="relative h-8 flex items-center justify-center">
              {isStart && hasRange && <div className="absolute inset-y-0.5 left-1/2 right-0 bg-primary/10" />}
              {(isEnd || isHoverEnd) && <div className="absolute inset-y-0.5 left-0 right-1/2 bg-primary/10" />}
              {inRange && <div className="absolute inset-y-0.5 left-0 right-0 bg-primary/10" />}
              <button
                disabled={isPast}
                onClick={() => !isPast && onDayClick(ds)}
                onMouseEnter={() => !isPast && onDayEnter(ds)}
                onMouseLeave={onDayLeave}
                className={["relative z-10 w-8 h-8 flex items-center justify-center text-xs rounded-full transition-all",
                  isPast ? "text-charcoal-200 cursor-not-allowed" :
                  isStart || isEnd ? "bg-primary text-white font-semibold shadow-sm" :
                  isHoverEnd ? "bg-primary/25 text-primary font-medium" :
                  "hover:bg-charcoal-50 text-charcoal-800 cursor-pointer"].join(" ")}
              >{day}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── ContactForm ───────────────────────────────────────────────────────────────

interface Props {
  listingId: string;
  hostId: string;
  hostName: string;
  hostAvatarUrl?: string | null;
  hostCreatedAt?: string | null;
  listingTitle: string;
  currentUserId: string | null;
  initialCheckin?: string;
  initialCheckout?: string;
  initialAdults?: number;
  initialChildren?: number;
  initialBabies?: number;
  initialPets?: number;
  price?: number | null;
  priceOnRequest?: boolean;
}

function hostSinceDuration(createdAt: string): string {
  const created = new Date(createdAt);
  const now = new Date();
  const months = (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth());
  if (months < 1) return "Nouveau";
  if (months < 12) return `${months} mois`;
  const years = Math.floor(months / 12);
  return `${years} an${years > 1 ? "s" : ""}`;
}

export default function ContactForm({
  listingId, hostId, hostName, hostAvatarUrl, hostCreatedAt, listingTitle, currentUserId,
  initialCheckin, initialCheckout,
  initialAdults, initialChildren, initialBabies, initialPets,
  price, priceOnRequest,
}: Props) {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  const [checkin, setCheckin] = useState(initialCheckin ?? "");
  const [checkout, setCheckout] = useState(initialCheckout ?? "");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [hoverDate, setHoverDate] = useState("");
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const calRef = useRef<HTMLDivElement>(null);

  const [adults, setAdults] = useState(initialAdults ?? 0);
  const [children, setChildren] = useState(initialChildren ?? 0);
  const [babies, setBabies] = useState(initialBabies ?? 0);
  const [pets, setPets] = useState(initialPets ?? 0);
  const [message, setMessage] = useState("");

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  // Close calendar on outside click
  useEffect(() => {
    if (!calendarOpen) return;
    const h = (e: MouseEvent) => {
      if (!calRef.current?.contains(e.target as Node)) { setCalendarOpen(false); setHoverDate(""); }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [calendarOpen]);

  const canGoPrev = calYear > now.getFullYear() || (calYear === now.getFullYear() && calMonth > now.getMonth());
  const goPrev = () => { if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); } else setCalMonth((m) => m - 1); };
  const goNext = () => { if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); } else setCalMonth((m) => m + 1); };

  const handleDayClick = (ds: string) => {
    if (!checkin || (checkin && checkout)) { setCheckin(ds); setCheckout(""); }
    else if (ds > checkin) { setCheckout(ds); setCalendarOpen(false); setHoverDate(""); }
    else { setCheckin(ds); setCheckout(""); }
  };

  const datesLabel = checkin
    ? `${formatShort(checkin)} → ${checkout ? formatShort(checkout) : "Départ"}`
    : null;

  const guestTotal = adults + children + babies;
  const canSubmit = !!(checkin || guestTotal > 0 || pets > 0 || message.trim());

  const handleSubmit = async () => {
    setSending(true);
    setError("");

    const guestDetail = [
      adults > 0 ? `${adults} adulte${adults > 1 ? "s" : ""}` : null,
      children > 0 ? `${children} enfant${children > 1 ? "s" : ""}` : null,
      babies > 0 ? `${babies} bébé${babies > 1 ? "s" : ""}` : null,
      pets > 0 ? `${pets} animal${pets > 1 ? "aux" : ""}` : null,
    ].filter(Boolean).join(", ");

    const lines = [
      checkin ? `Dates : ${formatShort(checkin)}${checkout ? ` → ${formatShort(checkout)}` : " (arrivée seulement)"}` : null,
      guestDetail ? `Voyageurs : ${guestDetail}` : null,
      "",
      message.trim(),
    ].filter((l) => l !== null).join("\n");

    const supabase = createClient();
    const { error: err } = await supabase.from("messages").insert({
      listing_id: listingId,
      sender_id: currentUserId,
      receiver_id: hostId,
      content: lines,
    });

    if (err) {
      setError("Erreur lors de l'envoi. Réessayez.");
      setSending(false);
      return;
    }
    setSent(true);
  };

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!currentUserId) {
    return (
      <Link
        href={`/login?next=/chalets/${listingId}`}
        className="block w-full bg-primary text-white py-3.5 rounded-full font-bold text-center hover:bg-primary/90 transition-colors text-sm"
      >
        Contacter le propriétaire
      </Link>
    );
  }

  // ── Sent confirmation ──────────────────────────────────────────────────────
  if (sent) {
    return (
      <div className="text-center py-4">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-semibold text-charcoal-800 text-sm mb-1">Demande envoyée !</p>
        <p className="text-xs text-charcoal-400">
          Votre demande a été envoyée au propriétaire. Il vous répondra directement par message.
        </p>
        <Link href={`/messages?listing=${listingId}&with=${hostId}`} className="mt-3 block text-xs text-primary hover:underline">
          Voir la messagerie →
        </Link>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  // hostName is "l'hôte" when the host has no name set in their profile
  const resolvedName = hostName && hostName !== "le propriétaire" ? hostName : null;
  const hostFirstName = resolvedName ? resolvedName.split(" ")[0] : null;
  const hostInitials = hostFirstName ? hostFirstName[0].toUpperCase() : "H";

  return (
    <div className="space-y-3">
      {/* Host mini-profile */}
      <div className="flex items-center gap-3 pb-1">
        <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 bg-primary flex items-center justify-center">
          {hostAvatarUrl ? (
            <img src={hostAvatarUrl} alt={hostFirstName ?? "Propriétaire"} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white font-bold text-lg">{hostInitials}</span>
          )}
        </div>
        <div>
          <p className="font-semibold text-charcoal-800 text-sm">
            {hostFirstName ? `Propriétaire : ${hostFirstName}` : "Propriétaire"}
          </p>
          {hostCreatedAt && (() => {
            const duration = hostSinceDuration(hostCreatedAt);
            return (
              <p className="text-sm text-charcoal-400 mt-0.5">
                {duration === "Nouveau" ? "Nouveau" : `Propriétaire depuis ${duration}`}
              </p>
            );
          })()}
        </div>
      </div>

      <hr className="border-charcoal-100" />

      {/* Price */}
      <div className="py-1">
        <p className="text-xs text-charcoal-400 mb-0.5">À partir de</p>
        {price && price > 0 && !priceOnRequest ? (
          <p>
            <span className="text-2xl font-bold text-charcoal-800">{price} $</span>
            <span className="text-charcoal-400 text-sm font-semibold"> /nuit</span>
          </p>
        ) : (
          <span className="text-xl font-bold text-charcoal-800">Sur demande</span>
        )}
      </div>

      {/* Dates */}
      <p className="text-sm font-semibold text-charcoal-800 pt-1">Demander mon prix</p>
      <div ref={calRef} className="relative">
        <button
          type="button"
          onClick={() => setCalendarOpen((o) => !o)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-[#ebebeb] text-left hover:border-charcoal-200 transition-colors"
        >
          <svg className="w-4 h-4 text-charcoal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className={`text-sm ${datesLabel ? "text-charcoal-800" : "text-charcoal-400"}`}>
            {datesLabel ?? "Dates (arrivée — départ)"}
          </span>
        </button>

        {calendarOpen && (
          <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-[#ebebeb] p-4 z-50 w-full">
            <CalendarMonth
              year={calYear} month={calMonth} today={today}
              checkin={checkin} checkout={checkout} hoverDate={hoverDate}
              onDayClick={handleDayClick} onDayEnter={setHoverDate} onDayLeave={() => setHoverDate("")}
              showPrev={canGoPrev} showNext onPrev={goPrev} onNext={goNext}
            />
            {(checkin || checkout) && (
              <div className="mt-3 pt-2.5 border-t border-[#ebebeb] flex justify-end">
                <button
                  onClick={() => { setCheckin(""); setCheckout(""); setHoverDate(""); }}
                  className="text-xs text-charcoal-400 hover:text-charcoal-800 underline underline-offset-2"
                >
                  Effacer
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Guests */}
      <div className="rounded-xl border border-[#ebebeb]">
        {([
          { label: "Adultes", sub: "13 ans et plus", val: adults, set: setAdults,
            decrDis: adults === 0 || (adults === 1 && children + babies > 0), incrDis: guestTotal >= 24 },
          { label: "Enfants", sub: "De 2 à 12 ans", val: children, set: setChildren,
            decrDis: children === 0, incrDis: guestTotal >= 24 },
          { label: "Bébés", sub: "Moins de 2 ans", val: babies, set: setBabies,
            decrDis: babies === 0, incrDis: guestTotal >= 24 },
          { label: "Animaux", sub: "Chiens, chats, etc.", val: pets, set: setPets,
            decrDis: pets === 0, incrDis: pets >= 5 },
        ] as Array<{ label: string; sub: string; val: number; set: React.Dispatch<React.SetStateAction<number>>; decrDis: boolean; incrDis: boolean }>).map(({ label, sub, val, set, decrDis, incrDis }, idx) => (
          <div key={label} className={idx > 0 ? "border-t border-[#ebebeb]" : ""}>
            <div className="flex items-center justify-between px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-charcoal-800">{label}</p>
                <p className="text-xs text-charcoal-400">{sub}</p>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => set((v) => Math.max(0, v - 1))}
                  disabled={decrDis}
                  className="w-7 h-7 rounded-full border border-[#ebebeb] flex items-center justify-center text-charcoal-600 hover:border-charcoal-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
                </button>
                <span className="w-4 text-center text-sm font-medium text-charcoal-800">{val}</span>
                <button
                  type="button"
                  onClick={() => set((v) => v + 1)}
                  disabled={incrDis}
                  className="w-7 h-7 rounded-full border border-[#ebebeb] flex items-center justify-center text-charcoal-600 hover:border-charcoal-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Message */}
      <textarea
        placeholder="Votre message (optionnel)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        className="w-full px-3 py-2.5 rounded-xl border border-[#ebebeb] text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none placeholder-charcoal-300 text-charcoal-800"
      />

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={sending || !canSubmit}
        className="w-full bg-primary text-white py-3 rounded-full font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {sending ? "Envoi en cours…" : "Envoyer la demande"}
      </button>
    </div>
  );
}
