"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";

type ListingSub = {
  listing_id: string;
  status: string;
  expires_at: string | null;
};

type ListingRow = {
  id: string;
  title: string;
  sub: ListingSub | null;
};

export default function SubscriptionClient() {
  const t = useTranslations("subscription");
  const locale = useLocale();
  const supabase = createClient();

  const [rows, setRows] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const [{ data: listings }, { data: subs }] = await Promise.all([
        supabase
          .from("listings")
          .select("id, title, title_en")
          .eq("host_id", user.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("subscriptions")
          .select("listing_id, status, expires_at")
          .eq("user_id", user.id),
      ]);

      const subsByListing = new Map((subs ?? []).map((s) => [s.listing_id as string, s as ListingSub]));
      setRows((listings ?? []).map((l) => ({ id: l.id, title: (locale === "en" && l.title_en) ? l.title_en : l.title, sub: subsByListing.get(l.id) ?? null })));
      setLoading(false);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-charcoal-800 mb-2">{t("title")}</h1>
      <p className="text-charcoal-500 mb-8">{t("pageDescription")}</p>

      {loading ? (
        <div className="bg-white rounded-2xl border border-[#ebebeb] p-8 animate-pulse h-40" />
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#ebebeb] p-8 text-center text-charcoal-500 text-base">
          {t("noListings")}
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <div key={row.id} className="bg-white rounded-2xl border border-[#ebebeb] p-6 flex items-center justify-between gap-4">
              <p className="font-semibold text-charcoal-800">{row.title || t("untitledListing")}</p>
              <span className="shrink-0 inline-flex items-center rounded-full bg-primary/10 text-primary px-3 py-1 text-sm font-semibold">
                {t("freeFirstYear")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
