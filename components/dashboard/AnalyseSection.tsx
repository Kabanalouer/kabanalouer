"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { buildCriteria, getScoreLevel } from "@/lib/listingScore";
import type { BlockedEntry } from "./AvailabilityCalendar";
import { TEXT_LINK_CLASSNAME } from "@/lib/textLinkClassName";
import { type AmenityValue } from "@/lib/amenities-catalog";
import { localePath } from "@/lib/localePath";

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
  amenities: AmenityValue[];
  nearbyActivities: string[];
  citqNumber: string;
  icalUrl: string | null;
  initialBlocked: BlockedEntry[];
  onNavigate: (section: string) => void;
  locale: string;
};

const R = 50;
const CX = 64;
const CY = 64;
const CIRCUMFERENCE = 2 * Math.PI * R;

export default function AnalyseSection({
  userId, listingId, photoCount, title, description, amenities,
  nearbyActivities, citqNumber,
  icalUrl, initialBlocked, onNavigate, locale,
}: Props) {
  const t = useTranslations("listings.analyse");
  const [dbData, setDbData] = useState<DbData | null>(null);
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
    return <div className="py-12 text-center text-charcoal-400 text-sm">{t("calculating")}</div>;
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
  const { color } = getScoreLevel(score);

  const getScoreLabel = (s: number): string => {
    if (s <= 30) return t("scoreLevels.incomplete");
    if (s <= 50) return t("scoreLevels.improve");
    if (s <= 70) return t("scoreLevels.good");
    if (s <= 84) return t("scoreLevels.veryGood");
    return t("scoreLevels.optimized");
  };

  const getCriterionLabel = (key: string, fallback: string): string => {
    const criteriaKeys: Record<string, string> = {
      photos5: t("criteria.photos5"),
      photos25: t("criteria.photos25"),
      roomPhotos: t("criteria.roomPhotos"),
      bio: t("criteria.bio"),
      avatar: t("criteria.avatar"),
      title40: t("criteria.title40"),
      desc500: t("criteria.desc500"),
      desc1500: t("criteria.desc1500"),
      amenities: t("criteria.amenities"),
      nearby: t("criteria.nearby"),
      avail: t("criteria.avail"),
      citq: t("criteria.citq"),
      review1: t("criteria.review1"),
      review6mo: t("criteria.review6mo"),
    };
    return criteriaKeys[key] ?? fallback;
  };

  const priorityMissing = criteria.filter((c) => !c.achieved && c.priority);
  const regularMissing = criteria
    .filter((c) => !c.achieved && !c.priority)
    .sort((a, b) => b.points - a.points);
  const achieved = criteria.filter((c) => c.achieved);

  const dashOffset = CIRCUMFERENCE * (1 - score / 100);

  return (
    <div className="space-y-8">

      {/* Key message */}
      <div className="border-l-[3px] border-[#636e40] bg-[#f5f6ec] rounded-r-xl px-4 py-3">
        <p className="text-base text-charcoal-700">
          {t("keyMessage")}
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
          <text x={CX} y={CY} textAnchor="middle" dominantBaseline="central" fontSize="36" fontWeight="700" fill="#1a1a1a">
            {score}
          </text>
        </svg>
        <p className="text-sm font-semibold" style={{ color }}>{getScoreLabel(score)}</p>
      </div>

      {/* Priority missing (profile) */}
      {priorityMissing.length > 0 && (
        <div className="border border-warning-200 bg-warning-50 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-semibold text-warning-700 uppercase tracking-wide">
            {t("priorityTitle")}
          </p>
          {priorityMissing.map((c) => (
            <div key={c.key} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <svg className="w-4 h-4 text-error-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-sm text-charcoal-700">{getCriterionLabel(c.key, c.label)}</span>
              </div>
              <span className="text-xs font-semibold text-warning-700 bg-warning-100 border border-warning-200 rounded-full px-2 py-0.5 shrink-0">
                +{c.points} pts
              </span>
            </div>
          ))}
          <Link
            href={localePath("/dashboard/profile", locale)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-warning-700 hover:text-warning-800 transition-colors mt-1"
          >
            {t("completeProfile")}
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      )}

      {/* Regular missing */}
      {regularMissing.length > 0 && (
        <div>
          <h3 className="text-heading-3 font-semibold text-charcoal-700 mb-3">{t("improveTitle")}</h3>
          <div className="divide-y divide-[#ebebeb]">
            {regularMissing.map((c) => (
              <div key={c.key} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <svg className="w-4 h-4 text-error-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-sm text-charcoal-700 leading-snug">{getCriterionLabel(c.key, c.label)}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-semibold text-[#636e40] bg-[#f5f6ec] border border-[#636e40]/20 rounded-full px-2 py-0.5 whitespace-nowrap">
                    +{c.points} pts
                  </span>
                  {c.section && (
                    <button
                      type="button"
                      onClick={() => onNavigate(c.section!)}
                      className={`text-xs whitespace-nowrap ${TEXT_LINK_CLASSNAME}`}
                    >
                      {t("complete")}
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
          <h3 className="text-heading-3 font-semibold text-charcoal-700 mb-3">{t("achievedTitle")}</h3>
          <div className="divide-y divide-[#ebebeb]">
            {achieved.map((c) => (
              <div key={c.key} className="flex items-center gap-2 py-2">
                <svg className="w-4 h-4 text-success-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-charcoal-600">{getCriterionLabel(c.key, c.label)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
