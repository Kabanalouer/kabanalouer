"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import AmenityIcon from "@/components/AmenityIcon";
import {
  AMENITY_CATALOG,
  AMENITY_CATEGORIES,
  getAmenityCatalogEntry,
  summarizeAmenityDetails,
  type AmenityValue,
  type AmenityCatalogEntry,
  type AmenityDetailField,
} from "@/lib/amenities-catalog";

type HoursValue = { open24?: boolean; start?: string; end?: string };

function normalizeForSearch(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const fieldInputCls =
  "border border-[#ebebeb] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition";

function pillCls(active: boolean) {
  return `px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
    active
      ? "border-primary bg-primary/10 text-primary"
      : "border-charcoal-200 text-charcoal-600 hover:border-charcoal-400"
  }`;
}

// Dégradé signalant qu'il reste du contenu à faire défiler plus bas — se
// masque de lui-même une fois le bas de la liste atteint.
function ScrollFade({ visible }: { visible: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-transparent transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}

// Suit le scroll d'un conteneur pour savoir s'il reste du contenu sous la
// zone visible (au-delà d'une petite tolérance de sous-pixel).
function useScrollFade<T extends HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  const update = useCallback(() => {
    const el = ref.current;
    if (!el) {
      setVisible(false);
      return;
    }
    setVisible(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
  }, []);
  return { ref, visible, update };
}

// ── Widgets du panneau de détails, un par type de champ ─────────────────────

function SegmentedField({ field, value, onChange, locale }: {
  field: AmenityDetailField; value: unknown; onChange: (v: unknown) => void; locale: string;
}) {
  const isEn = locale === "en";
  const options = field.options ?? [];
  const optionsEn = field.optionsEn ?? [];
  return (
    <div>
      <span className="block text-sm text-charcoal-700 mb-2">{isEn ? field.labelEn : field.label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((opt, i) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(value === opt ? undefined : opt)}
            className={pillCls(value === opt)}
          >
            {isEn ? optionsEn[i] ?? opt : opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function MultiSelectField({ field, value, onChange, locale }: {
  field: AmenityDetailField; value: unknown; onChange: (v: unknown) => void; locale: string;
}) {
  const isEn = locale === "en";
  const options = field.options ?? [];
  const optionsEn = field.optionsEn ?? [];
  const selectedVals = Array.isArray(value) ? (value as string[]) : [];
  return (
    <div>
      <span className="block text-sm text-charcoal-700 mb-2">{isEn ? field.labelEn : field.label}</span>
      <div className="space-y-2">
        {options.map((opt, i) => {
          const checked = selectedVals.includes(opt);
          return (
            <label key={opt} className="flex items-center gap-2.5 text-sm text-charcoal-700 cursor-pointer">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onChange(checked ? selectedVals.filter((v) => v !== opt) : [...selectedVals, opt])}
                className="w-4 h-4 rounded border-charcoal-300 text-primary focus:ring-primary"
              />
              {isEn ? optionsEn[i] ?? opt : opt}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function NumberField({ field, value, onChange, locale }: {
  field: AmenityDetailField; value: unknown; onChange: (v: unknown) => void; locale: string;
}) {
  const isEn = locale === "en";
  const num = typeof value === "number" ? value : 0;
  const max = field.max ?? 99;
  const atMax = num >= max;
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-charcoal-700">{isEn ? field.labelEn : field.label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, num - 1))}
          disabled={num <= 0}
          className="w-8 h-8 rounded-full border-2 border-charcoal-200 text-charcoal-600 flex items-center justify-center transition-colors disabled:opacity-30 hover:border-charcoal-400"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
          </svg>
        </button>
        <span className="w-6 text-center text-sm font-medium text-charcoal-800 tabular-nums">{num}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, num + 1))}
          disabled={atMax}
          className="w-8 h-8 rounded-full border-2 border-charcoal-200 text-charcoal-600 flex items-center justify-center transition-colors disabled:opacity-30 hover:border-charcoal-400"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function ToggleField({ field, value, onChange, locale }: {
  field: AmenityDetailField; value: unknown; onChange: (v: unknown) => void; locale: string;
}) {
  const isEn = locale === "en";
  const checked = value === true;
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-charcoal-700">{isEn ? field.labelEn : field.label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${checked ? "bg-primary" : "bg-charcoal-200"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}

// Pas au quart d'heure : trop précis pour des horaires d'équipement (piscine,
// spa...) — inspiré du sélecteur d'heure de Google Agenda.
const HOUR_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

function TimeSelect({ value, onChange, placeholder }: {
  value?: string; onChange: (v: string) => void; placeholder: string;
}) {
  // Une valeur déjà enregistrée hors du pas de 30 min (ex. 09:15) reste
  // sélectionnable et s'affiche telle quelle, sans être écrasée.
  const options = value && !HOUR_OPTIONS.includes(value) ? [...HOUR_OPTIONS, value].sort() : HOUR_OPTIONS;
  return (
    <div className="relative">
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={`${fieldInputCls} appearance-none pr-8 bg-white cursor-pointer`}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
        <svg className="w-3.5 h-3.5 text-charcoal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

function HoursField({ field, value, onChange, locale }: {
  field: AmenityDetailField; value: unknown; onChange: (v: unknown) => void; locale: string;
}) {
  const isEn = locale === "en";
  const v = (value && typeof value === "object" ? value : {}) as HoursValue;
  const open24 = v.open24 === true;
  return (
    <div>
      <span className="block text-sm text-charcoal-700 mb-2">{isEn ? field.labelEn : field.label}</span>
      <label className="flex items-center gap-2.5 text-sm text-charcoal-600 mb-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={open24}
          onChange={(e) => onChange({ ...v, open24: e.target.checked })}
          className="w-4 h-4 rounded border-charcoal-300 text-primary focus:ring-primary"
        />
        {isEn ? "Open 24/7" : "Ouvert 24h/24"}
      </label>
      {!open24 && (
        <div className="flex items-center gap-2">
          <TimeSelect
            value={v.start}
            onChange={(val) => onChange({ ...v, open24: false, start: val })}
            placeholder={isEn ? "Start" : "Début"}
          />
          <span className="text-sm text-charcoal-400">{isEn ? "to" : "à"}</span>
          <TimeSelect
            value={v.end}
            onChange={(val) => onChange({ ...v, open24: false, end: val })}
            placeholder={isEn ? "End" : "Fin"}
          />
        </div>
      )}
    </div>
  );
}

// ── Panneau de détails (modale) ──────────────────────────────────────────────

function AmenityDetailsModal({
  entry,
  initialDetails,
  locale,
  onSave,
  onClose,
}: {
  entry: AmenityCatalogEntry;
  initialDetails: Record<string, unknown>;
  locale: string;
  onSave: (details: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const isEn = locale === "en";
  const [details, setDetails] = useState<Record<string, unknown>>(initialDetails);
  const schema = entry.detailSchema ?? [];

  const setField = (key: string, value: unknown) => setDetails((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    // Ne garde que les champs réellement renseignés (0 / false / vide restent
    // l'état par défaut du widget, pas une valeur voulue) — évite un résumé
    // du type "0" ou "Ouvert 24h/24: non" dans la colonne gauche.
    const cleaned: Record<string, unknown> = {};
    for (const field of schema) {
      const v = details[field.key];
      if (field.type === "boolean" && v === true) cleaned[field.key] = true;
      else if (field.type === "number" && typeof v === "number" && v > 0) cleaned[field.key] = v;
      else if (field.type === "single-select" && typeof v === "string" && v) cleaned[field.key] = v;
      else if (field.type === "multi-select" && Array.isArray(v) && v.length > 0) cleaned[field.key] = v;
      else if (field.type === "hours" && v && typeof v === "object") {
        const hv = v as HoursValue;
        if (hv.open24) cleaned[field.key] = { open24: true };
        else if (hv.start || hv.end) cleaned[field.key] = { open24: false, start: hv.start, end: hv.end };
      }
    }
    onSave(cleaned);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#ebebeb] shrink-0">
          <h3 className="text-base font-bold text-charcoal-800">{isEn ? entry.labelEn : entry.label}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-charcoal-50 transition-colors text-charcoal-400"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {schema.map((field) => {
            const value = details[field.key];
            const onChange = (v: unknown) => setField(field.key, v);
            if (field.type === "boolean") return <ToggleField key={field.key} field={field} value={value} onChange={onChange} locale={locale} />;
            if (field.type === "number") return <NumberField key={field.key} field={field} value={value} onChange={onChange} locale={locale} />;
            if (field.type === "hours") return <HoursField key={field.key} field={field} value={value} onChange={onChange} locale={locale} />;
            if (field.type === "multi-select") return <MultiSelectField key={field.key} field={field} value={value} onChange={onChange} locale={locale} />;
            return <SegmentedField key={field.key} field={field} value={value} onChange={onChange} locale={locale} />;
          })}
        </div>

        <div className="shrink-0 border-t border-[#ebebeb] px-5 py-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-charcoal-500 hover:text-charcoal-800 transition-colors px-4 py-2.5"
          >
            {isEn ? "Cancel" : "Annuler"}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="bg-primary text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            {isEn ? "Save" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Ligne d'un équipement déjà ajouté ────────────────────────────────────────

function AddedAmenityRow({
  value,
  entry,
  locale,
  onRemove,
  onEdit,
}: {
  value: AmenityValue;
  entry: AmenityCatalogEntry;
  locale: string;
  onRemove: () => void;
  onEdit: () => void;
}) {
  const isEn = locale === "en";
  const label = isEn ? entry.labelEn : entry.label;
  const summary = summarizeAmenityDetails(entry, value.details, locale);
  const hasDetails = !!entry.detailSchema && entry.detailSchema.length > 0;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 border border-[#ebebeb] rounded-xl">
      <span className="shrink-0 text-primary">
        <AmenityIcon name={entry.icon} />
      </span>
      {hasDetails ? (
        <button type="button" onClick={onEdit} className="flex-1 min-w-0 text-left cursor-pointer">
          <p className="text-sm font-medium text-charcoal-800 truncate">{label}</p>
          {summary && <p className="text-xs text-charcoal-400 truncate">{summary}</p>}
        </button>
      ) : (
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-charcoal-800 truncate">{label}</p>
        </div>
      )}
      {hasDetails && (
        <button
          type="button"
          onClick={onEdit}
          title={isEn ? "Edit details" : "Modifier les détails"}
          className="shrink-0 text-charcoal-300 hover:text-charcoal-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}
      <button
        type="button"
        onClick={onRemove}
        title={isEn ? "Remove" : "Retirer"}
        className="shrink-0 text-charcoal-300 hover:text-charcoal-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ── Composant principal ──────────────────────────────────────────────────────

type Editing = { type: "new"; id: string } | { type: "edit"; index: number };

export default function AmenitiesPicker({
  selected,
  onChange,
}: {
  selected: AmenityValue[];
  onChange: (amenities: AmenityValue[]) => void;
}) {
  const locale = useLocale();
  const isEn = locale === "en";
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);

  const selectedIds = new Set(selected.map((a) => a.id));

  const addAmenity = (id: string) => onChange([...selected, { id, details: {} }]);
  // Retire toutes les entrées de cet id — utilisé par le bouton coché de la
  // colonne droite (toggle global d'un équipement du catalogue).
  const removeAllOfId = (id: string) => onChange(selected.filter((a) => a.id !== id));
  // Un même id peut apparaître plusieurs fois dans `selected` (ex. une
  // piscine intérieure ET extérieure, avec des détails différents) — la
  // ligne de la colonne gauche doit donc cibler son propre index, jamais
  // toutes les entrées partageant cet id.
  const removeAmenityAt = (index: number) => onChange(selected.filter((_, i) => i !== index));

  const handleToggle = (entry: AmenityCatalogEntry) => {
    if (selectedIds.has(entry.id)) {
      removeAllOfId(entry.id);
      return;
    }
    if (entry.detailSchema && entry.detailSchema.length > 0) {
      setEditing({ type: "new", id: entry.id });
      return;
    }
    addAmenity(entry.id);
  };

  const handleSaveDetails = (details: Record<string, unknown>) => {
    if (!editing) return;
    if (editing.type === "new") onChange([...selected, { id: editing.id, details }]);
    else onChange(selected.map((a, i) => (i === editing.index ? { ...a, details } : a)));
  };

  const normalizedSearch = normalizeForSearch(search.trim());
  const filteredCatalog = useMemo(() => {
    return AMENITY_CATALOG.filter((entry) => {
      if (activeCategory && entry.categoryId !== activeCategory) return false;
      if (!normalizedSearch) return true;
      const label = isEn ? entry.labelEn : entry.label;
      return normalizeForSearch(label).includes(normalizedSearch);
    });
  }, [activeCategory, normalizedSearch, isEn]);

  const activeCategoryLabel = activeCategory
    ? (isEn
        ? AMENITY_CATEGORIES.find((c) => c.id === activeCategory)?.labelEn
        : AMENITY_CATEGORIES.find((c) => c.id === activeCategory)?.label) ?? null
    : null;
  const availableCountLabel = activeCategoryLabel
    ? isEn
      ? `${filteredCatalog.length} amenit${filteredCatalog.length === 1 ? "y" : "ies"} available in ${activeCategoryLabel}`
      : `${filteredCatalog.length} équipement${filteredCatalog.length === 1 ? "" : "s"} disponible${filteredCatalog.length === 1 ? "" : "s"} dans ${activeCategoryLabel}`
    : isEn
    ? `${filteredCatalog.length} amenit${filteredCatalog.length === 1 ? "y" : "ies"}`
    : `${filteredCatalog.length} équipement${filteredCatalog.length === 1 ? "" : "s"}`;

  // Fondu de défilement — colonne gauche (équipements ajoutés) et colonne
  // droite (catalogue filtré), chacune avec son propre conteneur scrollable.
  const { ref: addedListRef, visible: addedFadeVisible, update: updateAddedFade } = useScrollFade<HTMLDivElement>();
  const { ref: catalogListRef, visible: catalogFadeVisible, update: updateCatalogFade } = useScrollFade<HTMLDivElement>();

  useEffect(() => {
    updateAddedFade();
  }, [selected, updateAddedFade]);

  // Remet le scroll en haut à chaque changement de filtre (catégorie ou
  // recherche) avant de recalculer le fondu sur la nouvelle liste.
  useEffect(() => {
    if (catalogListRef.current) catalogListRef.current.scrollTop = 0;
    updateCatalogFade();
  }, [filteredCatalog, updateCatalogFade]);

  const editingEntry =
    editing?.type === "new"
      ? getAmenityCatalogEntry(editing.id)
      : editing?.type === "edit"
      ? getAmenityCatalogEntry(selected[editing.index]?.id ?? "")
      : undefined;
  const editingInitialDetails =
    editing?.type === "edit" ? selected[editing.index]?.details ?? {} : {};

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <h4 className="text-sm font-semibold text-charcoal-800 mb-3">
          {isEn ? "Added amenities" : "Équipements ajoutés"}
        </h4>
        {selected.length === 0 ? (
          <p className="text-sm text-charcoal-400 border border-dashed border-charcoal-200 rounded-xl px-4 py-6 text-center">
            {isEn ? "No amenities added yet" : "Aucun équipement ajouté pour l'instant"}
          </p>
        ) : (
          <div className="relative">
            <div
              ref={addedListRef}
              onScroll={updateAddedFade}
              className="space-y-2 max-h-[28rem] overflow-y-auto pr-1"
            >
              {selected.map((value, index) => {
                const entry = getAmenityCatalogEntry(value.id);
                if (!entry) return null;
                return (
                  <AddedAmenityRow
                    key={`${value.id}-${index}`}
                    value={value}
                    entry={entry}
                    locale={locale}
                    onRemove={() => removeAmenityAt(index)}
                    onEdit={() => setEditing({ type: "edit", index })}
                  />
                );
              })}
            </div>
            <ScrollFade visible={addedFadeVisible} />
          </div>
        )}
      </div>

      <div>
        <h4 className="text-sm font-semibold text-charcoal-800 mb-3">
          {isEn ? "Add amenities" : "Ajouter des équipements"}
        </h4>

        <div className="relative mb-3">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
          >
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isEn ? "Search an amenity" : "Rechercher un équipement"}
            className="w-full border border-[#ebebeb] rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          <button type="button" onClick={() => setActiveCategory(null)} className={pillCls(activeCategory === null)}>
            {isEn ? "All" : "Tous"}
          </button>
          {AMENITY_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={pillCls(activeCategory === cat.id)}
            >
              {isEn ? cat.labelEn : cat.label}
            </button>
          ))}
        </div>

        <p className="text-xs text-charcoal-400 mb-2">{availableCountLabel}</p>

        <div className="relative">
          <div
            ref={catalogListRef}
            onScroll={updateCatalogFade}
            className="space-y-1.5 max-h-[28rem] overflow-y-auto pr-1"
          >
            {filteredCatalog.length === 0 ? (
              <p className="text-sm text-charcoal-400 text-center py-6">
                {isEn ? "No amenities found" : "Aucun équipement trouvé"}
              </p>
            ) : (
              filteredCatalog.map((entry) => {
                const active = selectedIds.has(entry.id);
                return (
                  <div key={entry.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[#ebebeb]">
                    <span className="shrink-0 text-charcoal-500">
                      <AmenityIcon name={entry.icon} />
                    </span>
                    <span className="flex-1 text-sm text-charcoal-700 truncate">
                      {isEn ? entry.labelEn : entry.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggle(entry)}
                      title={active ? (isEn ? "Remove" : "Retirer") : isEn ? "Add" : "Ajouter"}
                      className={`shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${
                        active
                          ? "bg-primary border-primary text-white"
                          : "border-charcoal-300 text-charcoal-500 hover:border-primary hover:text-primary"
                      }`}
                    >
                      {active ? (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
          <ScrollFade visible={catalogFadeVisible} />
        </div>
      </div>

      {editing && editingEntry && (
        <AmenityDetailsModal
          entry={editingEntry}
          initialDetails={editingInitialDetails}
          locale={locale}
          onSave={handleSaveDetails}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
