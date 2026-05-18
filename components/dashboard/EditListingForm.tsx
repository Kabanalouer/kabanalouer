"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AmenitiesPicker from "./AmenitiesPicker";
import PhotoUpload from "./PhotoUpload";
import RoomsSection from "./RoomsSection";
import LocationSection from "./LocationSection";
import type { PhotoItem } from "@/lib/photo";


type FormState = {
  title: string;
  description: string;
  region: string;
  address: string;
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  price_low: number;
  price_high: number;
  price_peak: number;
  amenities: string[];
  photos: PhotoItem[];
};

type SectionId =
  | "photos"
  | "titre"
  | "description"
  | "capacite"
  | "chambres"
  | "equipements"
  | "calendrier"
  | "localisation"
  | "tarifs";

const SECTIONS: Array<{
  id: SectionId;
  label: string;
  emoji: string;
  isComplete: (f: FormState) => boolean;
}> = [
  { id: "photos",       label: "Photos",               emoji: "📷", isComplete: (f) => (f.photos as PhotoItem[]).length > 0 },
  { id: "titre",        label: "Titre",                emoji: "✏️", isComplete: (f) => f.title.trim().length > 0 },
  { id: "description",  label: "Description",          emoji: "📝", isComplete: (f) => f.description.trim().length > 0 },
  { id: "capacite",     label: "Nombre de voyageurs",  emoji: "👥", isComplete: (f) => f.capacity > 0 },
  { id: "chambres",     label: "Chambres",             emoji: "🛏", isComplete: () => true },
  { id: "equipements",  label: "Équipements",          emoji: "✨", isComplete: (f) => f.amenities.length > 0 },
  { id: "calendrier",   label: "Calendrier",           emoji: "📅", isComplete: () => true },
  { id: "localisation", label: "Localisation",         emoji: "📍", isComplete: (f) => f.region.trim().length > 0 },
  { id: "tarifs",       label: "Tarifs",               emoji: "💰", isComplete: (f) => f.price_low > 0 },
];

// Fields saved per section
const SECTION_FIELDS: Record<SectionId, (keyof FormState)[]> = {
  photos:       ["photos"],
  titre:        ["title"],
  description:  ["description"],
  capacite:     ["capacity", "bedrooms", "bathrooms"],
  equipements:  ["amenities"],
  chambres:     [],
  calendrier:   [],
  localisation: [],
  tarifs:       ["price_low"],
};

const inputCls =
  "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition";

export default function EditListingForm({
  userId,
  listingId,
  initialData,
  isPublished: initialPublished,
  initialCity,
  initialLat,
  initialLng,
}: {
  userId: string;
  listingId: string;
  initialData: Partial<FormState>;
  isPublished: boolean;
  initialCity: string;
  initialLat: number | null;
  initialLng: number | null;
}) {
  const supabase = createClient();

  const [form, setForm] = useState<FormState>({
    title: "",
    description: "",
    region: "",
    address: "",
    capacity: 4,
    bedrooms: 2,
    bathrooms: 1,
    price_low: 0,
    price_high: 0,
    price_peak: 0,
    amenities: [],
    photos: [] as PhotoItem[],
    ...initialData,
  });

  const [activeSection, setActiveSection] = useState<SectionId>("photos");
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isPublished, setIsPublished] = useState(initialPublished);
  const [togglingPublish, setTogglingPublish] = useState(false);

  // AI generation state (used in description section)
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSaveSection = async () => {
    const fields = SECTION_FIELDS[activeSection];
    if (!fields.length) return;

    setSaving(true);
    setSaveError("");

    const payload: Record<string, unknown> = {};
    for (const field of fields) {
      payload[field] = form[field];
    }

    const { error } = await supabase
      .from("listings")
      .update(payload)
      .eq("id", listingId)
      .eq("host_id", userId);

    setSaving(false);
    if (error) {
      setSaveError("Erreur lors de l'enregistrement. Réessayez.");
    } else {
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
    }
  };

  const handleTogglePublish = async () => {
    setTogglingPublish(true);
    const next = !isPublished;
    const { error } = await supabase
      .from("listings")
      .update({ is_published: next })
      .eq("id", listingId)
      .eq("host_id", userId);
    if (!error) setIsPublished(next);
    setTogglingPublish(false);
  };

  const handleGenerateAI = async () => {
    setAiLoading(true);
    setAiError("");
    try {
      const res = await fetch("/api/ai/generate-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region: form.region,
          amenities: form.amenities,
          capacity: form.capacity,
          bedrooms: form.bedrooms,
          bathrooms: form.bathrooms,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur inconnue");
      if (data.title) set("title", data.title);
      if (data.description) set("description", data.description);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Erreur de génération");
    } finally {
      setAiLoading(false);
    }
  };

  const hasSaveButton = SECTION_FIELDS[activeSection].length > 0;

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">

      {/* ── Left nav ────────────────────────────────────────────────────── */}
      <aside className="w-full lg:w-56 shrink-0">

        {/* Mobile: horizontal scrollable tabs */}
        <div className="flex lg:hidden gap-1 overflow-x-auto pb-1 scrollbar-none">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => { setActiveSection(s.id); setSaveError(""); setJustSaved(false); }}
              className={[
                "flex items-center gap-1.5 whitespace-nowrap px-3 py-2 rounded-xl text-sm font-medium transition-colors shrink-0",
                activeSection === s.id
                  ? "bg-primary text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50",
              ].join(" ")}
            >
              <span>{s.emoji}</span>
              <span>{s.label}</span>
              {s.isComplete(form) && activeSection !== s.id && (
                <span className="text-green-500 text-xs">✓</span>
              )}
            </button>
          ))}
        </div>

        {/* Desktop: vertical list */}
        <div className="hidden lg:flex flex-col gap-1">
          {SECTIONS.map((s) => {
            const complete = s.isComplete(form);
            const active = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => { setActiveSection(s.id); setSaveError(""); setJustSaved(false); }}
                className={[
                  "flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left transition-colors",
                  active
                    ? "bg-primary text-white"
                    : "text-gray-600 hover:bg-gray-100",
                ].join(" ")}
              >
                <span className="flex items-center gap-2.5">
                  <span>{s.emoji}</span>
                  <span>{s.label}</span>
                </span>
                {complete && !active && (
                  <span className="text-green-500 text-xs shrink-0">✓</span>
                )}
              </button>
            );
          })}

          {/* Publish toggle */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={handleTogglePublish}
              disabled={togglingPublish}
              className={[
                "w-full py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50",
                isPublished
                  ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  : "bg-primary text-white hover:bg-primary-dark",
              ].join(" ")}
            >
              {togglingPublish ? "…" : isPublished ? "Dépublier" : "Publier →"}
            </button>
            <p className="text-xs text-center text-gray-400 mt-2">
              {isPublished ? "Visible publiquement" : "Brouillon"}
            </p>
          </div>
        </div>
      </aside>

      {/* ── Content area ────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">

          {/* Section: Photos */}
          {activeSection === "photos" && (
            <SectionShell title="Photos" emoji="📷">
              <PhotoUpload
                photos={form.photos}
                userId={userId}
                listingId={listingId}
                onChange={(photos) => set("photos", photos)}
              />
            </SectionShell>
          )}

          {/* Section: Titre */}
          {activeSection === "titre" && (
            <SectionShell title="Titre" emoji="✏️">
              <div className="flex items-center gap-3 p-4 bg-[#EEEDFE] rounded-xl mb-5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#534AB7]">✦ Génération IA</p>
                  <p className="text-xs text-[#534AB7]/70 mt-0.5">
                    Remplissez d&apos;abord la région et les équipements pour activer l&apos;IA.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!form.region || aiLoading}
                  onClick={handleGenerateAI}
                  className="shrink-0 bg-[#534AB7] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#4239A0] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {aiLoading ? (
                    <><Spinner />Génération…</>
                  ) : "✦ Générer"}
                </button>
              </div>
              {aiError && <p className="text-sm text-red-500 mb-4">{aiError}</p>}
              <input
                type="text"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                className={inputCls}
                placeholder="ex. Chalet rustique au bord du lac, Laurentides"
                maxLength={100}
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{form.title.length}/100</p>
            </SectionShell>
          )}

          {/* Section: Description */}
          {activeSection === "description" && (
            <SectionShell title="Description" emoji="📝">
              <div className="flex items-center gap-3 p-4 bg-[#EEEDFE] rounded-xl mb-5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#534AB7]">✦ Génération IA</p>
                  <p className="text-xs text-[#534AB7]/70 mt-0.5">
                    Remplissez d&apos;abord la région et les équipements pour activer l&apos;IA.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!form.region || aiLoading}
                  onClick={handleGenerateAI}
                  className="shrink-0 bg-[#534AB7] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#4239A0] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {aiLoading ? (
                    <><Spinner />Génération…</>
                  ) : "✦ Générer"}
                </button>
              </div>
              {aiError && <p className="text-sm text-red-500 mb-4">{aiError}</p>}
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                className={`${inputCls} resize-none`}
                rows={8}
                placeholder="Décrivez l'atmosphère, les points forts, les activités à proximité…"
              />
              <p className="text-xs text-gray-400 mt-1">
                {form.description.length} caractères
                {form.description.length > 0 && form.description.length < 150 && (
                  <span className="text-yellow-500"> · 150+ recommandé</span>
                )}
              </p>
            </SectionShell>
          )}

          {/* Section: Capacité */}
          {activeSection === "capacite" && (
            <SectionShell title="Nombre de voyageurs" emoji="👥">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Capacité (personnes)</Label>
                  <input
                    type="number" min={1} max={30}
                    value={form.capacity}
                    onChange={(e) => set("capacity", parseInt(e.target.value) || 1)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label>Chambres</Label>
                  <input
                    type="number" min={1} max={20}
                    value={form.bedrooms}
                    onChange={(e) => set("bedrooms", parseInt(e.target.value) || 1)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label>Salles de bain</Label>
                  <input
                    type="number" min={1} max={10}
                    value={form.bathrooms}
                    onChange={(e) => set("bathrooms", parseInt(e.target.value) || 1)}
                    className={inputCls}
                  />
                </div>
              </div>
            </SectionShell>
          )}

          {/* Section: Chambres */}
          {activeSection === "chambres" && (
            <SectionShell title="Chambres" emoji="🛏">
              <RoomsSection userId={userId} listingId={listingId} />
            </SectionShell>
          )}

          {/* Section: Équipements */}
          {activeSection === "equipements" && (
            <SectionShell title="Équipements" emoji="✨">
              <AmenitiesPicker
                selected={form.amenities}
                onChange={(amenities) => set("amenities", amenities)}
              />
            </SectionShell>
          )}

          {/* Section: Calendrier */}
          {activeSection === "calendrier" && (
            <SectionShell title="Calendrier" emoji="📅">
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📅</div>
                <p className="text-gray-600 font-medium mb-2">Gérez vos disponibilités</p>
                <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
                  Bloquez des dates, synchronisez votre calendrier iCal et exportez vos disponibilités.
                </p>
                <Link
                  href={`/dashboard/listings/${listingId}/availability`}
                  className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-dark transition-colors text-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Gérer les disponibilités
                </Link>
              </div>
            </SectionShell>
          )}

          {/* Section: Localisation */}
          {activeSection === "localisation" && (
            <SectionShell title="Localisation" emoji="📍">
              <LocationSection
                listingId={listingId}
                userId={userId}
                initialAddress={form.address}
                initialCity={initialCity}
                initialRegion={form.region}
                initialLat={initialLat}
                initialLng={initialLng}
                onRegionChange={(r) => set("region", r)}
              />
            </SectionShell>
          )}

          {/* Section: Tarifs */}
          {activeSection === "tarifs" && (
            <SectionShell title="Tarifs" emoji="💰">
              <div className="max-w-xs">
                <Label>Prix à partir de ($/nuit)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    min={0}
                    value={form.price_low || ""}
                    onChange={(e) => set("price_low", parseInt(e.target.value) || 0)}
                    className={`${inputCls} pl-7`}
                    placeholder="189"
                  />
                </div>
                <p className="text-sm text-gray-400 mt-3 leading-relaxed">
                  Ce prix sera affiché sur votre fiche publique. Vous communiquez le prix final directement avec le voyageur.
                </p>
                {form.price_low > 0 && (
                  <div className="mt-4 bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-600">
                    Aperçu : <span className="font-semibold text-gray-900">À partir de {form.price_low} $/nuit</span>
                  </div>
                )}
              </div>
            </SectionShell>
          )}

          {/* Save bar */}
          {hasSaveButton && (
            <div className="mt-6 pt-5 border-t border-gray-100 flex items-center gap-3">
              <button
                onClick={handleSaveSection}
                disabled={saving}
                className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <><Spinner />Enregistrement…</>
                ) : justSaved ? (
                  "Enregistré ✓"
                ) : (
                  "Enregistrer"
                )}
              </button>
              {saveError && <p className="text-sm text-red-500">{saveError}</p>}
            </div>
          )}
        </div>

        {/* Mobile publish toggle */}
        <div className="flex lg:hidden items-center justify-between mt-4 bg-white rounded-2xl border border-gray-100 px-5 py-4">
          <div>
            <p className="text-sm font-medium text-gray-900">
              Statut : {isPublished ? "Publié" : "Brouillon"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {isPublished ? "Visible publiquement" : "Non visible"}
            </p>
          </div>
          <button
            onClick={handleTogglePublish}
            disabled={togglingPublish}
            className={[
              "px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50",
              isPublished
                ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                : "bg-primary text-white hover:bg-primary-dark",
            ].join(" ")}
          >
            {togglingPublish ? "…" : isPublished ? "Dépublier" : "Publier"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionShell({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <span className="text-xl">{emoji}</span>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1.5">{children}</label>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
