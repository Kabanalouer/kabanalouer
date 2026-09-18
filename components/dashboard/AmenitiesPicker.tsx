"use client";

import { useMemo, useState } from "react";
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

function normalizeForSearch(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const fieldInputCls =
  "w-full border border-[#ebebeb] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition";

function pillCls(active: boolean) {
  return `px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
    active
      ? "border-primary bg-primary/10 text-primary"
      : "border-charcoal-200 text-charcoal-600 hover:border-charcoal-400"
  }`;
}

function DetailFieldEditor({
  field,
  value,
  onChange,
  locale,
}: {
  field: AmenityDetailField;
  value: unknown;
  onChange: (value: unknown) => void;
  locale: string;
}) {
  const isEn = locale === "en";
  const label = isEn ? field.labelEn : field.label;

  if (field.type === "boolean") {
    return (
      <label className="flex items-center gap-2 text-sm text-charcoal-700 cursor-pointer">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 rounded border-charcoal-300 text-primary focus:ring-primary"
        />
        {label}
      </label>
    );
  }

  if (field.type === "number") {
    return (
      <label className="block">
        <span className="block text-xs text-charcoal-500 mb-1">{label}</span>
        <input
          type="number"
          min={0}
          value={typeof value === "number" ? value : ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          placeholder={isEn ? field.placeholderEn : field.placeholder}
          className={`${fieldInputCls} max-w-[8rem]`}
        />
      </label>
    );
  }

  if (field.type === "hours") {
    return (
      <label className="block">
        <span className="block text-xs text-charcoal-500 mb-1">{label}</span>
        <input
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={isEn ? "E.g. 9am-9pm" : "Ex. 9h à 21h"}
          className={fieldInputCls}
        />
      </label>
    );
  }

  const options = field.options ?? [];
  const optionsEn = field.optionsEn ?? [];

  if (field.type === "single-select") {
    return (
      <div>
        <span className="block text-xs text-charcoal-500 mb-1.5">{label}</span>
        <div className="flex flex-wrap gap-1.5">
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

  const selected = Array.isArray(value) ? (value as string[]) : [];
  return (
    <div>
      <span className="block text-xs text-charcoal-500 mb-1.5">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt, i) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(active ? selected.filter((v) => v !== opt) : [...selected, opt])}
              className={pillCls(active)}
            >
              {isEn ? optionsEn[i] ?? opt : opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AddedAmenityRow({
  value,
  entry,
  locale,
  onRemove,
  onDetailsChange,
}: {
  value: AmenityValue;
  entry: AmenityCatalogEntry;
  locale: string;
  onRemove: () => void;
  onDetailsChange: (details: Record<string, unknown>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isEn = locale === "en";
  const label = isEn ? entry.labelEn : entry.label;
  const summary = summarizeAmenityDetails(entry, value.details, locale);
  const hasDetails = !!entry.detailSchema && entry.detailSchema.length > 0;

  const setField = (key: string, fieldValue: unknown) => {
    const next = { ...(value.details ?? {}) };
    if (fieldValue === undefined) delete next[key];
    else next[key] = fieldValue;
    onDetailsChange(next);
  };

  return (
    <div className="border border-[#ebebeb] rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <span className="shrink-0 text-primary">
          <AmenityIcon name={entry.icon} />
        </span>
        <button
          type="button"
          onClick={() => hasDetails && setExpanded((v) => !v)}
          className={`flex-1 min-w-0 text-left ${hasDetails ? "cursor-pointer" : "cursor-default"}`}
        >
          <p className="text-sm font-medium text-charcoal-800 truncate">{label}</p>
          {summary && <p className="text-xs text-charcoal-400 truncate">{summary}</p>}
        </button>
        {hasDetails && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 text-charcoal-300 hover:text-charcoal-600 transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.75}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
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
      {hasDetails && expanded && (
        <div className="px-3 pb-3 pt-1 space-y-3 border-t border-[#ebebeb] bg-charcoal-50">
          {entry.detailSchema!.map((field) => (
            <DetailFieldEditor
              key={field.key}
              field={field}
              value={value.details?.[field.key]}
              onChange={(v) => setField(field.key, v)}
              locale={locale}
            />
          ))}
        </div>
      )}
    </div>
  );
}

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

  const selectedIds = new Set(selected.map((a) => a.id));

  const addAmenity = (id: string) => onChange([...selected, { id, details: {} }]);
  const removeAmenity = (id: string) => onChange(selected.filter((a) => a.id !== id));
  const updateDetails = (id: string, details: Record<string, unknown>) =>
    onChange(selected.map((a) => (a.id === id ? { ...a, details } : a)));

  const normalizedSearch = normalizeForSearch(search.trim());
  const filteredCatalog = useMemo(() => {
    return AMENITY_CATALOG.filter((entry) => {
      if (activeCategory && entry.categoryId !== activeCategory) return false;
      if (!normalizedSearch) return true;
      const label = isEn ? entry.labelEn : entry.label;
      return normalizeForSearch(label).includes(normalizedSearch);
    });
  }, [activeCategory, normalizedSearch, isEn]);

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
          <div className="space-y-2">
            {selected.map((value) => {
              const entry = getAmenityCatalogEntry(value.id);
              if (!entry) return null;
              return (
                <AddedAmenityRow
                  key={value.id}
                  value={value}
                  entry={entry}
                  locale={locale}
                  onRemove={() => removeAmenity(value.id)}
                  onDetailsChange={(details) => updateDetails(value.id, details)}
                />
              );
            })}
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

        <div className="space-y-1.5 max-h-[28rem] overflow-y-auto pr-1">
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
                    onClick={() => (active ? removeAmenity(entry.id) : addAmenity(entry.id))}
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
      </div>
    </div>
  );
}
