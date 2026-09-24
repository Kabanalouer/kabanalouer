"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { TEXT_LINK_CLASSNAME } from "@/lib/textLinkClassName";
import { getMonthNames, getMonthNamesShort, getDayNames } from "@/lib/dateLocale";
import QuoteAuthModal from "@/components/chalets/QuoteAuthModal";

// ── Calendar helpers ──────────────────────────────────────────────────────────

function toISO(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function formatShort(iso: string, monthsShort: string[]) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${monthsShort[m - 1]}`;
}
function getGrid(y: number, m: number): (number | null)[] {
  const first = new Date(y, m, 1).getDay();
  const count = new Date(y, m + 1, 0).getDate();
  return [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
}

function CalendarMonth({
  year, month, today, checkin, checkout, hoverDate, blockedDates,
  onDayClick, onDayEnter, onDayLeave,
  showPrev, showNext, onPrev, onNext,
  monthNames, dayNames,
}: {
  year: number; month: number; today: string;
  checkin: string; checkout: string; hoverDate: string; blockedDates: Set<string>;
  onDayClick: (d: string) => void; onDayEnter: (d: string) => void; onDayLeave: () => void;
  showPrev: boolean; showNext: boolean; onPrev: () => void; onNext: () => void;
  monthNames: string[]; dayNames: string[];
}) {
  const days = getGrid(year, month);
  const effectiveEnd = checkout || (checkin && hoverDate > checkin ? hoverDate : "");
  return (
    <div className="select-none w-full">
      <div className="flex items-center mb-3">
        <button onClick={onPrev} className={`p-1.5 rounded-lg transition-colors ${showPrev ? "hover:bg-charcoal-50 text-charcoal-600" : "invisible"}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <p className="flex-1 text-center text-sm font-semibold text-charcoal-800">{monthNames[month]} {year}</p>
        <button onClick={onNext} className={`p-1.5 rounded-lg transition-colors ${showNext ? "hover:bg-charcoal-50 text-charcoal-600" : "invisible"}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {dayNames.map((d) => (
          <div key={d} className="h-7 flex items-center justify-center text-xs font-medium text-charcoal-400 uppercase tracking-wide">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} className="h-8" />;
          const ds = toISO(year, month, day);
          const isPast = ds < today;
          const isBlocked = !isPast && blockedDates.has(ds);
          const isDisabled = isPast || isBlocked;
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
                disabled={isDisabled}
                onClick={() => !isDisabled && onDayClick(ds)}
                onMouseEnter={() => !isDisabled && onDayEnter(ds)}
                onMouseLeave={onDayLeave}
                className={["relative z-10 w-8 h-8 flex items-center justify-center text-xs rounded-full transition-all",
                  isPast ? "text-charcoal-200 cursor-not-allowed" :
                  isBlocked ? "text-charcoal-300 line-through cursor-not-allowed bg-charcoal-50" :
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
  senderFirstName?: string;
  senderLastName?: string;
  initialCheckin?: string;
  initialCheckout?: string;
  initialAdults?: number;
  initialChildren?: number;
  initialBabies?: number;
  initialPets?: number;
  price?: number | null;
  priceOnRequest?: boolean;
  capacity: number;
  petsAllowed: boolean;
  blockedDates?: string[];
  hideMessage?: boolean;
}

function hostSinceDuration(
  createdAt: string,
  t: ReturnType<typeof useTranslations>
): { isNew: boolean; label: string } {
  const created = new Date(createdAt);
  const now = new Date();
  const months = (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth());
  if (months < 1) return { isNew: true, label: t("hostSinceNew") };
  if (months < 12) return { isNew: false, label: t("hostSinceMonths", { count: months }) };
  const years = Math.floor(months / 12);
  return { isNew: false, label: t("hostSinceYears", { count: years }) };
}

export default function ContactForm({
  listingId, hostId, hostName, hostAvatarUrl, hostCreatedAt, listingTitle, currentUserId,
  senderFirstName, senderLastName,
  initialCheckin, initialCheckout,
  initialAdults, initialChildren, initialBabies, initialPets,
  price, priceOnRequest,
  capacity, petsAllowed, blockedDates, hideMessage,
}: Props) {
  const t = useTranslations("listing");
  const ts = useTranslations("searchBar");
  const locale = useLocale();
  const router = useRouter();
  const monthNames = getMonthNames(locale);
  const monthNamesShort = getMonthNamesShort(locale);
  const dayNames = getDayNames(locale);

  const now = new Date();
  const today = now.toISOString().split("T")[0];

  const [checkin, setCheckin] = useState(initialCheckin ?? "");
  const [checkout, setCheckout] = useState(initialCheckout ?? "");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [hoverDate, setHoverDate] = useState("");
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const calRef = useRef<HTMLDivElement>(null);

  const blockedSet = useMemo(() => new Set(blockedDates ?? []), [blockedDates]);

  const [adults, setAdults] = useState(initialAdults ?? 1);
  const [children, setChildren] = useState(initialChildren ?? 0);
  const [babies, setBabies] = useState(initialBabies ?? 0);
  const [pets, setPets] = useState(initialPets ?? 0);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const guestsRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Close calendar on outside click
  useEffect(() => {
    if (!calendarOpen) return;
    const h = (e: MouseEvent) => {
      if (!calRef.current?.contains(e.target as Node)) { setCalendarOpen(false); setHoverDate(""); }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [calendarOpen]);

  // Close guests panel on outside click
  useEffect(() => {
    if (!guestsOpen) return;
    const h = (e: MouseEvent) => {
      if (!guestsRef.current?.contains(e.target as Node)) setGuestsOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [guestsOpen]);

  const canGoPrev = calYear > now.getFullYear() || (calYear === now.getFullYear() && calMonth > now.getMonth());
  const goPrev = () => { if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); } else setCalMonth((m) => m - 1); };
  const goNext = () => { if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); } else setCalMonth((m) => m + 1); };

  const handleDayClick = (ds: string) => {
    if (!checkin || (checkin && checkout)) { setCheckin(ds); setCheckout(""); }
    else if (ds > checkin) { setCheckout(ds); setCalendarOpen(false); setHoverDate(""); }
    else { setCheckin(ds); setCheckout(""); }
  };

  const guestTotal = adults + children + babies + pets;
  const atCapacity = guestTotal >= capacity;
  const canSubmit = !!(checkin || guestTotal > 0 || pets > 0 || message.trim());

  // Résumé affiché sur le champ "Voyageurs" replié — le compte de personnes
  // (adultes + enfants + bébés) et les animaux sont deux clauses distinctes,
  // jamais fondues dans un seul total (ex. "1 voyageur, 1 animal de
  // compagnie"), même si les animaux comptent dans guestTotal ci-dessus pour
  // le plafond de capacité.
  const humanTotal = adults + children + babies;
  const guestsSummary = pets > 0
    ? `${ts("guestsCount", { count: humanTotal })}, ${t("guestPetsSummary", { count: pets })}`
    : ts("guestsCount", { count: humanTotal });

  const handleSubmitClick = () => {
    if (!currentUserId) {
      setAuthModalOpen(true);
      return;
    }
    handleSubmit();
  };

  // Refresh re-fetches ListingDetail's server props (currentUserId included)
  // without remounting this client component, so checkin/checkout/guests/message
  // stay exactly as the visitor left them.
  const handleAuthenticated = () => {
    setAuthModalOpen(false);
    router.refresh();
  };

  const handleSubmit = async () => {
    setSending(true);
    setError("");

    const datesLines = [
      checkin ? t("quoteMessageArrivalLine", { date: formatShort(checkin, monthNamesShort) }) : null,
      checkout ? t("quoteMessageDepartureLine", { date: formatShort(checkout, monthNamesShort) }) : null,
    ].filter((l): l is string => l !== null);
    // Sous-titres "Dates"/"Nombre total de voyageurs" en majuscules — appliqué
    // après interpolation, donc jamais sur les accolades {count}/{date} de la
    // clé i18n brute (qui casseraient l'interpolation next-intl si en MAJ).
    const datesBlock = datesLines.length > 0 ? [t("quoteMessageDatesHeading").toUpperCase(), ...datesLines].join("\n") : null;

    const guestsBlock = [
      t("quoteMessageGuestsTotalLine", { count: humanTotal }).toUpperCase(),
      t("quoteMessageAdultsLine", { count: adults }),
      t("quoteMessageChildrenLine", { count: children }),
      t("quoteMessageBabiesLine", { count: babies }),
      t("quoteMessagePetsLine", { count: pets }),
    ].join("\n");

    // Signature omise si le compte voyageur n'a aucun nom renseigné (rare —
    // requis au signup — mais évite une signature vide le cas échéant).
    const senderFullName = [senderFirstName, senderLastName].filter(Boolean).join(" ").trim();
    const messageLine = message.trim() || null;
    const signatureLine = senderFullName ? t("quoteMessageSignatureLine", { name: senderFullName }) : null;
    // Ligne vide supplémentaire entre le message et la signature (espace plus
    // généreux) — uniquement quand les deux sont présents, sinon un seul bloc.
    const messageAndSignatureBlock =
      messageLine && signatureLine ? `${messageLine}\n\n${signatureLine}` : messageLine ?? signatureLine ?? null;

    const hostGreetingName = hostFirstName ?? t("ownerLabel");
    const lines = [
      t("quoteMessageGreeting", { name: hostGreetingName }),
      t("quoteMessageIntro", { title: listingTitle }),
      datesBlock,
      guestsBlock,
      messageAndSignatureBlock,
    ].filter((l): l is string => l !== null).join("\n\n");

    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId, receiverId: hostId, content: lines,
        checkIn: checkin || undefined,
        checkOut: checkout || undefined,
        numGuests: guestTotal > 0 ? guestTotal : undefined,
        numAdults: adults,
        numChildren: children,
        numBabies: babies,
        numPets: pets,
      }),
    });

    if (!res.ok) {
      setError(t("sendError"));
      setSending(false);
      return;
    }
    setSent(true);
  };

  // ── Sent confirmation ──────────────────────────────────────────────────────
  if (sent) {
    return (
      <div className="text-center py-4">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-semibold text-charcoal-800 text-base mb-1">{t("requestSent")}</p>
        <p className="text-sm text-charcoal-400">
          {t("requestSentDetail")}
        </p>
        <Link href={`/messages?listing=${listingId}&with=${hostId}`} className={`mt-3 block text-sm ${TEXT_LINK_CLASSNAME}`}>
          {t("viewMessagesArrow")}
        </Link>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  // hostName falls back to the localized "the owner" string when unset — see HostCard.tsx
  const resolvedName = hostName && hostName !== t("fallbackOwnerName") ? hostName : null;
  const hostFirstName = resolvedName ? resolvedName.split(" ")[0] : null;
  const hostInitials = hostFirstName ? hostFirstName[0].toUpperCase() : "H";

  return (
    <div className="space-y-3">
      {/* Host mini-profile */}
      <div className="flex items-center gap-3 pb-1">
        <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 bg-primary flex items-center justify-center">
          {hostAvatarUrl ? (
            <img src={hostAvatarUrl} alt={hostFirstName ?? t("ownerLabel")} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white font-bold text-lg">{hostInitials}</span>
          )}
        </div>
        <div>
          <p className="font-semibold text-charcoal-800 text-sm">
            {hostFirstName ? t("ownerLabelWithName", { name: hostFirstName }) : t("ownerLabel")}
          </p>
          {hostCreatedAt && (() => {
            const duration = hostSinceDuration(hostCreatedAt, t);
            return (
              <p className="text-sm text-charcoal-400 mt-0.5">
                {duration.isNew ? duration.label : t("ownerSinceLabel", { duration: duration.label })}
              </p>
            );
          })()}
        </div>
      </div>

      <hr className="border-charcoal-100" />

      {/* Price */}
      <div className="py-1">
        <p className="text-xs text-charcoal-400 mb-0.5">{t("startingFromLabel")}</p>
        {price && price > 0 && !priceOnRequest ? (
          <p>
            <span className="text-2xl font-bold text-charcoal-800">{price} $</span>
            <span className="text-charcoal-400 text-sm font-semibold"> {t("perNight")}</span>
          </p>
        ) : (
          <span className="text-xl font-bold text-charcoal-800">{t("priceOnRequest")}</span>
        )}
      </div>

      {/* Dates */}
      <p className="text-base font-semibold text-charcoal-800 pt-1">{t("requestPriceHeading")}</p>
      <div ref={calRef} className="relative">
        <div className="grid grid-cols-2 rounded-xl border border-[#ebebeb] overflow-hidden">
          <button
            type="button"
            onClick={() => setCalendarOpen((o) => !o)}
            className="flex flex-col items-start gap-0.5 px-3 py-2 text-left border-r border-[#ebebeb] hover:bg-charcoal-50 transition-colors"
          >
            <span className="text-xs font-medium text-charcoal-400">{t("arrivalLabel")}</span>
            <span className={`text-sm ${checkin ? "text-charcoal-800 font-medium" : "text-charcoal-300"}`}>
              {checkin ? formatShort(checkin, monthNamesShort) : t("addDate")}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setCalendarOpen((o) => !o)}
            className="flex flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-charcoal-50 transition-colors"
          >
            <span className="text-xs font-medium text-charcoal-400">{t("departureLabel")}</span>
            <span className={`text-sm ${checkout ? "text-charcoal-800 font-medium" : "text-charcoal-300"}`}>
              {checkout ? formatShort(checkout, monthNamesShort) : t("addDate")}
            </span>
          </button>
        </div>

        {calendarOpen && (
          <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-[#ebebeb] p-4 z-50 w-full">
            <CalendarMonth
              year={calYear} month={calMonth} today={today}
              checkin={checkin} checkout={checkout} hoverDate={hoverDate} blockedDates={blockedSet}
              onDayClick={handleDayClick} onDayEnter={setHoverDate} onDayLeave={() => setHoverDate("")}
              showPrev={canGoPrev} showNext onPrev={goPrev} onNext={goNext}
              monthNames={monthNames} dayNames={dayNames}
            />
            {(checkin || checkout) && (
              <div className="mt-3 pt-2.5 border-t border-[#ebebeb] flex justify-end">
                <button
                  onClick={() => { setCheckin(""); setCheckout(""); setHoverDate(""); }}
                  className="text-sm text-charcoal-400 hover:text-charcoal-800 underline underline-offset-2"
                >
                  {t("clearDates")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Voyageurs — champ replié, s'ouvre sur clic comme le champ dates */}
      <div ref={guestsRef} className="relative">
        <button
          type="button"
          onClick={() => setGuestsOpen((o) => !o)}
          className="w-full flex flex-col items-start gap-0.5 px-3 py-2 text-left rounded-xl border border-[#ebebeb] hover:border-charcoal-200 transition-colors"
        >
          <span className="text-xs font-medium text-charcoal-400">{ts("guestsPlaceholder")}</span>
          <span className="text-sm text-charcoal-800 font-medium">{guestsSummary}</span>
        </button>

        {guestsOpen && (
          <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-[#ebebeb] z-50 w-full">
            {([
              { label: ts("adults"), sub: ts("adultsSub"), val: adults,
                onDecr: () => setAdults((v) => Math.max(1, v - 1)),
                onIncr: () => setAdults((v) => v + 1),
                decrDis: adults <= 1,
                incrDis: atCapacity },
              { label: ts("children"), sub: ts("childrenSub"), val: children,
                onDecr: () => setChildren((v) => Math.max(0, v - 1)),
                onIncr: () => setChildren((v) => v + 1),
                decrDis: children === 0,
                incrDis: atCapacity },
              { label: ts("babies"), sub: ts("babiesSub"), val: babies,
                onDecr: () => setBabies((v) => Math.max(0, v - 1)),
                onIncr: () => setBabies((v) => v + 1),
                decrDis: babies === 0,
                incrDis: atCapacity },
              ...(petsAllowed ? [{
                label: ts("pets"), sub: ts("petsSub"), val: pets,
                onDecr: () => setPets((v) => Math.max(0, v - 1)),
                onIncr: () => setPets((v) => v + 1),
                decrDis: pets === 0, incrDis: pets >= 5 || atCapacity,
              }] : []),
            ] as Array<{ label: string; sub: string; val: number; onDecr: () => void; onIncr: () => void; decrDis: boolean; incrDis: boolean }>).map(({ label, sub, val, onDecr, onIncr, decrDis, incrDis }, idx) => (
              <div key={label} className={idx > 0 ? "border-t border-[#ebebeb]" : ""}>
                <div className="flex items-center justify-between px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-charcoal-800">{label}</p>
                    <p className="text-xs text-charcoal-400">{sub}</p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={onDecr}
                      disabled={decrDis}
                      className="w-7 h-7 rounded-full border border-[#ebebeb] flex items-center justify-center text-charcoal-600 hover:border-charcoal-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
                    </button>
                    <span className="w-4 text-center text-sm font-medium text-charcoal-800">{val}</span>
                    <button
                      type="button"
                      onClick={onIncr}
                      disabled={incrDis}
                      className="w-7 h-7 rounded-full border border-[#ebebeb] flex items-center justify-center text-charcoal-600 hover:border-charcoal-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {atCapacity && (
              <p className="text-sm text-charcoal-400 px-3 pb-2.5">{t("capacityMaxMessage", { count: capacity })}</p>
            )}
          </div>
        )}
      </div>

      {/* Message — masqué en mobile (feuille modale, voir MobileContactTrigger) */}
      {!hideMessage && (
        <textarea
          placeholder={t("messagePlaceholderOptional")}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl border border-[#ebebeb] text-base outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none placeholder-charcoal-300 text-charcoal-800"
        />
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        onClick={handleSubmitClick}
        disabled={sending || !canSubmit}
        className="w-full bg-primary text-white py-3 rounded-full font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {sending ? t("sendingRequest") : t("sendRequestCta")}
      </button>

      {authModalOpen && (
        <QuoteAuthModal onClose={() => setAuthModalOpen(false)} onAuthenticated={handleAuthenticated} />
      )}
    </div>
  );
}
