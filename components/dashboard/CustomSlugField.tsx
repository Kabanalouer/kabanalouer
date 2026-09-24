"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { buildListingPath } from "@/lib/listingUrl";
import { CUSTOM_SLUG_MAX_LENGTH } from "@/lib/customSlug";
import { SITE_URL } from "@/lib/siteUrl";

const DISPLAY_DOMAIN = SITE_URL.replace(/^https?:\/\//, "");

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
}: {
  listingId: string;
  initialCustomSlug: string | null;
  listingNumber: number | null;
  region: string | null;
  city: string | null;
}) {
  const tEdit = useTranslations("listings.edit");
  const [value, setValue] = useState(initialCustomSlug ?? "");
  const [savedValue, setSavedValue] = useState(initialCustomSlug ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  // Préfixe fixe de l'URL (tout sauf le dernier segment) — dérivé de
  // buildListingPath() avec un segment placeholder, puis tronqué avant le
  // dernier "/", pour ne jamais dupliquer la logique région/ville/repli déjà
  // centralisée dans lib/listingUrl.ts.
  const fullPathWithPlaceholder = buildListingPath(
    { region, city, listing_number: null, custom_slug: "x" },
    "fr"
  );
  const urlPrefix = fullPathWithPlaceholder
    ? `${DISPLAY_DOMAIN}${fullPathWithPlaceholder.slice(0, fullPathWithPlaceholder.lastIndexOf("/") + 1)}`
    : null;

  const hasChanges = value.trim() !== savedValue;

  const performSave = async (raw: string) => {
    setSaving(true);
    setError(null);
    setJustSaved(false);
    try {
      const res = await fetch(`/api/listings/${listingId}/custom-slug`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customSlug: raw }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.error === "taken") setError(tEdit("customSlugErrorTaken"));
        else if (data.error === "numericOnly") setError(tEdit("customSlugErrorNumericOnly"));
        else if (data.error === "format") setError(tEdit("customSlugErrorFormat"));
        else setError(tEdit("customSlugErrorGeneric"));
        return;
      }
      const trimmed = raw.trim();
      setValue(trimmed);
      setSavedValue(trimmed);
      setJustSaved(true);
    } catch {
      setError(tEdit("customSlugErrorGeneric"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {urlPrefix ? (
        <div className="flex flex-col sm:flex-row sm:items-stretch border border-[#ebebeb] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition">
          <span
            className="block sm:flex sm:items-center px-4 py-2 sm:py-0 sm:pl-4 sm:pr-0.5 text-xs sm:text-sm text-charcoal-400 bg-charcoal-50 border-b sm:border-b-0 border-[#ebebeb] truncate sm:whitespace-nowrap select-none"
            title={urlPrefix}
          >
            {urlPrefix}
          </span>
          <input
            type="text"
            value={value}
            onChange={(e) => {
              setValue(sanitizeInput(e.target.value));
              setError(null);
              setJustSaved(false);
            }}
            className="flex-1 min-w-0 px-4 sm:px-1 py-2.5 text-base text-charcoal-800 focus:outline-none"
            placeholder={tEdit("customSlugPlaceholder")}
          />
        </div>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(sanitizeInput(e.target.value));
            setError(null);
            setJustSaved(false);
          }}
          className="w-full border border-[#ebebeb] rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
          placeholder={tEdit("customSlugPlaceholder")}
        />
      )}

      <p className="text-xs text-charcoal-400 mt-2">
        {savedValue ? tEdit("customSlugActive", { slug: savedValue }) : listingNumber != null ? tEdit("customSlugUsingNumber", { number: listingNumber }) : null}
      </p>

      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      {justSaved && !error && <p className="text-sm text-primary mt-2">{tEdit("customSlugSaved")}</p>}

      {/* Un seul bouton pour définir, changer ou vider le lien : un champ
          vidé puis sauvegardé remet custom_slug à NULL côté serveur (voir
          app/api/listings/[id]/custom-slug/route.ts), l'annonce retombe
          alors sur son numéro d'annonce — pas besoin d'une action séparée. */}
      <button
        type="button"
        onClick={() => performSave(value)}
        disabled={saving || !hasChanges}
        className="mt-3 rounded-full bg-primary text-white text-sm font-semibold px-5 py-2 hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {saving ? tEdit("customSlugSaving") : tEdit("customSlugSave")}
      </button>
    </div>
  );
}
