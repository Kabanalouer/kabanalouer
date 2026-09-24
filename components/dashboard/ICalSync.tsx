"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";

export default function ICalSync({
  listingId,
  initialUrl,
  initialLastSync,
}: {
  listingId: string;
  initialUrl: string | null;
  initialLastSync: string | null;
}) {
  const t = useTranslations("listings.ical");
  const locale = useLocale();
  const supabase = createClient();
  const [icalUrl, setIcalUrl] = useState(initialUrl ?? "");
  const [lastSync, setLastSync] = useState(initialLastSync);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [urlSaved, setUrlSaved] = useState(false);
  const [error, setError] = useState("");

  const handleSaveUrl = async () => {
    setSaving(true);
    setError("");
    setUrlSaved(false);
    const { error } = await supabase
      .from("listings")
      .update({ ical_url: icalUrl.trim() || null })
      .eq("id", listingId);
    setSaving(false);
    if (error) { setError(t("saveError")); return; }
    setUrlSaved(true);
  };

  const handleSync = async () => {
    if (!icalUrl.trim()) { setError(t("errorNoUrl")); return; }
    setSyncing(true);
    setError("");
    try {
      const res = await fetch("/api/sync-ical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("syncError"));
      setLastSync(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : t("unknownError"));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
      <div>
        <h2 className="text-heading-2 font-bold text-gray-900 mb-1">{t("title")}</h2>
        <p className="text-base text-gray-500">
          {t("description")}
        </p>
      </div>

      {/* Import URL */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {t("urlLabel")}
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={icalUrl}
            onChange={(e) => { setIcalUrl(e.target.value); setUrlSaved(false); }}
            placeholder={t("placeholder")}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <button
            onClick={handleSaveUrl}
            disabled={saving}
            className="border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {saving ? t("saving") : urlSaved ? t("saved") : t("save")}
          </button>
        </div>
      </div>

      {/* Sync controls */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
        <div>
          <p className="text-sm font-medium text-gray-700">{t("lastSync")}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {lastSync
              ? new Date(lastSync).toLocaleString(locale === "en" ? "en-CA" : "fr-CA", {
                  day: "numeric", month: "long", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })
              : t("neverSynced")}
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing || !icalUrl.trim()}
          className="flex items-center gap-2 bg-primary text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          <svg
            className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {syncing ? t("syncing") : t("syncNow")}
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
