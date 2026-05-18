"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AmenitiesPicker from "./AmenitiesPicker";
import PhotoUpload from "./PhotoUpload";
import QualityScore from "./QualityScore";
import type { PhotoItem } from "@/lib/photo";

const REGIONS = [
  "Charlevoix",
  "Estrie (Cantons-de-l'Est)",
  "Gaspésie",
  "Lanaudière",
  "Laurentides",
  "Mauricie",
  "Outaouais",
  "Québec (ville et région)",
  "Saguenay–Lac-Saint-Jean",
  "Abitibi-Témiscamingue",
  "Côte-Nord",
  "Centre-du-Québec",
];

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

const INITIAL: FormState = {
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
  photos: [],
};

export default function ListingForm({
  userId,
  listingId,
  initialData,
}: {
  userId: string;
  listingId?: string;
  initialData?: Partial<FormState>;
}) {
  const [form, setForm] = useState<FormState>({ ...INITIAL, ...initialData });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const canGenerateAI = form.region.length > 0 && form.capacity > 0;

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

  const handleSave = async (publish: boolean) => {
    if (!form.region || !form.title) {
      setSaveError("La région et le titre sont requis.");
      return;
    }
    setSaving(true);
    setSaveError("");

    const payload = {
      title: form.title,
      description: form.description,
      region: form.region,
      address: form.address,
      capacity: form.capacity,
      bedrooms: form.bedrooms,
      bathrooms: form.bathrooms,
      price_low: form.price_low,
      price_high: form.price_high,
      price_peak: form.price_peak,
      amenities: form.amenities,
      photos: form.photos,
      is_published: publish,
    };

    if (listingId) {
      const { error } = await supabase
        .from("listings")
        .update(payload)
        .eq("id", listingId)
        .eq("host_id", userId);

      if (error) {
        setSaveError("Erreur lors de la mise à jour. Réessayez.");
        setSaving(false);
        return;
      }
      router.push("/dashboard/listings");
    } else {
      const { data, error } = await supabase
        .from("listings")
        .insert({ ...payload, host_id: userId })
        .select("id")
        .single();

      if (error) {
        setSaveError("Erreur lors de l'enregistrement. Réessayez.");
        setSaving(false);
        return;
      }
      router.push(`/dashboard?created=${data.id}`);
    }
  };

  return (
    <div className="flex gap-6 items-start">
      {/* ── Main form ── */}
      <div className="flex-1 min-w-0 space-y-6">

        {/* Section 1: Localisation */}
        <FormSection title="Localisation & capacité" step={1}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Région *</Label>
              <select
                value={form.region}
                onChange={(e) => set("region", e.target.value)}
                className={inputCls}
                required
              >
                <option value="">Sélectionnez une région</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <Label>Adresse (optionnel — non affichée publiquement)</Label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                className={inputCls}
                placeholder="123 chemin du Lac, Saint-Donat"
              />
            </div>
            <div>
              <Label>Capacité (personnes) *</Label>
              <input type="number" min={1} max={30} value={form.capacity}
                onChange={(e) => set("capacity", parseInt(e.target.value) || 1)}
                className={inputCls} />
            </div>
            <div>
              <Label>Chambres *</Label>
              <input type="number" min={1} max={20} value={form.bedrooms}
                onChange={(e) => set("bedrooms", parseInt(e.target.value) || 1)}
                className={inputCls} />
            </div>
            <div>
              <Label>Salles de bain *</Label>
              <input type="number" min={1} max={10} value={form.bathrooms}
                onChange={(e) => set("bathrooms", parseInt(e.target.value) || 1)}
                className={inputCls} />
            </div>
          </div>
        </FormSection>

        {/* Section 2: Description avec IA */}
        <FormSection title="Titre & description" step={2}>
          {/* AI Button */}
          <div className="flex items-center gap-3 p-4 bg-ai-light rounded-xl mb-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ai">
                ✦ Génération IA
              </p>
              <p className="text-xs text-ai/70 mt-0.5">
                {canGenerateAI
                  ? "Remplissez la région et les équipements, puis générez votre description."
                  : "Remplissez d'abord la région et la capacité pour activer l'IA."}
              </p>
            </div>
            <button
              type="button"
              disabled={!canGenerateAI || aiLoading}
              onClick={handleGenerateAI}
              className="shrink-0 bg-ai text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#4239A0] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {aiLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Génération…
                </>
              ) : (
                "✦ Générer avec l'IA"
              )}
            </button>
          </div>

          {aiError && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2 mb-4">{aiError}</p>
          )}

          <div className="space-y-4">
            <div>
              <Label>Titre *</Label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                className={inputCls}
                placeholder="ex. Chalet rustique au bord du lac, Laurentides"
                maxLength={100}
              />
              <p className="text-xs text-gray-400 mt-1 text-right">
                {form.title.length}/100
              </p>
            </div>
            <div>
              <Label>Description</Label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                className={`${inputCls} resize-none`}
                rows={6}
                placeholder="Décrivez l'atmosphère, les points forts, les activités à proximité…"
              />
              <p className="text-xs text-gray-400 mt-1">
                {form.description.length} caractères
                {form.description.length > 0 && form.description.length < 150 && (
                  <span className="text-yellow-500"> · 150 recommandé pour un bon score</span>
                )}
              </p>
            </div>
          </div>
        </FormSection>

        {/* Section 3: Photos */}
        <FormSection title="Photos" step={3}>
          <PhotoUpload
            photos={form.photos}
            userId={userId}
            onChange={(photos) => set("photos", photos)}
          />
        </FormSection>

        {/* Section 4: Équipements */}
        <FormSection title="Équipements" step={4}>
          <AmenitiesPicker
            selected={form.amenities}
            onChange={(amenities) => set("amenities", amenities)}
          />
        </FormSection>

        {/* Section 5: Tarifs */}
        <FormSection title="Tarifs ($ / nuit)" step={5}>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Basse saison</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number" min={0} value={form.price_low || ""}
                  onChange={(e) => set("price_low", parseInt(e.target.value) || 0)}
                  className={`${inputCls} pl-7`} placeholder="150" />
              </div>
            </div>
            <div>
              <Label>Haute saison</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number" min={0} value={form.price_high || ""}
                  onChange={(e) => set("price_high", parseInt(e.target.value) || 0)}
                  className={`${inputCls} pl-7`} placeholder="250" />
              </div>
            </div>
            <div>
              <Label>Fêtes / Vacances</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number" min={0} value={form.price_peak || ""}
                  onChange={(e) => set("price_peak", parseInt(e.target.value) || 0)}
                  className={`${inputCls} pl-7`} placeholder="350" />
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Ces tarifs sont indicatifs. Vous les communiquerez directement aux voyageurs.
          </p>
        </FormSection>

        {/* Submit */}
        {saveError && (
          <div className="bg-red-50 text-red-600 rounded-xl px-4 py-3 text-sm">{saveError}</div>
        )}
        <div className="flex gap-3 pb-8">
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={saving}
            className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm"
          >
            {saving ? "Enregistrement…" : "Enregistrer comme brouillon"}
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={saving}
            className="flex-1 bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm"
          >
            {saving ? "Publication…" : "Publier le chalet →"}
          </button>
        </div>
      </div>

      {/* ── Score sidebar (sticky) ── */}
      <div className="w-64 shrink-0 sticky top-6 hidden lg:block">
        <QualityScore data={form} />
      </div>
    </div>
  );
}

function FormSection({
  title,
  step,
  children,
}: {
  title: string;
  step: number;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-5">
        <span className="w-7 h-7 bg-primary text-white text-sm font-bold rounded-full flex items-center justify-center shrink-0">
          {step}
        </span>
        <h2 className="font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {children}
    </label>
  );
}

const inputCls =
  "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition";
