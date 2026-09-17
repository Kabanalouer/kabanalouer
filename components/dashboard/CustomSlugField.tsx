"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { buildListingPath } from "@/lib/listingUrl";
import { CUSTOM_SLUG_MAX_LENGTH } from "@/lib/customSlug";
import { SITE_URL } from "@/lib/siteUrl";

const inputCls =
  "w-full border border-[#ebebeb] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition";

// Normalise à la volée (minuscules, espaces → tirets) pour que taper "Mon
// Chalet" produise directement "mon-chalet" plutôt que de rejeter la saisie —
// seuls les caractères hors [a-z0-9-] restants sont bloqués à la frappe.
function sanitizeInput(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, CUSTOM_SLUG_MAX_LENGTH);
}

export default function CustomSlugField({
  listingId,
  initialCustomSlug,
  listingNumber,
  region,
  city,
  onSaved,
}: {
  listingId: string;
  initialCustomSlug: string | null;
  listingNumber: number | null;
  region: string | null;
  city: string | null;
  // Notifie le parent (indicateur du menu gauche, voir EditListingForm.tsx)
  // une fois la sauvegarde confirmée par le serveur.
  onSaved?: (value: string | null) => void;
}) {
  const tEdit = useTranslations("listings.edit");
  const [value, setValue] = useState(initialCustomSlug ?? "");
  const [savedValue, setSavedValue] = useState(initialCustomSlug ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const previewPath = buildListingPath(
    { region, city, listing_number: listingNumber, custom_slug: value.trim() || null },
    "fr"
  );

  const hasChanges = value.trim() !== savedValue;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setJustSaved(false);
    try {
      const res = await fetch(`/api/listings/${listingId}/custom-slug`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customSlug: value.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.error === "taken") setError(tEdit("customSlugErrorTaken"));
        else if (data.error === "numericOnly") setError(tEdit("customSlugErrorNumericOnly"));
        else if (data.error === "format") setError(tEdit("customSlugErrorFormat"));
        else setError(tEdit("customSlugErrorGeneric"));
        return;
      }
      const saved = value.trim() || null;
      setSavedValue(value.trim());
      setJustSaved(true);
      onSaved?.(saved);
    } catch {
      setError(tEdit("customSlugErrorGeneric"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-charcoal-700 mb-1.5">{tEdit("customSlugLabel")}</label>
      <p className="text-xs text-charcoal-400 mb-2">{tEdit("customSlugHelp")}</p>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          setValue(sanitizeInput(e.target.value));
          setError(null);
          setJustSaved(false);
        }}
        className={inputCls}
        placeholder={tEdit("customSlugPlaceholder")}
      />

      <div className="mt-2.5 text-xs bg-[#f5f6ec] border border-primary/10 rounded-xl px-3 py-2.5">
        <p className="text-charcoal-500 font-medium mb-1">{tEdit("customSlugPreviewLabel")}</p>
        {previewPath ? (
          <p className="text-charcoal-700 break-all">{SITE_URL}{previewPath}</p>
        ) : (
          <p className="text-charcoal-400">—</p>
        )}
        {!value.trim() && listingNumber != null && (
          <p className="text-charcoal-400 mt-1">{tEdit("customSlugUsingNumber", { number: listingNumber })}</p>
        )}
      </div>

      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      {justSaved && !error && <p className="text-sm text-primary mt-2">{tEdit("customSlugSaved")}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !hasChanges}
        className="mt-3 rounded-full bg-primary text-white text-sm font-semibold px-5 py-2 hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {saving ? tEdit("customSlugSaving") : value.trim() ? tEdit("customSlugSave") : tEdit("customSlugClear")}
      </button>
    </div>
  );
}
