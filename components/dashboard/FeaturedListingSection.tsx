"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import {
  MAX_FEATURED_HOME,
  MAX_FEATURED_REGION,
  PRIX_VEDETTE_HOME,
  PRIX_VEDETTE_REGION,
  MAX_MONTHS_AHEAD,
} from "@/lib/featuredConfig";

type FeaturedType = "home" | "region";
type MonthState = "own" | "full" | "available";

type MonthOption = { label: string; value: string };

type ExistingFeatured = {
  id: string;
  type: string;
  month: string;
  region: string | null;
  status: string;
};

function getMonths(n: number, locale: string): MonthOption[] {
  const months: MonthOption[] = [];
  const now = new Date();
  const localeCode = locale === "en" ? "en-CA" : "fr-CA";
  for (let i = 0; i <= n; i++) {
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

function MonthRow({
  label,
  state,
  count,
  max,
  selected,
  onSelect,
  t,
}: {
  label: string;
  state: MonthState;
  count: number;
  max: number;
  selected: boolean;
  onSelect: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const disabled = state !== "available";
  const active = state === "available" && selected;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={[
        "w-full flex items-center justify-between gap-3 rounded-full px-4 py-2.5 text-sm font-medium border transition-colors text-left",
        state === "own" && "bg-charcoal-50 border-[#ebebeb] text-charcoal-400 cursor-not-allowed",
        state === "full" && "bg-white border-[#ebebeb] text-charcoal-300 cursor-not-allowed",
        state === "available" && (active ? "bg-primary border-primary text-white" : "bg-white border-[#ebebeb] text-charcoal-700 hover:border-primary/40"),
      ].filter(Boolean).join(" ")}
    >
      <span>{label}</span>
      {state === "own" && <span className="text-xs shrink-0">{t("alreadyBooked")}</span>}
      {state === "full" && (
        <span className="bg-[#f04e45] text-white text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0">
          {t("full", { count, max })}
        </span>
      )}
      {state === "available" && (
        <span className={`text-xs shrink-0 ${active ? "text-white/90" : "text-charcoal-400"}`}>
          {t("slotsAvailable", { count, max })}
        </span>
      )}
    </button>
  );
}

function FeaturedCard({
  title,
  desc,
  price,
  type,
  region,
  listingId,
  months,
  ownMonths,
  t,
}: {
  title: string;
  desc: string;
  price: number;
  type: FeaturedType;
  region?: string;
  listingId: string;
  months: MonthOption[];
  ownMonths: Set<string>;
  t: ReturnType<typeof useTranslations>;
}) {
  const supabase = createClient();
  const max = type === "home" ? MAX_FEATURED_HOME : MAX_FEATURED_REGION;

  const [counts, setCounts] = useState<Map<string, number> | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setCounts(null);
      let query = supabase
        .from("featured_listings")
        .select("month")
        .eq("type", type)
        .in("month", months.map((m) => m.value))
        .in("status", ["pending", "active"]);
      if (type === "region" && region) query = query.eq("region", region);
      const { data } = await query;
      if (cancelled) return;
      const map = new Map<string, number>();
      for (const row of (data ?? []) as { month: string }[]) {
        map.set(row.month, (map.get(row.month) ?? 0) + 1);
      }
      setCounts(map);
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [type, region]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCheckout() {
    if (!selectedMonth) return;
    setCheckoutLoading(true);
    setCheckoutMessage("");
    try {
      const res = await fetch("/api/featured/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, type, month: selectedMonth.slice(0, 7) }),
      });
      const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.ok && body.url) {
        window.location.href = body.url;
        return;
      }
      setCheckoutMessage(body.error ?? t("genericError"));
    } catch {
      setCheckoutMessage(t("networkError"));
    } finally {
      setCheckoutLoading(false);
    }
  }

  return (
    <div className="bg-white border border-[#ebebeb] rounded-2xl p-5 flex flex-col gap-4">
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="font-semibold text-charcoal-800">{title}</p>
          <span className="text-base font-bold text-charcoal-800">
            {price} $<span className="text-sm font-normal text-charcoal-400">{t("perMonth")}</span>
          </span>
        </div>
        <p className="text-xs text-charcoal-500 leading-snug">{desc}</p>
      </div>

      {counts === null ? (
        <p className="text-xs text-charcoal-400 py-2">{t("loading")}</p>
      ) : (
        <div className="space-y-2">
          {months.map((m) => {
            const count = counts.get(m.value) ?? 0;
            const state: MonthState = ownMonths.has(m.value) ? "own" : count >= max ? "full" : "available";
            return (
              <MonthRow
                key={m.value}
                label={m.label}
                state={state}
                count={count}
                max={max}
                selected={selectedMonth === m.value}
                onSelect={() => setSelectedMonth(selectedMonth === m.value ? null : m.value)}
                t={t}
              />
            );
          })}
        </div>
      )}

      {selectedMonth && (
        <div>
          <button
            type="button"
            onClick={handleCheckout}
            disabled={checkoutLoading}
            className="w-full py-2.5 rounded-full text-sm font-semibold bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {checkoutLoading ? t("processing") : t("ctaButton", { price })}
          </button>
          {checkoutMessage && (
            <p className="text-xs text-charcoal-500 text-center mt-2 leading-snug">{checkoutMessage}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function FeaturedListingSection({
  listingId,
  region,
}: {
  listingId: string;
  region: string;
}) {
  const t = useTranslations("listings.featured");
  const locale = useLocale();
  const supabase = createClient();
  const MONTHS = getMonths(MAX_MONTHS_AHEAD, locale);

  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState<ExistingFeatured[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      const { data } = await supabase
        .from("featured_listings")
        .select("id, type, month, region, status")
        .eq("listing_id", listingId)
        .in("status", ["pending", "active"])
        .order("created_at", { ascending: false });
      if (!cancelled) {
        setExisting((data ?? []) as ExistingFeatured[]);
        setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [listingId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return <div className="py-8 text-center text-charcoal-400 text-sm">{t("loading")}</div>;
  }

  const homeOwnMonths = new Set(existing.filter((f) => f.type === "home").map((f) => f.month));
  const regionOwnMonths = new Set(existing.filter((f) => f.type === "region").map((f) => f.month));

  return (
    <div>
      {existing.length > 0 && (
        <div className="mb-6 bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-1">
          {existing.map((f) => (
            <p key={f.id} className="text-sm font-medium text-primary">
              {f.type === "region"
                ? t("existingRegion", { region: f.region ?? "", month: fmtMonth(f.month, locale) })
                : t("existingHome", { month: fmtMonth(f.month, locale) })}
            </p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FeaturedCard
          title={t("regionTitle", { region })}
          desc={t("regionDesc")}
          price={PRIX_VEDETTE_REGION}
          type="region"
          region={region}
          listingId={listingId}
          months={MONTHS}
          ownMonths={regionOwnMonths}
          t={t}
        />
        <FeaturedCard
          title={t("homeTitle")}
          desc={t("homeDesc")}
          price={PRIX_VEDETTE_HOME}
          type="home"
          listingId={listingId}
          months={MONTHS}
          ownMonths={homeOwnMonths}
          t={t}
        />
      </div>
    </div>
  );
}
