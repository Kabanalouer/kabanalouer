"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { buildCriteria, getScoreLevel } from "@/lib/listingScore";
import type { BlockedEntry } from "./AvailabilityCalendar";

type DbData = {
  roomsAllHavePhotos: boolean;
  bioFilled: boolean;
  avatarFilled: boolean;
  reviewCount: number;
  recentReviewCount: number;
};

type Props = {
  userId: string;
  listingId: string;
  photoCount: number;
  title: string;
  description: string;
  amenities: string[];
  nearbyActivities: string[];
  citqNumber: string;
  icalUrl: string | null;
  initialBlocked: BlockedEntry[];
  region: string;
  capacity: number;
  onNavigate: (section: string) => void;
};

const R = 50;
const CX = 64;
const CY = 64;
const CIRCUMFERENCE = 2 * Math.PI * R;

export default function AnalyseSection({
  userId, listingId, photoCount, title, description, amenities,
  nearbyActivities, citqNumber,
  icalUrl, initialBlocked, region, capacity, onNavigate,
}: Props) {
  const [dbData, setDbData] = useState<DbData | null>(null);
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [advice, setAdvice] = useState<string[]>([]);
  const [adviceError, setAdviceError] = useState("");
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const [roomsRes, userRes, reviewsRes] = await Promise.all([
        supabase.from("rooms").select("photos").eq("listing_id", listingId),
        supabase.from("users").select("bio, avatar_url").eq("id", userId).single(),
        supabase.from("reviews").select("created_at").eq("listing_id", listingId),
      ]);

      const rooms = roomsRes.data ?? [];
      const roomsAllHavePhotos =
        rooms.length > 0 &&
        rooms.every((r) => Array.isArray(r.photos) && (r.photos as string[]).length > 0);

      const u = userRes.data;
      const bioFilled = !!u?.bio?.trim();
      const avatarFilled = !!u?.avatar_url?.trim();

      const reviews = reviewsRes.data ?? [];
      const reviewCount = reviews.length;
      const recentReviewCount = reviews.filter(
        (r) => new Date(r.created_at) >= sixMonthsAgo
      ).length;

      setDbData({ roomsAllHavePhotos, bioFilled, avatarFilled, reviewCount, recentReviewCount });
    }
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!dbData) {
    return <div className="py-12 text-center text-charcoal-400 text-sm">Calcul du score…</div>;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const hasFutureBlocked = initialBlocked.some((b) => new Date(b.date) >= today);

  const criteria = buildCriteria({
    photoCount,
    title,
    description,
    amenities,
    nearbyActivities,
    citqNumber,
    icalUrl,
    hasFutureBlocked,
    roomsAllHavePhotos: dbData.roomsAllHavePhotos,
    bioFilled: dbData.bioFilled,
    avatarFilled: dbData.avatarFilled,
    reviewCount: dbData.reviewCount,
    recentReviewCount: dbData.recentReviewCount,
  });

  const score = criteria.reduce((sum, c) => sum + (c.achieved ? c.points : 0), 0);
  const { color, label } = getScoreLevel(score);

  const priorityMissing = criteria.filter((c) => !c.achieved && c.priority);
  const regularMissing = criteria
    .filter((c) => !c.achieved && !c.priority)
    .sort((a, b) => b.points - a.points);
  const achieved = criteria.filter((c) => c.achieved);

  const dashOffset = CIRCUMFERENCE * (1 - score / 100);

  const handleAdvice = async () => {
    setAdviceLoading(true);
    setAdviceError("");
    setAdvice([]);
    try {
      const res = await fetch("/api/ai/listing-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, description, region, capacity,
          photo_count: photoCount,
          amenities,
          nearby_activities: nearbyActivities,
          score,
          bio_filled: dbData.bioFilled,
          avatar_filled: dbData.avatarFilled,
        }),
      });
      const json = await res.json() as { conseils?: string[]; error?: string };
      if (!res.ok) setAdviceError(json.error ?? "Erreur lors de la génération.");
      else setAdvice(json.conseils ?? []);
    } catch {
      setAdviceError("Erreur lors de la génération.");
    }
    setAdviceLoading(false);
  };

  return (
    <div className="space-y-8">

      {/* Key message */}
      <div className="border-l-[3px] border-[#636e40] bg-[#f5f6ec] rounded-r-xl px-4 py-3">
        <p className="text-sm text-charcoal-700">
          Plus votre score est élevé, plus votre annonce apparaît en tête des résultats de recherche.
        </p>
      </div>

      {/* Score circle */}
      <div className="flex flex-col items-center gap-2">
        <svg width="128" height="128" viewBox="0 0 128 128" aria-hidden="true">
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#ebebeb" strokeWidth="10" />
          <circle
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${CX} ${CY})`}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
          <text x={CX} y={CY - 5} textAnchor="middle" fontSize="30" fontWeight="700" fill="#1a1a1a">
            {score}
          </text>
          <text x={CX} y={CY + 16} textAnchor="middle" fontSize="13" fill="#9ca3af">
            /100
          </text>
        </svg>
        <p className="text-sm font-semibold" style={{ color }}>{label}</p>
      </div>

      {/* Priority missing (profile) */}
      {priorityMissing.length > 0 && (
        <div className="border border-amber-200 bg-amber-50 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
            À compléter en priorité
          </p>
          {priorityMissing.map((c) => (
            <div key={c.key} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-sm text-charcoal-700">{c.label}</span>
              </div>
              <span className="text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5 shrink-0">
                +{c.points} pts
              </span>
            </div>
          ))}
          <Link
            href="/dashboard/profile"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700 hover:text-amber-800 transition-colors mt-1"
          >
            Compléter mon profil
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      )}

      {/* Regular missing */}
      {regularMissing.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-charcoal-700 mb-3">À améliorer</h3>
          <div className="divide-y divide-[#ebebeb]">
            {regularMissing.map((c) => (
              <div key={c.key} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-sm text-charcoal-700 leading-snug">{c.label}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-semibold text-[#636e40] bg-[#f5f6ec] border border-[#636e40]/20 rounded-full px-2 py-0.5 whitespace-nowrap">
                    +{c.points} pts
                  </span>
                  {c.section && (
                    <button
                      type="button"
                      onClick={() => onNavigate(c.section!)}
                      className="text-xs font-medium text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
                    >
                      Compléter →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achieved */}
      {achieved.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-charcoal-700 mb-3">Critères atteints</h3>
          <div className="divide-y divide-[#ebebeb]">
            {achieved.map((c) => (
              <div key={c.key} className="flex items-center gap-2 py-2">
                <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-charcoal-600">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI advice */}
      <div>
        <button
          type="button"
          onClick={() => void handleAdvice()}
          disabled={adviceLoading}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#636e40] border border-[#636e40] rounded-full px-5 py-2.5 hover:bg-[#f5f6ec] transition-colors disabled:opacity-50"
        >
          {adviceLoading ? (
            <>
              <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Génération en cours…
            </>
          ) : (
            <>
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Obtenir des conseils personnalisés
            </>
          )}
        </button>

        {adviceError && <p className="mt-2 text-xs text-red-500">{adviceError}</p>}

        {advice.length > 0 && (
          <div className="mt-4 space-y-3">
            {advice.map((conseil, i) => (
              <div key={i} className="border-l-[3px] border-[#636e40] bg-[#f5f6ec] rounded-r-xl px-4 py-3">
                <p className="text-sm text-charcoal-700">{conseil}</p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
