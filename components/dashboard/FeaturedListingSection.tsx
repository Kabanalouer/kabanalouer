"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";

function getNextMonths(n: number, locale: string) {
  const months: { label: string; value: string }[] = [];
  const now = new Date();
  const localeCode = locale === "en" ? "en-CA" : "fr-CA";
  for (let i = 1; i <= n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    const raw = d.toLocaleDateString(localeCode, { month: "long", year: "numeric" });
    months.push({ label: raw.charAt(0).toUpperCase() + raw.slice(1), value });
  }
  return months;
}

function fmtMonth(monthStr: string, locale: string) {
  const localeCode = locale === "en" ? "en-CA" : "fr-CA";
  const raw = new Date(monthStr + "T12:00:00").toLocaleDateString(localeCode, { month: "long", year: "numeric" });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

const MAX_SLOTS = 3;

type ExistingFeatured = {
  id: string;
  type: string;
  month: string;
  region: string | null;
  status: string;
};

function AvailBadge({ count, t }: { count: number | null; t: ReturnType<typeof useTranslations> }) {
  if (count === null) return <span className="text-xs text-charcoal-400">{t("availLoading")}</span>;
  const avail = MAX_SLOTS - count;
  if (avail <= 0) return <span className="text-xs font-semibold text-red-500">{t("availFull")}</span>;
  return (
    <span className="text-xs font-semibold text-green-600">
      {avail === 1 ? t("availOne", { count: avail }) : t("availMany", { count: avail })}
    </span>
  );
}

const selectCls =
  "w-full border border-[#ebebeb] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition bg-white";

export default function FeaturedListingSection({
  listingId,
  region,
}: {
  listingId: string;
  region: string;
}) {
  const t = useTranslations("listings.featured");
  const locale = useLocale();
  const MONTHS = getNextMonths(6, locale);
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState<ExistingFeatured[]>([]);

  const [homeIdx, setHomeIdx] = useState(0);
  const [regionIdx, setRegionIdx] = useState(0);
  const [homeCount, setHomeCount] = useState<number | null>(null);
  const [regionCount, setRegionCount] = useState<number | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("featured_listings")
        .select("id, type, month, region, status")
        .eq("listing_id", listingId)
        .in("status", ["pending", "active"])
        .order("created_at", { ascending: false });
      setExisting((data ?? []) as ExistingFeatured[]);
      setLoading(false);
    };
    void fetch();
  }, [listingId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const fetch = async () => {
      setHomeCount(null);
      const { count } = await supabase
        .from("featured_listings")
        .select("id", { count: "exact", head: true })
        .eq("type", "home")
        .eq("month", MONTHS[homeIdx].value)
        .in("status", ["pending", "active"]);
      setHomeCount(count ?? 0);
    };
    void fetch();
  }, [homeIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!region) return;
    const fetch = async () => {
      setRegionCount(null);
      const { count } = await supabase
        .from("featured_listings")
        .select("id", { count: "exact", head: true })
        .eq("type", "region")
        .eq("region", region)
        .eq("month", MONTHS[regionIdx].value)
        .in("status", ["pending", "active"]);
      setRegionCount(count ?? 0);
    };
    void fetch();
  }, [regionIdx, region]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return <div className="py-8 text-center text-charcoal-400 text-sm">{t("loading")}</div>;
  }

  const homeAvail = homeCount !== null ? MAX_SLOTS - homeCount : null;
  const regionAvail = regionCount !== null ? MAX_SLOTS - regionCount : null;

  return (
    <div>
      {/* Existing placements notice */}
      {existing.length > 0 && (
        <div className="mb-6 bg-[#636e40]/5 border border-[#636e40]/20 rounded-xl p-4 space-y-1">
          {existing.map((f) => (
            <p key={f.id} className="text-sm font-medium text-[#636e40]">
              {f.type === "region"
                ? t("existingRegion", { region: f.region ?? "", month: fmtMonth(f.month, locale) })
                : t("existingHome", { month: fmtMonth(f.month, locale) })}
            </p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Vedette région */}
        <div className="bg-white border border-[#ebebeb] rounded-2xl p-5 flex flex-col gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold text-charcoal-800">{t("regionTitle")}</p>
              <span className="text-base font-bold text-charcoal-800">
                49 $<span className="text-sm font-normal text-charcoal-400">{t("perMonth")}</span>
              </span>
            </div>
            <p className="text-xs text-charcoal-500 leading-snug">
              {t("regionDesc")}
            </p>
            {region && (
              <p className="text-xs text-charcoal-400 mt-1.5">
                {t("regionLabel")} <span className="font-medium text-charcoal-600">{region}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-charcoal-700 mb-1.5">{t("monthLabel")}</label>
            <select value={regionIdx} onChange={(e) => setRegionIdx(Number(e.target.value))} className={selectCls}>
              {MONTHS.map((m, i) => <option key={m.value} value={i}>{m.label}</option>)}
            </select>
          </div>

          <AvailBadge count={regionCount} t={t} />

          <div>
            <button
              disabled
              className="w-full py-2.5 rounded-full text-sm font-semibold bg-charcoal-100 text-charcoal-400 cursor-not-allowed"
            >
              {regionAvail !== null && regionAvail <= 0 ? t("availFull") : t("comingSoon")}
            </button>
            <p className="text-xs text-charcoal-400 text-center mt-2 leading-snug">
              {t("comingSoonNote")}
            </p>
          </div>
        </div>

        {/* Vedette page d'accueil */}
        <div className="bg-white border border-[#ebebeb] rounded-2xl p-5 flex flex-col gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold text-charcoal-800">{t("homeTitle")}</p>
              <span className="text-base font-bold text-charcoal-800">
                99 $<span className="text-sm font-normal text-charcoal-400">{t("perMonth")}</span>
              </span>
            </div>
            <p className="text-xs text-charcoal-500 leading-snug">
              {t("homeDesc")}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-charcoal-700 mb-1.5">{t("monthLabel")}</label>
            <select value={homeIdx} onChange={(e) => setHomeIdx(Number(e.target.value))} className={selectCls}>
              {MONTHS.map((m, i) => <option key={m.value} value={i}>{m.label}</option>)}
            </select>
          </div>

          <AvailBadge count={homeCount} t={t} />

          <div>
            <button
              disabled
              className="w-full py-2.5 rounded-full text-sm font-semibold bg-charcoal-100 text-charcoal-400 cursor-not-allowed"
            >
              {homeAvail !== null && homeAvail <= 0 ? t("availFull") : t("comingSoon")}
            </button>
            <p className="text-xs text-charcoal-400 text-center mt-2 leading-snug">
              {t("comingSoonNote")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
