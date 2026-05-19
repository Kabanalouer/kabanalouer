"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AmenitiesPicker from "./AmenitiesPicker";
import NearbyActivitiesPicker from "./NearbyActivitiesPicker";
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
  citq_number: string;
  checkin_time: string;
  checkout_time: string;
  pets_allowed: boolean;
  smoking_allowed: boolean;
  checkin_type: "autonomous" | "in_person";
  nearby_activities: string[];
  price_on_request: boolean;
};

function timeSlots(startH: number, endH: number): string[] {
  const slots: string[] = [];
  for (let h = startH; h <= endH; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    if (h < endH) slots.push(`${String(h).padStart(2, "0")}:30`);
  }
  return slots;
}

const CHECKIN_SLOTS = timeSlots(8, 23);
const CHECKOUT_SLOTS = timeSlots(7, 18);

type SectionId =
  | "photos"
  | "titre"
  | "description"
  | "capacite"
  | "chambres"
  | "equipements"
  | "proximite"
  | "calendrier"
  | "localisation"
  | "tarifs"
  | "infos";

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
  { id: "proximite",    label: "À proximité",          emoji: "🗺️", isComplete: () => true },
  { id: "calendrier",   label: "Calendrier",           emoji: "📅", isComplete: () => true },
  { id: "localisation", label: "Localisation",         emoji: "📍", isComplete: (f) => f.region.trim().length > 0 },
  { id: "tarifs",       label: "Tarifs",               emoji: "💰", isComplete: (f) => f.price_on_request || f.price_low > 0 },
  { id: "infos",        label: "Infos générales",      emoji: "ℹ️",  isComplete: (f) => f.citq_number.length === 6 },
];

// Fields saved per section
const SECTION_FIELDS: Record<SectionId, (keyof FormState)[]> = {
  photos:       ["photos"],
  titre:        ["title"],
  description:  ["description"],
  capacite:     ["capacity", "bedrooms", "bathrooms"],
  equipements:  ["amenities"],
  proximite:    ["nearby_activities"],
  chambres:     [],
  calendrier:   [],
  localisation: [],
  tarifs:       ["price_low", "price_on_request"],
  infos:        ["citq_number", "checkin_time", "checkout_time", "pets_allowed", "smoking_allowed", "checkin_type"],
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
    citq_number: "",
    checkin_time: "16:00",
    checkout_time: "11:00",
    pets_allowed: false,
    smoking_allowed: false,
    checkin_type: "autonomous" as const,
    nearby_activities: [],
    price_on_request: false,
    ...initialData,
  });

  const [activeSection, setActiveSection] = useState<SectionId>("photos");
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isPublished, setIsPublished] = useState(initialPublished);
  const [togglingPublish, setTogglingPublish] = useState(false);

  // Title limit flash
  const [titleAtLimit, setTitleAtLimit] = useState(false);
  const titleLimitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Description limit flash
  const [descAtLimit, setDescAtLimit] = useState(false);
  const descLimitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSaveSection = async () => {
    const fields = SECTION_FIELDS[activeSection];
    if (!fields.length) return;

    if (activeSection === "infos" && form.citq_number.length !== 6) {
      setSaveError("Le numéro CITQ doit contenir exactement 6 chiffres.");
      return;
    }

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
    if (next && form.citq_number.length !== 6) {
      setActiveSection("infos");
      setSaveError("Le numéro CITQ doit contenir exactement 6 chiffres.");
      setTogglingPublish(false);
      return;
    }
    const { error } = await supabase
      .from("listings")
      .update({ is_published: next })
      .eq("id", listingId)
      .eq("host_id", userId);
    if (!error) setIsPublished(next);
    setTogglingPublish(false);
  };

  const handleTitleChange = (value: string) => {
    if (value.length > 50) {
      set("title", value.slice(0, 50));
      if (titleLimitTimer.current) clearTimeout(titleLimitTimer.current);
      setTitleAtLimit(true);
      titleLimitTimer.current = setTimeout(() => setTitleAtLimit(false), 1500);
    } else {
      set("title", value);
    }
  };

  const handleDescriptionChange = (value: string) => {
    if (value.length > 2500) {
      set("description", value.slice(0, 2500));
      if (descLimitTimer.current) clearTimeout(descLimitTimer.current);
      setDescAtLimit(true);
      descLimitTimer.current = setTimeout(() => setDescAtLimit(false), 1500);
    } else {
      set("description", value);
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
              <input
                type="text"
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className={inputCls}
                placeholder="ex. Chalet rustique au bord du lac, Laurentides"
              />
              <p className={`text-xs tabular-nums mt-1 text-right transition-colors duration-200 ${titleAtLimit ? "text-red-500" : "text-gray-400"}`}>
                {form.title.length}/50
              </p>
            </SectionShell>
          )}

          {/* Section: Description */}
          {activeSection === "description" && (
            <SectionShell title="Description" emoji="📝">
              <textarea
                value={form.description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                className={`${inputCls} resize-none`}
                rows={8}
                placeholder="Décrivez l'atmosphère, les points forts, les activités à proximité…"
              />
              <p className={`text-xs tabular-nums mt-1 text-right transition-colors duration-200 ${descAtLimit ? "text-red-500" : "text-gray-400"}`}>
                {form.description.length}/2500
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

          {/* Section: À proximité */}
          {activeSection === "proximite" && (
            <SectionShell title="À proximité" emoji="🗺️">
              <p className="text-sm text-gray-400 mb-5">À moins de 30 minutes du chalet</p>
              <NearbyActivitiesPicker
                selected={form.nearby_activities}
                onChange={(activities) => set("nearby_activities", activities)}
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
              {/* Pricing mode cards */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { value: false, emoji: "💰", title: "À partir de", desc: "Affichez un prix de base sur votre fiche. Les voyageurs voient votre tarif minimum et vous contactent pour confirmer." },
                  { value: true,  emoji: "✉️", title: "Sur demande",  desc: "Aucun prix affiché sur votre fiche. Les voyageurs vous contactent pour obtenir une soumission personnalisée." },
                ].map((opt) => (
                  <button key={String(opt.value)} type="button" onClick={() => set("price_on_request", opt.value)}
                    className={`text-left p-4 rounded-xl border-2 transition-colors ${form.price_on_request === opt.value ? "border-primary bg-primary-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                    <span className="text-xl block mb-1">{opt.emoji}</span>
                    <p className="font-semibold text-sm text-gray-900">{opt.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-snug">{opt.desc}</p>
                  </button>
                ))}
              </div>

              {/* Conditional price field */}
              {!form.price_on_request ? (
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
              ) : (
                <div className="bg-gray-50 rounded-xl px-4 py-4 text-sm text-gray-600 leading-relaxed">
                  Votre fiche affichera :{" "}
                  <span className="font-semibold text-gray-900">«&nbsp;Prix sur demande — Contactez l&apos;hôte&nbsp;»</span>
                </div>
              )}
            </SectionShell>
          )}

          {/* Section: Infos générales */}
          {activeSection === "infos" && (
            <SectionShell title="Informations générales" emoji="ℹ️">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Numéro CITQ *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.citq_number}
                    onChange={(e) => set("citq_number", e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className={inputCls}
                    placeholder="ex. 123456"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Heure du check-in</label>
                    <select
                      value={form.checkin_time}
                      onChange={(e) => set("checkin_time", e.target.value)}
                      className={inputCls}
                    >
                      {CHECKIN_SLOTS.map((t) => (
                        <option key={t} value={t}>{t.replace(":", "h")}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Heure du check-out</label>
                    <select
                      value={form.checkout_time}
                      onChange={(e) => set("checkout_time", e.target.value)}
                      className={inputCls}
                    >
                      {CHECKOUT_SLOTS.map((t) => (
                        <option key={t} value={t}>{t.replace(":", "h")}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Type d&apos;arrivée</label>
                  <CheckinTypeField value={form.checkin_type} onChange={(v) => set("checkin_type", v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Animaux acceptés</label>
                    <ToggleField value={form.pets_allowed} onChange={(v) => set("pets_allowed", v)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Fumeur accepté</label>
                    <ToggleField value={form.smoking_allowed} onChange={(v) => set("smoking_allowed", v)} />
                  </div>
                </div>
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

function CheckinTypeField({ value, onChange }: { value: "autonomous" | "in_person"; onChange: (v: "autonomous" | "in_person") => void }) {
  const options = [
    { id: "autonomous" as const, emoji: "🔑", title: "Arrivée autonome", desc: "Accès par code numérique ou boîte à clés" },
    { id: "in_person" as const,  emoji: "🤝", title: "Accueil sur place",  desc: "Remise des clés en personne à l'arrivée" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((o) => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)}
          className={`text-left p-4 rounded-xl border-2 transition-colors ${value === o.id ? "border-primary bg-primary-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
          <span className="text-xl block mb-1">{o.emoji}</span>
          <p className="font-semibold text-sm text-gray-900">{o.title}</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-snug">{o.desc}</p>
        </button>
      ))}
    </div>
  );
}

function ToggleField({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm w-fit">
      <button type="button" onClick={() => onChange(false)}
        className={`px-5 py-2 font-medium transition-colors ${!value ? "bg-primary text-white" : "text-gray-500 hover:bg-gray-50"}`}>
        Non
      </button>
      <button type="button" onClick={() => onChange(true)}
        className={`px-5 py-2 font-medium transition-colors ${value ? "bg-primary text-white" : "text-gray-500 hover:bg-gray-50"}`}>
        Oui
      </button>
    </div>
  );
}
