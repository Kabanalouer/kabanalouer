"use client";

import type { MouseEvent } from "react";
import type { DestItem, SearchForm } from "./useSearchForm";

// Contenu des suggestions de destination (recherches récentes, régions
// populaires, autocomplétion), partagé entre le menu déroulant de la barre
// en ligne et la feuille plein écran des téléphones.

const ClockIcon = () => (
  <svg className="w-4 h-4 text-charcoal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const PinIcon = () => (
  <svg className="w-4 h-4 text-charcoal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const MapIcon = () => (
  <svg className="w-4 h-4 text-charcoal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
);

export default function DestinationList({
  form,
  onPick,
  variant,
}: {
  form: SearchForm;
  onPick: (item: DestItem) => void;
  // popover : sélection au mousedown (le champ garde le focus) ;
  // sheet : sélection au clic, lignes d'au moins 48px pour le doigt.
  variant: "popover" | "sheet";
}) {
  const { t, destQuery, recentSearches, popularRegions, suggestions, displayLabel } = form;
  const rowClass = variant === "sheet"
    ? "w-full flex items-center gap-3 px-4 min-h-[52px] py-2 hover:bg-charcoal-50 active:bg-charcoal-50 text-left transition-colors rounded-xl"
    : "w-full flex items-center gap-3 px-4 py-2.5 hover:bg-charcoal-50 text-left transition-colors";
  const pickProps = (item: DestItem) => variant === "sheet"
    ? { type: "button" as const, onClick: () => onPick(item) }
    : { type: "button" as const, onMouseDown: (e: MouseEvent) => { e.preventDefault(); onPick(item); } };
  const heading = (label: string) => (
    <div className="px-4 pt-3 pb-1">
      <p className="text-xs font-semibold text-charcoal-400 uppercase tracking-wide">{label}</p>
    </div>
  );
  const textClass = variant === "sheet" ? "text-base text-charcoal-800" : "text-sm text-charcoal-800";

  if (!destQuery.trim()) {
    if (recentSearches.length > 0) {
      return (
        <>
          {heading(t("recentSearches"))}
          {recentSearches.map((item, i) => (
            <button key={i} {...pickProps(item)} className={rowClass}>
              <ClockIcon />
              <div className="min-w-0">
                <p className={`${textClass} truncate`}>{displayLabel(item)}</p>
                <p className="text-xs text-charcoal-400">{item.type === "region" ? t("typeRegion") : t("typeCity")}</p>
              </div>
            </button>
          ))}
        </>
      );
    }
    return (
      <>
        {heading(t("popularRegions"))}
        {popularRegions.map((item) => (
          <button key={item.value} {...pickProps(item)} className={rowClass}>
            <PinIcon />
            <span className={textClass}>{item.label}</span>
          </button>
        ))}
      </>
    );
  }

  if (suggestions.length === 0) {
    return <div className="px-4 py-5 text-center text-sm text-charcoal-400">{t("noDestination")}</div>;
  }

  const regions = suggestions.filter((s) => s.type === "region");
  const cities = suggestions.filter((s) => s.type === "city");
  return (
    <>
      {regions.length > 0 && (
        <>
          {heading(t("regionsGroup"))}
          {regions.map((item) => (
            <button key={item.value} {...pickProps(item)} className={rowClass}>
              <MapIcon />
              <span className={textClass}>{item.label}</span>
            </button>
          ))}
        </>
      )}
      {cities.length > 0 && (
        <>
          {heading(t("citiesGroup"))}
          {cities.map((item) => (
            <button key={item.value} {...pickProps(item)} className={rowClass}>
              <PinIcon />
              <span className={textClass}>{item.label}</span>
            </button>
          ))}
        </>
      )}
    </>
  );
}
