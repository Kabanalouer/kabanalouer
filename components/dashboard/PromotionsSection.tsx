"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPromoLabel, type PromoRow } from "@/lib/promoLabel";

type PromoFormType = "rabais" | "duree" | "lastminute";

const inputCls =
  "w-full border border-[#ebebeb] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition";

function DateRangeFields({
  start, end, onStart, onEnd,
}: {
  start: string; end: string;
  onStart: (v: string) => void; onEnd: (v: string) => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Date de début</label>
        <input type="date" value={start} min={today} onChange={(e) => onStart(e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Date de fin</label>
        <input type="date" value={end} min={start || today} onChange={(e) => onEnd(e.target.value)} className={inputCls} />
      </div>
    </div>
  );
}

export default function PromotionsSection({ listingId }: { listingId: string }) {
  const supabase = createClient();
  const [activePromo, setActivePromo] = useState<PromoRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [error, setError] = useState("");

  const [formType, setFormType] = useState<PromoFormType>("rabais");
  const [rabaisUnit, setRabaisUnit] = useState<"percent" | "amount">("percent");
  const [rabaisValue, setRabaisValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [lmPercent, setLmPercent] = useState("");
  const [lmDays, setLmDays] = useState("7");

  const fetchPromo = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("promotions")
      .select("*")
      .eq("listing_id", listingId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setActivePromo(data as PromoRow | null);
    setLoading(false);
  }, [listingId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void fetchPromo(); }, [fetchPromo]);

  const handleDeactivate = async () => {
    if (!activePromo) return;
    setDeactivating(true);
    setError("");
    const { error: err } = await supabase
      .from("promotions")
      .update({ is_active: false })
      .eq("id", activePromo.id);
    setDeactivating(false);
    if (err) { setError("Erreur lors de la désactivation."); return; }
    setActivePromo(null);
  };

  const handleSave = async () => {
    setError("");
    setSaving(true);

    let type: PromoRow["type"];
    let value: number;
    let minNights: number | null = null;
    let daysBefore: number | null = null;
    let startDateVal: string | null = null;
    let endDateVal: string | null = null;

    if (formType === "rabais") {
      type = rabaisUnit;
      value = parseInt(rabaisValue) || 0;
      if (value <= 0) { setError("Entrez un montant valide."); setSaving(false); return; }
      if (rabaisUnit === "percent" && value > 100) { setError("Le pourcentage ne peut pas dépasser 100."); setSaving(false); return; }
      if (!startDate || !endDate) { setError("Les dates sont obligatoires."); setSaving(false); return; }
      if (startDate >= endDate) { setError("La date de fin doit être après la date de début."); setSaving(false); return; }
      startDateVal = startDate;
      endDateVal = endDate;
    } else if (formType === "duree") {
      type = "duration";
      value = 1;
      minNights = 2;
      if (!startDate || !endDate) { setError("Les dates sont obligatoires."); setSaving(false); return; }
      if (startDate >= endDate) { setError("La date de fin doit être après la date de début."); setSaving(false); return; }
      startDateVal = startDate;
      endDateVal = endDate;
    } else {
      type = "lastminute";
      value = parseInt(lmPercent) || 0;
      daysBefore = parseInt(lmDays) || 0;
      if (value <= 0 || value > 100) { setError("Entrez un pourcentage entre 1 et 100."); setSaving(false); return; }
      if (daysBefore <= 0) { setError("Entrez un nombre de jours valide."); setSaving(false); return; }
    }

    const { error: err } = await supabase.from("promotions").insert({
      listing_id: listingId,
      type,
      value,
      min_nights: minNights,
      days_before: daysBefore,
      start_date: startDateVal,
      end_date: endDateVal,
      is_active: true,
    });

    setSaving(false);
    if (err) { setError("Erreur lors de la sauvegarde. Réessayez."); return; }
    await fetchPromo();
  };

  if (loading) {
    return <div className="py-8 text-center text-charcoal-400 text-sm">Chargement…</div>;
  }

  return (
    <div className="max-w-xl">
      {activePromo ? (
        <div className="bg-charcoal-50 rounded-2xl border border-[#ebebeb] p-5">
          <p className="text-xs font-semibold text-charcoal-400 uppercase tracking-wider mb-2">Promotion active</p>
          <div className="flex items-start justify-between gap-4">
            <p className="text-base font-semibold text-charcoal-800">{formatPromoLabel(activePromo)}</p>
            <button
              onClick={handleDeactivate}
              disabled={deactivating}
              className="shrink-0 text-sm text-charcoal-500 hover:text-charcoal-800 border border-[#ebebeb] bg-white rounded-full px-4 py-1.5 transition-colors disabled:opacity-50"
            >
              {deactivating ? "Désactivation…" : "Désactiver"}
            </button>
          </div>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>
      ) : (
        <div>
          <p className="text-sm text-charcoal-400 mb-5">
            Aucune promotion active. Choisissez un type et configurez votre offre.
          </p>

          {/* Type selection */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <button
              type="button"
              onClick={() => setFormType("rabais")}
              className={`text-left p-4 rounded-xl border-2 transition-colors ${formType === "rabais" ? "border-primary bg-primary/5" : "border-[#ebebeb] bg-white hover:border-charcoal-300"}`}
            >
              <svg className="w-5 h-5 text-charcoal-500 mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
              </svg>
              <p className="font-semibold text-sm text-charcoal-800">Rabais</p>
              <p className="text-xs text-charcoal-500 mt-0.5 leading-snug">Réduire le prix par nuit</p>
            </button>

            <button
              type="button"
              onClick={() => setFormType("duree")}
              className={`text-left p-4 rounded-xl border-2 transition-colors ${formType === "duree" ? "border-primary bg-primary/5" : "border-[#ebebeb] bg-white hover:border-charcoal-300"}`}
            >
              <svg className="w-5 h-5 text-charcoal-500 mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
              </svg>
              <p className="font-semibold text-sm text-charcoal-800">Nuit gratuite</p>
              <p className="text-xs text-charcoal-500 mt-0.5 leading-snug">Prolongez le plaisir</p>
            </button>

            <button
              type="button"
              onClick={() => setFormType("lastminute")}
              className={`text-left p-4 rounded-xl border-2 transition-colors ${formType === "lastminute" ? "border-primary bg-primary/5" : "border-[#ebebeb] bg-white hover:border-charcoal-300"}`}
            >
              <svg className="w-5 h-5 text-charcoal-500 mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="font-semibold text-sm text-charcoal-800">Dernière minute</p>
              <p className="text-xs text-charcoal-500 mt-0.5 leading-snug">Rabais automatique si réservation proche</p>
            </button>
          </div>

          {/* Rabais fields */}
          {formType === "rabais" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-2">Montant du rabais</label>
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setRabaisUnit("percent")}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${rabaisUnit === "percent" ? "bg-charcoal-800 text-white border-charcoal-800" : "bg-white text-charcoal-600 border-[#ebebeb] hover:border-charcoal-300"}`}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => setRabaisUnit("amount")}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${rabaisUnit === "amount" ? "bg-charcoal-800 text-white border-charcoal-800" : "bg-white text-charcoal-600 border-[#ebebeb] hover:border-charcoal-300"}`}
                  >
                    $
                  </button>
                </div>
                <div className="max-w-xs flex items-center gap-2">
                  <input
                    type="number" min={1} max={rabaisUnit === "percent" ? 100 : undefined}
                    value={rabaisValue} onChange={(e) => setRabaisValue(e.target.value)}
                    className={inputCls} placeholder={rabaisUnit === "percent" ? "ex. 20" : "ex. 50"}
                  />
                  <span className="text-sm text-charcoal-500 shrink-0">{rabaisUnit === "percent" ? "%" : "$/nuit"}</span>
                </div>
              </div>
              <p className="text-sm text-charcoal-400">Rabais applicable pour les séjours entre le :</p>
              <DateRangeFields start={startDate} end={endDate} onStart={setStartDate} onEnd={setEndDate} />
            </div>
          )}

          {/* Nuit gratuite fields */}
          {formType === "duree" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-2">Type d&apos;offre</label>
                <p className="text-sm text-charcoal-600">
                  Réservez un séjour de 2 nuits minimum et obtenez 1 nuit <span className="font-semibold text-primary">GRATUITE</span>.
                </p>
              </div>
              <p className="text-sm text-charcoal-400">Promo applicable pour les séjours entre le :</p>
              <DateRangeFields start={startDate} end={endDate} onStart={setStartDate} onEnd={setEndDate} />
            </div>
          )}

          {/* Dernière minute fields */}
          {formType === "lastminute" && (
            <div className="space-y-4">
              <div className="max-w-xs">
                <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Rabais (%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={1} max={100} value={lmPercent}
                    onChange={(e) => setLmPercent(e.target.value)}
                    className={inputCls} placeholder="ex. 15"
                  />
                  <span className="text-sm text-charcoal-500 shrink-0">%</span>
                </div>
              </div>
              <div className="max-w-xs">
                <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Jours avant l&apos;arrivée</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={1} value={lmDays}
                    onChange={(e) => setLmDays(e.target.value)}
                    className={inputCls} placeholder="ex. 7"
                  />
                  <span className="text-sm text-charcoal-500 shrink-0">jours</span>
                </div>
              </div>
              <p className="text-sm text-charcoal-400">
                Ce rabais s&apos;applique en continu tant que la promotion est active.
              </p>
            </div>
          )}

          {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

          <div className="mt-6">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bg-primary text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {saving ? "Activation…" : "Activer la promotion"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
