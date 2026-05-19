"use client";

import { useState, useRef } from "react";
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
  citq_number: string;
  checkin_time: string;
  checkout_time: string;
  pets_allowed: boolean;
  smoking_allowed: boolean;
  checkin_type: "autonomous" | "in_person";
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
  citq_number: "",
  checkin_time: "16:00",
  checkout_time: "11:00",
  pets_allowed: false,
  smoking_allowed: false,
  checkin_type: "autonomous",
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
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [descAtLimit, setDescAtLimit] = useState(false);
  const descLimitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

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

  const handleSave = async (publish: boolean) => {
    if (!form.region || !form.title) {
      setSaveError("La région et le titre sont requis.");
      return;
    }
    if (form.citq_number.length !== 6) {
      setSaveError("Le numéro CITQ doit contenir exactement 6 chiffres.");
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
      citq_number: form.citq_number || null,
      checkin_time: form.checkin_time,
      checkout_time: form.checkout_time,
      pets_allowed: form.pets_allowed,
      smoking_allowed: form.smoking_allowed,
      checkin_type: form.checkin_type,
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

        {/* Section 2: Titre & description */}
        <FormSection title="Titre & description" step={2}>
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
                onChange={(e) => handleDescriptionChange(e.target.value)}
                className={`${inputCls} resize-none`}
                rows={6}
                placeholder="Décrivez l'atmosphère, les points forts, les activités à proximité…"
              />
              <p className={`text-xs tabular-nums mt-1 text-right transition-colors duration-200 ${descAtLimit ? "text-red-500" : "text-gray-400"}`}>
                {form.description.length}/2500
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

        {/* Section 6: Informations générales */}
        <FormSection title="Informations générales" step={6}>
          <div className="space-y-5">
            <div>
              <Label>Numéro CITQ *</Label>
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
                <Label>Heure du check-in</Label>
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
                <Label>Heure du check-out</Label>
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
              <Label>Type d&apos;arrivée</Label>
              <CheckinTypeField value={form.checkin_type} onChange={(v) => set("checkin_type", v)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Animaux acceptés</Label>
                <ToggleField value={form.pets_allowed} onChange={(v) => set("pets_allowed", v)} />
              </div>
              <div>
                <Label>Fumeur accepté</Label>
                <ToggleField value={form.smoking_allowed} onChange={(v) => set("smoking_allowed", v)} />
              </div>
            </div>
          </div>
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

const inputCls =
  "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition";
