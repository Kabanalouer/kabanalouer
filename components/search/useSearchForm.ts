"use client";

import { useState, useEffect, useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { localePath } from "@/lib/localePath";
import { DOGS_MAX_LIMIT } from "@/lib/dogPolicy";
import { REGIONS } from "@/lib/regions";
import { loadMunicipalities } from "@/lib/loadMunicipalities";
import type { Municipality } from "@/lib/municipalities";
import { rankDestinations, resolveDestination, type DestCandidate, type DestItem } from "@/lib/destinationSearch";

// État et logique de la barre de recherche (destination, dates, voyageurs,
// URL de recherche), partagés entre la barre en ligne (SearchBar.tsx, tablette
// et ordinateur) et la feuille plein écran des téléphones (MobileSearchSheet).

// Dérivée de REGIONS (lib/regions.ts) : toujours synchro avec les pages
// région/sitemap/meta tags.
const REGION_NAMES = REGIONS.map((r) => r.dbValue);
// dbValue -> slug URL, pour le raccourci vers la page région SEO existante.
const REGION_SLUG_BY_NAME = new Map(REGIONS.map((r) => [r.dbValue, r.slug]));
const REGION_EN_SLUG_BY_NAME = new Map(REGIONS.map((r) => [r.dbValue, r.slugEn]));
const REGION_EN_NAME_BY_NAME = new Map(REGIONS.map((r) => [r.dbValue, r.nameEn]));

export type { DestItem };

const RECENT_KEY = "kbl_recent_dest";

// Recherches récentes (localStorage), lues via useSyncExternalStore : liste
// vide au rendu serveur et à l'hydratation, puis la vraie liste côté client.
const NO_RECENT: DestItem[] = [];
let recentRaw: string | null = null;
let recentCache: DestItem[] = NO_RECENT;
const recentListeners = new Set<() => void>();

function getRecentSnapshot(): DestItem[] {
  let raw: string | null = null;
  try { raw = localStorage.getItem(RECENT_KEY); } catch { /* noop */ }
  if (raw !== recentRaw) {
    recentRaw = raw;
    try { recentCache = JSON.parse(raw ?? "[]"); } catch { recentCache = NO_RECENT; }
  }
  return recentCache;
}

function subscribeRecent(onChange: () => void) {
  recentListeners.add(onChange);
  return () => { recentListeners.delete(onChange); };
}

function saveRecent(item: DestItem) {
  try {
    const prev = getRecentSnapshot().filter((r) => !(r.type === item.type && r.value === item.value));
    localStorage.setItem(RECENT_KEY, JSON.stringify([item, ...prev].slice(0, 5)));
  } catch { /* noop */ }
  recentListeners.forEach((l) => l());
}

export function formatShortDate(iso: string, intlLocale: string): string {
  const [year, m, d] = iso.split("-").map(Number);
  return new Date(year, m - 1, d).toLocaleDateString(intlLocale, { day: "numeric", month: "short" });
}

export interface GuestRow {
  key: "adults" | "children" | "babies" | "pets";
  label: string;
  sub: string;
  val: number;
  onDecr: () => void;
  onIncr: () => void;
  decrDis: boolean;
  incrDis: boolean;
}

export interface SearchFormInit {
  initialRegion?: string;
  initialCity?: string;
  initialCheckin?: string;
  initialCheckout?: string;
  initialAdults?: number;
  initialChildren?: number;
  initialBabies?: number;
  initialPets?: number;
  preserveParams?: Record<string, string>;
}

export function useSearchForm({
  initialRegion,
  initialCity,
  initialCheckin,
  initialCheckout,
  initialAdults,
  initialChildren,
  initialBabies,
  initialPets,
  preserveParams,
}: SearchFormInit) {
  const t = useTranslations("searchBar");
  const locale = useLocale();
  const intlLocale = locale === "en" ? "en-CA" : "fr-CA";
  const router = useRouter();

  // Nom affiché de la région (nameEn en anglais) — la valeur envoyée dans
  // la requête reste toujours le dbValue français.
  const regionLabel = (dbValue: string) => locale === "en" ? REGION_EN_NAME_BY_NAME.get(dbValue) ?? dbValue : dbValue;
  const displayLabel = (item: DestItem) => item.type === "region" ? regionLabel(item.value) : item.label;

  const initDest: DestItem | null = initialRegion
    ? { label: regionLabel(initialRegion), type: "region", value: initialRegion }
    : initialCity
    ? { label: initialCity, type: "city", value: initialCity }
    : null;

  // ── Destination ──
  const [destQuery, setDestQuery] = useState(initDest?.label ?? "");
  const [destSelected, setDestSelected] = useState<DestItem | null>(initDest);
  const [cities, setCities] = useState<string[]>([]);
  // Liste officielle des municipalités (~200 Ko) : chargée dès la première
  // saisie d'une destination, jamais au chargement de la page.
  const [municipalities, setMunicipalities] = useState<Municipality[] | null>(null);
  useEffect(() => {
    if (destQuery.trim() && !municipalities) loadMunicipalities().then(setMunicipalities).catch(() => {});
  }, [destQuery, municipalities]);
  const recentSearches = useSyncExternalStore(subscribeRecent, getRecentSnapshot, () => NO_RECENT);

  // ── Dates ──
  const [checkin, setCheckin] = useState(initialCheckin ?? "");
  const [checkout, setCheckout] = useState(initialCheckout ?? "");

  // ── Voyageurs ──
  const [adults, setAdults] = useState(initialAdults ?? 0);
  const [children, setChildren] = useState(initialChildren ?? 0);
  const [babies, setBabies] = useState(initialBabies ?? 0);
  const [pets, setPets] = useState(initialPets ?? 0);

  // Villes avec au moins une annonce publiée (pas la source des suggestions
  // — voir municipalities ci-dessus — seulement pour savoir si
  // /chalets/[région]/[ville] existe pour une municipalité donnée au moment
  // de rechercher, voir search()).
  useEffect(() => {
    fetch("/api/listings/locations")
      .then((r) => r.json())
      .then((d) => setCities(d.cities ?? []))
      .catch(() => {});
  }, []);

  // Correspondance tolérante (accents, tirets, « st » = « saint », fautes de
  // frappe) : voir lib/destinationSearch.ts.
  const regionCandidates = useMemo<DestCandidate[]>(
    () => REGIONS.map((r) => ({ item: { label: regionLabel(r.dbValue), type: "region", value: r.dbValue }, names: [r.dbValue, r.nameEn] })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale]
  );
  const toCityCandidates = (list: Municipality[]): DestCandidate[] =>
    list.map((m) => ({ item: { label: m.name, type: "city", value: m.name }, names: [m.name] }));
  const cityCandidates = useMemo(() => toCityCandidates(municipalities ?? []), [municipalities]);
  const ranked = useMemo(
    () => rankDestinations(destQuery, regionCandidates, cityCandidates),
    [destQuery, regionCandidates, cityCandidates]
  );
  const suggestions = ranked.items;
  const suggestionsFuzzy = ranked.fuzzy;

  // Erreur affichée quand on lance la recherche sur une saisie qui ne
  // correspond à aucune destination connue (la recherche ne part pas).
  const [destError, setDestError] = useState(false);
  // Suggestion surlignée (flèches du clavier ; Entrée la choisit).
  const [highlight, setHighlight] = useState(0);
  const moveHighlight = (delta: number) =>
    setHighlight((h) => (suggestions.length ? (h + delta + suggestions.length) % suggestions.length : 0));

  // Régions populaires pour l'état sans saisie (aucune recherche récente)
  const popularRegions: DestItem[] = REGION_NAMES.slice(0, 5).map((r) => ({ label: regionLabel(r), type: "region", value: r }));

  const selectDest = (item: DestItem) => {
    setDestSelected(item);
    setDestQuery(displayLabel(item));
    setDestError(false);
    saveRecent(item);
  };

  const typeDest = (q: string) => {
    setDestQuery(q);
    setDestSelected(null);
    setDestError(false);
    setHighlight(0);
  };

  // Entrée dans le champ : choisit la suggestion surlignée. Retourne l'élément
  // choisi (ou null s'il n'y avait aucune suggestion).
  const pickHighlighted = (): DestItem | null => {
    const item = suggestions[highlight] ?? suggestions[0];
    if (!item) return null;
    selectDest(item);
    return item;
  };

  const clearDest = () => {
    setDestSelected(null);
    setDestQuery("");
    setDestError(false);
  };

  // Retourne vrai quand la plage est complète (départ choisi).
  const pickDay = (ds: string): boolean => {
    if (!checkin || (checkin && checkout)) { setCheckin(ds); setCheckout(""); return false; }
    if (ds > checkin) { setCheckout(ds); return true; }
    setCheckin(ds); setCheckout("");
    return false;
  };
  const clearDates = () => { setCheckin(""); setCheckout(""); };

  const clearGuests = () => { setAdults(0); setChildren(0); setBabies(0); setPets(0); };
  const clearAll = () => { clearDest(); clearDates(); clearGuests(); };

  const guestTotal = adults + children + babies;
  const datesLabel = checkin
    ? `${formatShortDate(checkin, intlLocale)} → ${checkout ? formatShortDate(checkout, intlLocale) : t("departurePlaceholder")}`
    : null;
  const guestsLabel = guestTotal > 0 ? t("guestsCount", { count: guestTotal }) : null;

  const guestRows: GuestRow[] = [
    { key: "adults", label: t("adults"), sub: t("adultsSub"), val: adults,
      onDecr: () => setAdults((v) => Math.max(0, v - 1)),
      onIncr: () => setAdults((v) => v + 1),
      decrDis: adults === 0 || (adults === 1 && children + babies > 0),
      incrDis: guestTotal >= 40 },
    { key: "children", label: t("children"), sub: t("childrenSub"), val: children,
      onDecr: () => setChildren((v) => Math.max(0, v - 1)),
      onIncr: () => { setChildren((v) => v + 1); if (adults === 0) setAdults(1); },
      decrDis: children === 0,
      incrDis: adults === 0 ? guestTotal >= 39 : guestTotal >= 40 },
    { key: "babies", label: t("babies"), sub: t("babiesSub"), val: babies,
      onDecr: () => setBabies((v) => Math.max(0, v - 1)),
      onIncr: () => { setBabies((v) => v + 1); if (adults === 0) setAdults(1); },
      decrDis: babies === 0,
      incrDis: adults === 0 ? guestTotal >= 39 : guestTotal >= 40 },
    { key: "pets", label: t("pets"), sub: t("petsSub"), val: pets,
      onDecr: () => setPets((v) => Math.max(0, v - 1)),
      onIncr: () => setPets((v) => v + 1),
      decrDis: pets === 0, incrDis: pets >= DOGS_MAX_LIMIT },
  ];

  // Retourne false quand la recherche est bloquée (destination inconnue) :
  // l'appelant rouvre alors la liste des destinations.
  const search = async (): Promise<boolean> => {
    // Destination tapée sans clic sur une suggestion : correspondance exacte ou
    // sans ambiguïté seulement ; sinon on bloque au lieu de chercher un lieu inconnu.
    let active: DestItem | null = destSelected;
    if (!active && destQuery.trim()) {
      const list = municipalities ?? (await loadMunicipalities().catch(() => [] as Municipality[]));
      active = resolveDestination(rankDestinations(destQuery, regionCandidates, toCityCandidates(list)));
      if (!active) {
        setDestError(true);
        return false;
      }
      selectDest(active);
    }

    const noFilters = !checkin && !checkout && adults === 0 && children === 0 && babies === 0 && pets === 0;
    const isEn = locale === "en";

    // Région seule (ni dates ni voyageurs) → page SEO de la région
    if (active?.type === "region" && noFilters) {
      const slug = isEn ? REGION_EN_SLUG_BY_NAME.get(active.value) : REGION_SLUG_BY_NAME.get(active.value);
      if (slug) {
        router.push(isEn ? `/en/cabins/${slug}` : `/chalets/${slug}`);
        return true;
      }
    }

    // Ville seule reconnue dans la liste officielle → sa page SEO dédiée
    // (région-scopée, /chalets/[région]/[ville]) si elle a des annonces
    // publiées (sinon 404), sinon la page de sa région parente.
    if (active?.type === "city" && noFilters) {
      const list = municipalities ?? (await loadMunicipalities().catch(() => []));
      const municipality = list.find((m) => m.name === active.value);
      if (municipality) {
        const regionSlug = isEn ? REGION_EN_SLUG_BY_NAME.get(municipality.region) : REGION_SLUG_BY_NAME.get(municipality.region);
        if (regionSlug) {
          if (cities.includes(municipality.name)) {
            router.push(isEn ? `/en/cabins/${regionSlug}/${municipality.slug}` : `/chalets/${regionSlug}/${municipality.slug}`);
          } else {
            router.push(isEn ? `/en/cabins/${regionSlug}` : `/chalets/${regionSlug}`);
          }
          return true;
        }
      }
    }

    const params = new URLSearchParams();
    if (active) {
      if (active.type === "region") params.set("region", active.value);
      else params.set("city", active.value);
    }
    if (checkin) params.set("checkin", checkin);
    if (checkout) params.set("checkout", checkout);
    const totalCapacity = adults + children + babies;
    if (totalCapacity > 0) params.set("capacity", String(totalCapacity));
    if (pets > 0) params.set("dogs", String(pets));
    if (preserveParams) {
      for (const [k, v] of Object.entries(preserveParams)) {
        if (v) params.set(k, v);
      }
    }
    router.push(localePath(`/chalets${params.toString() ? `?${params.toString()}` : ""}`, locale));
    return true;
  };

  return {
    t, locale, intlLocale,
    displayLabel,
    destQuery, destSelected, typeDest, selectDest, clearDest,
    destError, highlight, moveHighlight, pickHighlighted,
    recentSearches, suggestions, suggestionsFuzzy, popularRegions,
    checkin, checkout, pickDay, clearDates,
    guestRows, guestTotal, pets, clearGuests,
    datesLabel, guestsLabel,
    clearAll, search,
  };
}

export type SearchForm = ReturnType<typeof useSearchForm>;
