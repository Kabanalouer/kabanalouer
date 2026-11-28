import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ListingCard, { type Listing } from "@/components/ListingCard";
import OwnersSlimBanner from "@/components/chalets/OwnersSlimBanner";
import { fr, frInt } from "@/lib/frTypography";
import PawIcon from "@/components/PawIcon";
import { dogPolicyShortSummary } from "@/lib/dogPolicy";
import { getRegionBySlug } from "@/lib/regions";
import { safeJsonLd } from "@/lib/jsonLd";
import { SITE_URL } from "@/lib/siteUrl";
import { buildListingPath } from "@/lib/listingUrl";
import { slugify } from "@/lib/slugify";
import { getRegionByDbValue } from "@/lib/regions";
import { comboLinkLabel, comboPath, activeThemesInCity, activeThemesInRegion, getComboIndex, COMBO_THEMES, MIN_LISTINGS_FOR_COMBO } from "@/lib/comboLandings";
import { CONCENTRATION_MIN_LISTINGS, EV_REMOTE_REGIONS, CONCENTRATION_SHARE, MIN_LISTINGS_CHIP, THEME_FILTERS, pickDiverse, themeBadge as badgeOf, yearRoundKnownEnough, type ThemeRow } from "@/lib/themeStats";
import { themePath, placeOf, type ThemeScope } from "@/lib/themeRouting";
import { TO_PROVIDE, type ThemeFaqItem } from "@/content/themes/types";
import { getRegionContent } from "@/content/regions";

// Gabarit unique des pages thème (national, thème × région, thème × ville) : /chalets/bord-de-l-eau…
// Tout le contenu est rendu côté serveur. Seules les 24 fiches affichées sont chargées dans la page.

const WRAP = "mx-auto w-full max-w-[1360px] px-[clamp(16px,4vw,56px)]";
const HOME_DISTANCE_KM = { lat: 45.5017, lng: -73.5673 }; // Montréal
const CHIP = "flex-none whitespace-nowrap rounded-[var(--radius-pill)] px-4 py-[9px] min-h-11 sm:min-h-10 inline-flex items-center text-sm font-semibold transition-colors";
const CHIP_IDLE = "border border-[var(--border-2)] bg-white text-[var(--fg-1)] hover:border-charcoal-400";
const CHIP_ACTIVE = "border border-[var(--fg-1)] bg-[var(--fg-1)] text-white";

const money = (n: number) => `${frInt(n)} $`;
// « des Laurentides » → « les Laurentides » ; « de la région de Québec » → « la région de Québec » ; « de Lanaudière » → « Lanaudière »
const withArticle = (genitive: string) =>
  genitive.replace(/^des /, "les ").replace(/^de la /, "la ").replace(/^du /, "le ").replace(/^de l'/, "l'").replace(/^d'/, "").replace(/^de /, "");
const upperFirst = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const joinFr = (items: string[]) => (items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`);

function distanceKm(lat: number, lng: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat - HOME_DISTANCE_KM.lat) * rad;
  const dLng = (lng - HOME_DISTANCE_KM.lng) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(HOME_DISTANCE_KM.lat * rad) * Math.cos(lat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

// Les 3 villes (au moins 3 fiches) les plus proches de Montréal : centre de la ville = moyenne des coordonnées de ses fiches
function citiesNearMontreal(scope: ThemeScope): string[] {
  const out: { city: string; km: number }[] = [];
  for (const c of scope.national.byCity) {
    const pts = scope.rows.filter((r) => r.region === c.region && r.city === c.city && r.lat !== null && r.lng !== null);
    if (pts.length === 0) continue;
    const lat = pts.reduce((s, r) => s + (r.lat as number), 0) / pts.length;
    const lng = pts.reduce((s, r) => s + (r.lng as number), 0) / pts.length;
    out.push({ city: c.city, km: distanceKm(lat, lng) });
  }
  return out.sort((a, b) => a.km - b.km).slice(0, 3).map((c) => c.city);
}

function toCardListing(r: ThemeRow): Listing {
  return {
    id: r.id,
    title: r.title,
    region: r.region,
    city: r.city,
    listing_number: r.listingNumber,
    custom_slug: r.customSlug,
    price: r.price,
    priceOnRequest: r.priceOnRequest,
    capacity: r.capacity,
    bedrooms: r.bedrooms,
    photos: r.photos,
    tags: [],
  };
}

function fill(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

// [texte](adresse) → lien ; le reste est du texte
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return (
    <>
      {parts.map((p, i) => {
        const m = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(p);
        return m ? (
          <Link key={i} href={m[2]} className="font-semibold text-[var(--fg-link)] underline underline-offset-2">{m[1]}</Link>
        ) : (
          <span key={i}>{p}</span>
        );
      })}
    </>
  );
}
const plain = (text: string) => text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

export default async function ThemeLandingPage({ scope, acces, filtre }: { scope: ThemeScope; acces?: string; filtre?: string }) {
  const { target, stats, national, scoped } = scope;
  const { theme, region, city } = target;
  const level = city ? "city" : region ? "region" : "national";
  const place = placeOf(target);
  const here = themePath(target);
  const guide = theme.guide === TO_PROVIDE || level !== "national" ? null : theme.guide;
  const faqSource: ThemeFaqItem[] = theme.faq === TO_PROVIDE ? [] : theme.faq[level];

  const isSpa = theme.slug === "avec-spa";
  const isDog = theme.slug === "chiens-acceptes";
  const isSauna = theme.slug === "avec-sauna";
  const isBillard = theme.slug === "table-de-billard";
  const isEv = theme.slug === "borne-de-recharge";
  const filterDef = THEME_FILTERS[theme.slug] ?? { param: "acces" as const, filters: [] };
  const chips = filterDef.filters
    .map((f) => ({ ...f, n: scoped.filter(f.test).length }))
    .filter((f) => f.n >= MIN_LISTINGS_CHIP);
  const rawFilter = filterDef.param === "filtre" ? filtre : acces;
  const active = chips.find((c) => c.key === rawFilter) ?? null;
  const filtered = active ? scoped.filter(active.test) : scoped;
  const showYear = isSpa && yearRoundKnownEnough(stats);
  // Chiens : une donnée n'est mise de l'avant que si elle est remplie sur au moins 30 % des fiches
  const dg = stats.dog;
  const enough = (known: number) => known >= 0.3 * stats.count;
  const feeCovered = enough(dg.feeKnown);
  const sizeCovered = enough(dg.sizeKnown);
  const showFree = isDog && feeCovered && dg.gratuit > 0;
  const showBig = isDog && sizeCovered && dg.toutesTailles > 0;
  const showFreeCol = showFree
  const showTwo = isDog && enough(dg.maxKnown) && dg.deuxPlus > 0;
  const picked = pickDiverse(filtered);
  const regionName = (db: string) => getRegionByDbValue(db);
  const cityHref = (db: string, c: string) => `/chalets/${theme.slug}/${regionName(db)?.slug}/${slugify(c)}`;
  const regionHref = (db: string) => `/chalets/${theme.slug}/${regionName(db)?.slug}`;

  // ── Concentration : une région dont plus de 70 % des fiches viennent du même exploitant n'est jamais présentée comme la 1re ──
  const ownerInfo = (db: string) => {
    const m = new Map<string, number>();
    for (const r of scope.rows) if (r.region === db) m.set(r.ownerKey, (m.get(r.ownerKey) ?? 0) + 1);
    const count = [...m.values()].reduce((a, b) => a + b, 0);
    return { count, top: m.size ? Math.max(...m.values()) : 0, owners: m.size };
  };
  const isConc = (db: string) => {
    const o = ownerInfo(db);
    return o.count >= CONCENTRATION_MIN_LISTINGS && o.top / o.count > CONCENTRATION_SHARE;
  };
  const topCityOf = (db: string) => national.byCity.find((c) => c.region === db)?.city ?? null;
  const concNote = (db: string) => `presque tous dans le même domaine${topCityOf(db) ? `, à ${topCityOf(db)}` : ""}`;
  const rankedRegions = [...stats.byRegion].sort((a, b) => Number(isConc(a.region)) - Number(isConc(b.region)) || b.count - a.count);
  // Les 3 premières régions par nombre de fiches, la concentrée (s'il y en a une) passant en dernier
  const top3Ranked = [...stats.byRegion.slice(0, 3)].sort((a, b) => Number(isConc(a.region)) - Number(isConc(b.region)) || b.count - a.count);
  const placeWithCount = (r: { region: string; count: number }) =>
    `${(regionName(r.region)?.locative ?? "").replace(/^en Lanaudière/, "dans Lanaudière")} (${r.count}${isConc(r.region) ? `, ${concNote(r.region)}` : ""})`;

  // ── Intro « réponse directe » ──
  const topPlaces = isSpa || isDog || isSauna || isBillard || isEv
    ? level === "national"
      ? top3Ranked.slice(0, isSauna ? 2 : 3).map(placeWithCount)
      : level === "region"
        ? stats.byCity.slice(0, 3).map((c) => `à ${c.city} (${c.count})`)
        : []
    : level === "national"
      ? top3Ranked.map((r) => (regionName(r.region)?.locative ?? "").replace(/^en /, ""))
      : level === "region"
        ? stats.byCity.slice(0, 3).map((c) => `à ${c.city}`)
        : [];
  const searchHref = `/chalets?${new URLSearchParams({ theme: theme.slug, ...(region ? { region: region.dbValue } : {}), ...(city ? { city } : {}) }).toString()}`;
  // Le bouton du bas suit la pastille choisie : même nombre, même sous-catégorie dans la recherche
  const buttonHref = active ? `${searchHref}&sub=${active.key}` : searchHref;

  // ── Variables de la FAQ ──
  const countIn = (slug: string) => national.byRegion.find((r) => regionName(r.region)?.slug === slug)?.count ?? 0;
  const quebecCities = national.byCity.filter((c) => regionName(c.region)?.slug === "quebec").slice(0, 3).map((c) => c.city);
  const siblingCities = (level === "city" ? scope.regionStats?.byCity.filter((c) => c.city !== city) : stats.byCity) ?? [];
  const dogsLink = stats.dogs > 0
    ? `[Voir les ${theme.labelPlural} qui acceptent les chiens](${searchHref}&dogs=1)`
    : "[chalets qui acceptent les chiens](/chalets/chiens-acceptes)";

  // Phrases calculées pour les niveaux région et ville (un morceau à zéro est retiré)
  const n1 = (n: number, one: string, many: string) => (n === 1 ? one : many);
  const accessBits = [
    stats.byAccess.direct > 0 && `${stats.byAccess.direct} ${n1(stats.byAccess.direct, "est directement au bord de l'eau", "sont directement au bord de l'eau")}`,
    stats.byAccess.lakePrivate > 0 && `${stats.byAccess.lakePrivate} ${n1(stats.byAccess.lakePrivate, "a un accès privé au lac", "ont un accès privé au lac")}`,
    stats.byAccess.beach > 0 && `${stats.byAccess.beach} ${n1(stats.byAccess.beach, "a une plage", "ont une plage")}`,
  ].filter((x): x is string => !!x);
  const accesPhrase = accessBits.length > 0 ? `${joinFr(accessBits)}.` : "";
  const fourchette =
    stats.pricedCount >= 5 && stats.priceP10 !== null && stats.priceP90 !== null
      ? ` La plupart se situent entre ${frInt(stats.priceP10)} $ et ${frInt(stats.priceP90)} $.`
      : "";
  const capacite =
    stats.guestsMin === null || stats.guestsMax === null
      ? ""
      : stats.guestsMin === stats.guestsMax
        ? `Ils accueillent ${stats.guestsMax} voyageurs.`
        : `Ils accueillent de ${stats.guestsMin} à ${stats.guestsMax} voyageurs.`;
  const grands = stats.large > 0 ? ` ${stats.large} ${n1(stats.large, "peut recevoir", "peuvent recevoir")} 10 personnes ou plus.` : "";
  const villesTop =
    level === "region" && stats.byCity.length >= 2
      ? joinFr(stats.byCity.slice(0, 3).map((c) => `${c.city} (${c.count})`))
      : "";
  const neighbours = level === "city" ? siblingCities.slice(0, 2) : [];
  const voisines =
    neighbours.length > 0
      ? `${neighbours.map((c) => `[${c.city}](${cityHref(c.region, c.city)}) (${c.count})`).join(", ")} et `
      : "Consultez ";
  // Villes les plus représentées, sans exploitant unique (au moins 2 exploitants différents dans la ville)
  const ownersIn = (regionDb: string, c: string) => new Set(scope.rows.filter((r) => r.region === regionDb && r.city === c).map((r) => r.ownerKey)).size;
  const spaCitiesNearMontreal = national.byCity
    .filter((c) => ["laurentides", "lanaudiere"].includes(regionName(c.region)?.slug ?? "") && c.count >= (isSauna || isBillard ? 3 : 5) && ownersIn(c.region, c.city) >= 2)
    .slice(0, 3)
    .map((c) => c.city);
  const sp = stats.spa;
  const deuxGroupes = [
    sp.deux > 0 ? `${sp.deux} ${sp.deux === 1 ? "accueille" : "accueillent"} de 2 à 4 voyageurs` : "",
    sp.groupes > 0 ? `${sp.groupes} ${sp.groupes === 1 ? "peut recevoir" : "peuvent recevoir"} 10 personnes ou plus` : "",
  ].filter(Boolean);
  const spaDetail = [
    sp.annee > 0 ? `Au moins ${sp.annee} ${sp.annee === 1 ? "a un spa ouvert" : "ont un spa ouvert"} à l'année.` : "",
    sp.placesConnu > 0 && sp.placesMediane !== null
      ? `Le nombre de places est indiqué pour ${sp.placesConnu} ${sp.placesConnu === 1 ? "spa" : "spas"}, avec une médiane de ${sp.placesMediane} places.`
      : "",
  ].filter(Boolean).join(" ");
  // ── Chiens : phrases calculées ──
  const fraisPhraseBits = [
    dg.fraisNuitMedian !== null ? `de ${frInt(dg.fraisNuitMedian)} $ par nuit` : "",
    dg.fraisSejourMedian !== null ? `de ${frInt(dg.fraisSejourMedian)} $ par séjour` : "",
  ].filter(Boolean);
  const comptezBits = [
    dg.fraisNuitMedian !== null ? `${frInt(dg.fraisNuitMedian)} $ par nuit` : "",
    dg.fraisSejourMedian !== null ? `${frInt(dg.fraisSejourMedian)} $ par séjour` : "",
  ].filter(Boolean);
  const fraisPhrase = fraisPhraseBits.length > 0 ? `les frais sont en général ${fraisPhraseBits.join(" ou ")}` : "";
  const gratuitSentence = dg.gratuit > 0 ? `${dg.gratuit} ${n1(dg.gratuit, "chalet n'exige", "chalets n'exigent")} aucuns frais.` : "";
  const fraisInfoText = [gratuitSentence, fraisPhrase ? `${dg.gratuit > 0 ? "Ailleurs, " : ""}${dg.gratuit > 0 ? fraisPhrase : upperFirst(fraisPhrase)}.` : ""].filter(Boolean).join(" ");
  const fraisInfo = fraisInfoText ? ` ${fraisInfoText}` : "";
  const limitesBits = [
    dg.max50 > 0 ? `à 50 lb (${dg.max50})` : "",
    dg.max25 > 0 ? `à 25 lb (${dg.max25})` : "",
  ].filter(Boolean);
  const limitesPoids = limitesBits.length > 0 ? ` Les autres limitent le poids ${joinFr(limitesBits).replace(" et à", " ou à")}.` : "";
  const croisHref = (sub: string) => `/chalets?${new URLSearchParams({ theme: theme.slug, ...(region ? { region: region.dbValue } : {}), ...(city ? { city } : {}), sub }).toString()}`;
  const croisBits = [
    dg.bordEau > 0 ? `[${dg.bordEau} ${n1(dg.bordEau, "chalet", "chalets")} au bord de l'eau](${croisHref("eau")})` : "",
    dg.spa > 0 ? `[${dg.spa} ${n1(dg.spa, "chalet", "chalets")} avec spa](${croisHref("spa")})` : "",
  ].filter(Boolean);
  const conditionsBits = [
    dg.gratuit > 0 ? `${dg.gratuit} ${n1(dg.gratuit, "n'exige", "n'exigent")} aucuns frais` : "",
    dg.toutesTailles > 0 ? `${dg.toutesTailles} ${n1(dg.toutesTailles, "accepte", "acceptent")} les chiens de toutes tailles` : "",
    dg.deuxPlus > 0 ? `${dg.deuxPlus} ${n1(dg.deuxPlus, "accepte", "acceptent")} au moins 2 chiens` : "",
  ].filter(Boolean);
  const gratuitRegion =
    dg.gratuit > 0
      ? `${dg.gratuit} ${n1(dg.gratuit, "accepte", "acceptent")} les chiens sans frais.${fraisPhrase ? ` Ailleurs, ${fraisPhrase}.` : ""}`
      : fraisPhrase ? `Aucun chalet n'est indiqué sans frais pour le chien ${place}. Les frais sont en général ${fraisPhraseBits.join(" ou ")}.` : "";
  const grosRegion = dg.toutesTailles > 0 ? `${dg.toutesTailles} ${n1(dg.toutesTailles, "accepte", "acceptent")} les chiens de toutes tailles.${limitesPoids}` : "";
  const topRegionsList = upperFirst(joinFr(top3Ranked.map((r) => `${withArticle(regionName(r.region)?.genitive ?? r.region)} (${r.count}${isConc(r.region) ? ", presque tous dans le même domaine" : ""})`)));
  const vars: Record<string, string> = {
    N: String(stats.count),
    nRegions: String(stats.regionsCount),
    topRegions: topRegionsList,
    fraisInfo,
    limitesPoids,
    nToutesTailles: dg.toutesTailles > 0 ? String(dg.toutesTailles) : "",
    nDeuxChiensPlus: dg.deuxPlus > 0 ? String(dg.deuxPlus) : "",
    maxChiens: dg.maxChiens > 0 ? String(dg.maxChiens) : "",
    gratuitRegion,
    grosRegion,
    croises: croisBits.length > 0 ? `${upperFirst(joinFr(croisBits))}.` : "",
    conditionsVille: conditionsBits.length > 0 ? `${upperFirst(joinFr(conditionsBits))}.` : "",
    lieu: place,
    prixMin: stats.priceMin !== null ? frInt(stats.priceMin) : "",
    prixP10: stats.priceP10 !== null ? frInt(stats.priceP10) : "—",
    prixP90: stats.priceP90 !== null ? frInt(stats.priceP90) : "—",
    nLaurentides: String(countIn("laurentides")),
    nLanaudiere: String(countIn("lanaudiere")),
    nQuebec: String(countIn("quebec")),
    villesMontreal: isSpa || isDog || isSauna || isBillard ? joinFr(spaCitiesNearMontreal) : joinFr(citiesNearMontreal(scope)),
    nCharlevoix: String(countIn("charlevoix") || ""),
    nPrive: sp.prive > 0 ? String(sp.prive) : "",
    nAnnee: sp.annee > 0 && sp.anneeConnu >= 3 ? String(sp.annee) : "",
    nDeux: sp.deux > 0 ? String(sp.deux) : "",
    deuxGroupes: deuxGroupes.length > 0 ? `${upperFirst(deuxGroupes.join(", et "))}.` : "",
    spaDetail,
    villesQuebec: joinFr(quebecCities),
    nChiens: String(stats.dogs),
    lienChiens: dogsLink,
    fourchette,
    accesPhrase,
    capacite,
    grands,
    villesTop,
    deRegion: region?.genitive ?? "",
    ville: city ?? "",
    deVille: city ? (/^[AEIOUYÀÂÉÈÊÎÔÛ]/i.test(city) ? `d'${city}` : `de ${city}`) : "",
    voisines,
    lienRegion: region ? regionHref(region.dbValue) : "",
    nRegion: String(scope.regionStats?.count ?? stats.count),
    chaletsChiens: `${stats.dogs} ${n1(stats.dogs, theme.labelPlural.replace(/^chalets/, "chalet"), theme.labelPlural)}`,
    accepte: n1(stats.dogs, "accepte", "acceptent"),
    ailleursChiens: national.dogs > stats.dogs ? ` Les autres régions en comptent ${national.dogs - stats.dogs}.` : "",
  };
  // ── Sauna : phrases calculées ──
  const sx = stats.sauna;
  const saunaSpaEauBits = [
    sx.spa > 0 ? `${sx.spa} ${n1(sx.spa, "a", "ont")} aussi un spa` : "",
    sx.eau > 0 ? `${sx.eau} ${n1(sx.eau, "est", "sont")} au bord de l'eau` : "",
  ].filter(Boolean);
  const quebecCount = countIn("quebec");
  const quebecPhrase =
    quebecCount === 0
      ? ""
      : quebecCount < 3
        ? `L'offre est encore petite près de Québec : ${quebecCount} ${n1(quebecCount, "chalet", "chalets")} pour l'instant. [Voir les chalets avec spa de la région de Québec](/chalets/avec-spa/quebec)`
        : `La région de Québec compte ${quebecCount} chalets avec sauna${quebecCities.length > 0 ? `, surtout à ${joinFr(quebecCities)}` : ""}.`;
  // ── Billard : phrases calculées ──
  const bx = stats.billiard;
  const quebecDb = getRegionBySlug("quebec")?.dbValue ?? "";
  const charlevoixCount = countIn("charlevoix");
  const billardQuebecPhrase =
    quebecCount === 0
      ? ""
      : `${isConc(quebecDb)
          ? `La région de Québec compte ${quebecCount} chalets avec billard, presque tous dans un même domaine${topCityOf(quebecDb) ? ` à ${topCityOf(quebecDb)}` : ""}, à environ une heure de la ville.`
          : `La région de Québec compte ${quebecCount} ${n1(quebecCount, "chalet", "chalets")} avec billard${quebecCities.length > 0 ? `, surtout à ${joinFr(quebecCities)}` : ""}.`}${charlevoixCount > 0 ? ` Charlevoix en compte aussi ${charlevoixCount}.` : ""}`;
  const groupes1016 = [
    bx.groupes > 0 ? `${bx.groupes} ${n1(bx.groupes, "accueille", "accueillent")} 10 personnes ou plus` : "",
    bx.grands > 0 ? `${bx.grands} au moins 16` : "",
  ].filter(Boolean);
  const billardSpaEauBits = [
    bx.spa > 0 ? `${bx.spa} ${n1(bx.spa, "a", "ont")} aussi un spa` : "",
    bx.eau > 0 ? `${bx.eau} ${n1(bx.eau, "est", "sont")} au bord de l'eau` : "",
  ].filter(Boolean);
  const ownersByRegion = (db: string) => ownerInfo(db).owners;
  const choiceRegions = stats.byRegion.filter((r) => !isConc(r.region) && r.count >= 3).sort((a, b) => ownersByRegion(b.region) - ownersByRegion(a.region)).slice(0, 2);
  const choiceCities = choiceRegions
    .flatMap((r) => national.byCity.filter((c) => c.region === r.region && ownersIn(c.region, c.city) >= 2).slice(0, 2).map((c) => c.city))
    .slice(0, 4);
  const concRegions = stats.byRegion.filter((r) => isConc(r.region));
  // ── Borne de recharge : phrases calculées ──
  const ex = stats.ev;
  const evEnough = (known: number) => known >= 0.3 * stats.count;
  const evLevelShown = isEv && evEnough(ex.levelKnown) && ex.niveau2 > 0;
  const evFeeShown = isEv && evEnough(ex.feeKnown) && ex.incluse > 0;
  const placeCount = (r: { region: string; count: number }) => `${(regionName(r.region)?.locative ?? "").replace(/^en Lanaudière/, "dans Lanaudière")} (${r.count})`;
  const evTop3 = stats.byRegion.slice(0, 4).filter((r) => !isConc(r.region)).slice(0, 3);
  const evConcRegions = stats.byRegion.slice(0, 4).filter((r) => isConc(r.region));
  const evPlacesText =
    level === "national"
      ? `${evTop3.length > 0 ? `, surtout ${joinFr(evTop3.map(placeCount))}` : ""}${evConcRegions.length > 0 ? `, ainsi que ${joinFr(evConcRegions.map((r) => `${regionName(r.region)?.locative ?? ""} (${r.count}, presque tous dans le même domaine)`))}` : ""}`
      : "";
  const remoteRegions = stats.byRegion.filter((r) => EV_REMOTE_REGIONS.includes(r.region));
  const evEloigneesPhrase =
    ex.eloignees > 0
      ? `Oui, ${ex.eloignees}, surtout ${joinFr(remoteRegions.slice(0, 2).map(placeCount))}. C'est là qu'une borne au chalet est la plus utile.`
      : "";
  const nearSlugs = ["laurentides", "lanaudiere", "cantons-de-lest", "monteregie"];
  const evNear = stats.byRegion.filter((r) => !isConc(r.region) && r.count >= 3 && nearSlugs.includes(regionName(r.region)?.slug ?? "")).slice(0, 3);
  const farSlugs = ["gaspesie", "charlevoix", "cote-nord", "abitibi-temiscamingue", "saguenay-lac-saint-jean", "bas-saint-laurent"];
  const evFar = stats.byRegion.filter((r) => r.count >= 3 && farSlugs.includes(regionName(r.region)?.slug ?? "")).slice(0, 2);
  const evTypeBits = [
    evEnough(ex.levelKnown) && ex.niveau2 > 0 ? `${ex.niveau2} ${n1(ex.niveau2, "a", "ont")} une borne de niveau 2` : "",
    evEnough(ex.feeKnown) && ex.incluse > 0 ? `la recharge est incluse dans ${ex.incluse}` : "",
  ].filter(Boolean);
  const evComboBits = [
    ex.spa > 0 ? `${ex.spa} avec spa` : "",
    ex.eau > 0 ? `${ex.eau} au bord de l'eau` : "",
    ex.chiens > 0 ? `${ex.chiens} ${n1(ex.chiens, "qui accepte", "qui acceptent")} les chiens` : "",
  ].filter(Boolean);
  const concentrationFor = (slug: string) => {
    const reg = getRegionBySlug(slug);
    const cities = reg ? national.byCity.filter((c) => c.region === reg.dbValue).slice(0, 3).map((c) => c.city) : [];
    return cities.length >= 2 ? joinFr(cities) : "";
  };
  const concLaurentides = concentrationFor("laurentides");
  const concLanaudiere = concentrationFor("lanaudiere");
  if (isSauna) {
    Object.assign(vars, {
      nPrive: sx.prive > 0 ? String(sx.prive) : "",
      prive: sx.prive === 0 ? "" : sx.prive === stats.count ? `Oui : dans les ${stats.count} chalets, le sauna est privé, réservé à votre groupe.` : `Dans ${sx.prive} chalets sur ${stats.count}, oui, le sauna est alors réservé à votre groupe.`,
      nSaunaSpa: sx.spa > 0 ? String(sx.spa) : "",
      circuitPhrase: sx.circuit > 0 ? `, dont ${sx.circuit} ${n1(sx.circuit, "est", "sont")} aussi au bord de l'eau, pour faire le cycle chaud-froid-repos complet` : "",
      saunaSpaEau: saunaSpaEauBits.length > 0 ? `${upperFirst(saunaSpaEauBits.join(" et "))}.` : "",
      quebecPhrase,
      villesMontrealPhrase: spaCitiesNearMontreal.length > 0 ? ` ${joinFr(spaCitiesNearMontreal)} ${n1(spaCitiesNearMontreal.length, "est", "sont")} parmi les plus représentées.` : "",
    });
  }
  if (isBillard) {
    Object.assign(vars, {
      parPersonne: bx.parPersonneConnu >= 10 && bx.parPersonneMediane !== null ? ` Pour un grand groupe, ça revient à environ ${frInt(bx.parPersonneMediane)} $ par personne par nuit.` : "",
      autourDe: spaCitiesNearMontreal.length > 0 ? `, surtout autour de ${joinFr(spaCitiesNearMontreal)}` : "",
      quebecPhrase: billardQuebecPhrase,
      groupesPhrase: bx.groupes > 0 ? `Oui : ${bx.groupes} ${n1(bx.groupes, "accueille", "accueillent")} 10 personnes ou plus${bx.grands > 0 ? `, et ${bx.grands} au moins 16` : ""}.` : "",
      nBillardSpa: bx.spa > 0 ? String(bx.spa) : "",
      billardEauPhrase: bx.eau > 0 ? `, et ${bx.eau} ${n1(bx.eau, "est", "sont")} au bord de l'eau` : "",
      prive: bx.prive === 0 ? "" : bx.prive === stats.count ? `Oui : dans les ${stats.count} chalets, la table est dans le chalet, réservée à votre groupe.` : `Dans ${bx.prive} chalets sur ${stats.count}, oui : elle est dans le chalet, réservée à votre groupe.`,
      groupes1016: groupes1016.length > 0 ? `${upperFirst(groupes1016.join(", et "))}.` : capacite,
      billardSpaEau: billardSpaEauBits.length > 0 ? `${upperFirst(billardSpaEauBits.join(" et "))}.` : "",
      choixExploitants:
        choiceRegions.length > 0
          ? `${upperFirst(joinFr(choiceRegions.map((r) => withArticle(regionName(r.region)?.genitive ?? r.region))))} offrent le plus grand choix d'exploitants${choiceCities.length > 0 ? `, autour de ${joinFr(choiceCities)}` : ""}.`
          : "",
      domaineConcentre: concRegions.map((r) => ` ${upperFirst(regionName(r.region)?.locative ?? "dans la région")}, l'offre est concentrée dans un grand domaine${topCityOf(r.region) ? `, à ${topCityOf(r.region)}` : ""}.`).join(""),
    });
  }
  if (isEv) {
    Object.assign(vars, {
      evTopRegions: evTop3.length > 0 ? `, surtout ${joinFr(evTop3.map(placeCount))}` : "",
      evNiveau2Phrase: ex.levelKnown >= 3 && ex.niveau2 > 0 ? ` ${ex.niveau2} ${n1(ex.niveau2, "chalet a", "chalets ont")} une borne de niveau 2.` : "",
      evTeslaPhrase: ex.connKnown >= 3 && ex.tesla > 0 ? ` ${ex.tesla} ${n1(ex.tesla, "chalet a", "chalets ont")} aussi un connecteur Tesla.` : "",
      evEloigneesPhrase,
      evTypeRegion: evTypeBits.length > 0 ? `${upperFirst(evTypeBits.join(", et "))}.` : "",
      evCombos: evComboBits.length > 0 ? `Oui : ${joinFr(evComboBits)}.` : "",
      evChoix:
        evNear.length > 0
          ? `${upperFirst(joinFr(evNear.map((r) => withArticle(regionName(r.region)?.genitive ?? r.region))))} offrent le plus de choix, à 1 h à 1 h 30 de Montréal : la plupart des véhicules électriques s'y rendent sans recharge en route.`
          : "",
      evLoin:
        evFar.length > 0
          ? ` ${upperFirst(joinFr(evFar.map((r) => regionName(r.region)?.locative ?? "")))}, où le trajet est plus long, une borne au chalet permet de repartir avec une batterie pleine.`
          : "",
    });
  }
  const concentration = [
    concLaurentides ? ` Dans les Laurentides, l'offre se concentre autour de ${concLaurentides}.` : "",
    concLanaudiere ? ` Dans Lanaudière, elle se trouve surtout autour de ${concLanaudiere}.` : "",
  ].join("");
  const faq = faqSource
    .filter((f) => (f.needs ?? []).every((k) => vars[k] && vars[k] !== "—"))
    .map((f) => ({
      q: fr(fill(f.q, vars)),
      a: fr(fill(stats.dogs === 0 && f.aNone ? f.aNone : f.a, vars)),
    }));

  // ── Bloc éditorial des pages région (texte propre à la région, vide = pas de bloc) ──
  const regionText = region && theme.regionIntroKey ? getRegionContent(region.slug)?.[theme.regionIntroKey]?.trim() ?? "" : "";
  const regionFigures =
    level === "region" && regionText
      ? [
          `${stats.count} ${n1(stats.count, "chalet", "chalets")}`,
          stats.priceMin !== null ? `à partir de ${frInt(stats.priceMin)} $/nuit` : "",
          stats.byAccess.lakePrivate > 0 ? `${stats.byAccess.lakePrivate} avec accès privé` : "",
        ].filter(Boolean)
      : [];

  // ── Paragraphe éditorial du tableau ──
  const regionLabels = top3Ranked.slice(0, isSauna ? 2 : 3).map((r) => withArticle(regionName(r.region)?.genitive ?? r.region));
  const others = stats.byRegion.slice(3, 5).filter((r) => r.count >= 5).map((r) => withArticle(regionName(r.region)?.genitive ?? r.region));
  const autresRegions = others.length > 0 ? ` ${upperFirst(joinFr(others))} complète${others.length > 1 ? "nt" : ""} l'offre.` : "";
  const topRegionsParagraph = `${upperFirst(joinFr(regionLabels))} regroupent ${theme.topRegionsWord ?? "la majorité"} des ${theme.labelPlural} sur Kabanalouer${isSauna && top3Ranked.slice(0, 2).every((r) => ["laurentides", "lanaudiere"].includes(regionName(r.region)?.slug ?? "")) ? ", à environ une heure de Montréal" : ""}.`;
  const accessSentence = isEv
    ? evComboBits.length > 0 ? `${upperFirst(joinFr(evComboBits))}.` : ""
    : isBillard
    ? groupes1016.length > 0 ? `${upperFirst(groupes1016.join(", et "))}.` : ""
    : isSauna
    ? stats.sauna.prive > 0 ? `Dans ${stats.sauna.prive} d'entre eux, le sauna est privé.${saunaSpaEauBits.length > 0 ? ` ${upperFirst(saunaSpaEauBits.join(" et "))}.` : ""}` : ""
    : isDog
    ? conditionsBits.length > 0 ? `${upperFirst(joinFr(conditionsBits))}.` : ""
    : isSpa
    ? stats.spa.prive > 0 ? `Dans ${stats.spa.prive} d'entre eux, le spa est privé.` : ""
    : `${stats.byAccess.direct} sont directement sur la rive et ${stats.byAccess.lake} ont un accès à un lac.`;

  // ── Tableau (régions ou villes) ──
  const tableRows =
    level === "national"
      ? rankedRegions.filter((r) => r.count >= 3).map((r) => ({ label: regionName(r.region)?.name ?? r.region, href: regionHref(r.region), count: r.count, from: r.priceFrom, yearRound: r.yearRound, dogFree: r.dogFree, saunaSpa: r.saunaSpa, groupes: r.groupes, ev2: r.ev2, note: isConc(r.region) ? (ownerInfo(r.region).top === ownerInfo(r.region).count ? "tous dans un même domaine" : `dont ${ownerInfo(r.region).top} dans un même domaine`) : "" }))
      : level === "region"
        ? stats.byCity.map((c) => ({ label: c.city, href: cityHref(c.region, c.city), count: c.count, from: c.priceFrom, yearRound: c.yearRound, dogFree: c.dogFree, saunaSpa: c.saunaSpa, groupes: c.groupes, ev2: c.ev2, note: "" }))
        : [];
  // Sauna (petit thème) : les régions de moins de 3 fiches sont regroupées sur une ligne sans lien
  const elsewhere = national.byRegion.filter((r) => r.count < 3).map((r) => regionName(r.region)?.name ?? r.region);
  // Le tableau n'affiche que les lieux avec un prix ; les autres passent dans « Aussi : »
  const pricedRows = tableRows.filter((r) => r.from !== null);
  const shownRows = pricedRows.slice(0, 6);
  const alsoRows = tableRows.filter((r) => !shownRows.includes(r));

  // ── Autres thèmes, même niveau géographique (seulement les pages actives) ──
  const comboIndex = await getComboIndex();
  const otherThemes: { label: string; href: string }[] = [];
  if (level === "national") {
    for (const ct of COMBO_THEMES) {
      if (ct.slugFr === theme.slug) continue;
      const total = Object.values(comboIndex.region).reduce((s, r) => s + (r[ct.key] ?? 0), 0);
      if (total >= MIN_LISTINGS_FOR_COMBO) otherThemes.push({ label: ct.linkFr, href: ct.parentPathFr });
    }
  } else if (region) {
    const links = city ? activeThemesInCity(comboIndex, region, city) : activeThemesInRegion(comboIndex, region);
    for (const l of links) if (l.theme.slugFr !== theme.slug) otherThemes.push({ label: comboLinkLabel(l, false, { withPlace: false }), href: comboPath(l.theme, l.region, l.city, false) });
  }

  // ── JSON-LD ──
  const crumbs = [
    { name: "Accueil", href: "/" },
    { name: "Chalets", href: "/chalets" },
    { name: theme.breadcrumbLabel, href: themePath({ theme }) },
    ...(region ? [{ name: region.name, href: themePath({ theme, region }) }] : []),
    ...(city ? [{ name: city, href: here }] : []),
  ];
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: fr(c.name), item: `${SITE_URL}${c.href}` })),
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: picked.map((r, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_URL}${buildListingPath({ region: r.region, city: r.city, listing_number: r.listingNumber, custom_slug: r.customSlug }, "fr") ?? `/chalets/${r.id}`}`,
        name: r.title,
      })),
    },
    ...(faq.length > 0
      ? [{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: plain(f.a) } })),
        }]
      : []),
  ];

  const updated = new Date(stats.updatedAt).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" });
  const placeTile =
    level === "city"
      ? null
      : level === "region"
        ? { value: String(stats.citiesCount), label: stats.citiesCount > 1 ? "villes" : "ville" }
        : { value: String(stats.regionsCount), label: stats.regionsCount > 1 ? "régions" : "région" };
  const guestsTile = stats.guestsMin !== null && stats.guestsMax !== null ? { value: `${stats.guestsMin} à ${stats.guestsMax}`, label: "voyageurs" } : null;
  const tiles = (isEv
    ? [
        { value: String(stats.count), label: "chalets avec borne" },
        level === "national" ? { value: String(stats.regionsCount), label: "régions" } : placeTile,
        evLevelShown
          ? { value: String(ex.niveau2), label: n1(ex.niveau2, "borne de niveau 2", "bornes de niveau 2") }
          : ex.eloignees > 0
            ? { value: String(ex.eloignees), label: "en région éloignée" }
            : guestsTile,
        stats.priceMin !== null ? { value: money(stats.priceMin), label: "prix de départ le plus bas" } : null,
      ]
    : isBillard
    ? [
        { value: String(stats.count), label: "chalets avec billard" },
        bx.groupes > 0 ? { value: String(bx.groupes), label: "pour 10 personnes ou plus" } : null,
        bx.spa > 0 ? { value: String(bx.spa), label: "avec spa aussi" } : null,
        stats.priceMin !== null ? { value: money(stats.priceMin), label: "prix de départ le plus bas" } : null,
        placeTile,
        guestsTile,
      ]
    : isSauna
    ? [
        { value: String(stats.count), label: "chalets avec sauna" },
        stats.priceMin !== null ? { value: money(stats.priceMin), label: "prix de départ le plus bas" } : null,
        stats.sauna.spa > 0 ? { value: String(stats.sauna.spa), label: "avec spa aussi" } : null,
        stats.sauna.eau > 0 ? { value: String(stats.sauna.eau), label: "au bord de l'eau" } : null,
        placeTile,
        guestsTile,
      ]
    : isDog
    ? [
        { value: String(stats.count), label: "chalets" },
        showFree ? { value: String(dg.gratuit), label: "sans frais pour le chien" } : null,
        showBig ? { value: String(dg.toutesTailles), label: `${n1(dg.toutesTailles, "accepte", "acceptent")} les gros chiens` } : null,
        showTwo ? { value: String(dg.deuxPlus), label: `${n1(dg.deuxPlus, "accepte", "acceptent")} 2 chiens ou plus` } : null,
        stats.priceMin !== null ? { value: money(stats.priceMin), label: "prix de départ le plus bas" } : null,
        placeTile,
        guestsTile,
      ]
    : isSpa
    ? [
        { value: String(stats.count), label: "chalets avec spa" },
        stats.priceMin !== null ? { value: money(stats.priceMin), label: "prix de départ le plus bas" } : null,
        showYear ? { value: String(stats.spa.annee), label: stats.spa.annee > 1 ? "spas ouverts à l'année" : "spa ouvert à l'année" } : placeTile,
        stats.spa.deux > 0 ? { value: String(stats.spa.deux), label: stats.spa.deux > 1 ? "chalets pour 2 à 4 personnes" : "chalet pour 2 à 4 personnes" } : guestsTile,
      ]
    : [
        { value: String(stats.count), label: "chalets" },
        stats.priceMin !== null ? { value: money(stats.priceMin), label: "prix de départ le plus bas" } : null,
        placeTile,
        guestsTile,
      ]).filter((t): t is { value: string; label: string } => !!t).slice(0, 4);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pb-16">
        {jsonLd.map((d, i) => (
          <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(d) }} />
        ))}

        {/* ── 1. En-tête ── */}
        <header className={`${WRAP} pt-6`}>
          <nav aria-label="Fil d'Ariane" className="text-sm text-[var(--fg-3)]">
            <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              {crumbs.map((c, i) => (
                <li key={c.href + i} className="flex items-center gap-1.5">
                  {i > 0 && <span aria-hidden="true">›</span>}
                  {i < crumbs.length - 1 ? <Link href={c.href} className="hover:underline">{fr(c.name)}</Link> : <span aria-current="page" className="text-[var(--fg-2)]">{fr(c.name)}</span>}
                </li>
              ))}
            </ol>
          </nav>

          <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-end">
            <div>
              <h1 className="text-[length:clamp(34px,5vw,60px)] font-extrabold leading-[1.02] tracking-[-0.045em] text-[var(--fg-1)]">
                {fr(`${theme.h1Base} ${place}`)}
              </h1>
              {isEv ? (
              <p className="mt-5 max-w-[62ch] text-[17px] leading-relaxed text-[var(--fg-2)]">
                {fr("Kabanalouer compte ")}
                <strong className="font-bold text-[var(--fg-1)]">{fr(`${stats.count} ${theme.labelPlural}`)}</strong>
                {fr(` pour véhicule électrique ${place}${level === "national" ? evPlacesText : topPlaces.length > 0 ? `, surtout ${joinFr(topPlaces)}` : ""}. `)}
                {fr("Vous rechargez au chalet pendant votre séjour, sans chercher de borne publique. ")}
                {evLevelShown && fr(`${ex.niveau2} ${n1(ex.niveau2, "a", "ont")} une borne de niveau 2${evFeeShown ? `, et la recharge est incluse dans ${ex.incluse}` : ""}. `)}
                {!evLevelShown && evFeeShown && fr(`La recharge est incluse dans ${ex.incluse}. `)}
                {stats.priceMin !== null && (
                  <>
                    {fr("Les prix de départ commencent à ")}
                    <strong className="font-bold text-[var(--fg-1)]">{fr(`${frInt(stats.priceMin)} $/nuit`)}</strong>
                    {fr(", sans frais de service.")}
                  </>
                )}
              </p>
              ) : isBillard ? (
              <p className="mt-5 max-w-[62ch] text-[17px] leading-relaxed text-[var(--fg-2)]">
                {fr("Kabanalouer compte ")}
                <strong className="font-bold text-[var(--fg-1)]">{fr(`${stats.count} ${theme.labelPlural}`)}</strong>
                {fr(` à louer ${place}. `)}
                {bx.groupes > 0 &&
                  fr(`${bx.groupes >= 0.5 * stats.count ? "La plupart sont de grands chalets" : "Plusieurs sont de grands chalets"} : ${bx.groupes} ${n1(bx.groupes, "accueille", "accueillent")} 10 personnes ou plus, ce qui en fait un bon choix pour une fin de semaine en famille ou entre amis. `)}
                {topPlaces.length > 0 &&
                  fr(`On les trouve surtout ${
                    level === "national" && top3Ranked.length >= 2 && ["laurentides", "lanaudiere"].every((sl) => top3Ranked.slice(0, 2).some((r) => regionName(r.region)?.slug === sl))
                      ? `${topPlaces[0]} et ${topPlaces[1]}, à environ une heure de Montréal${topPlaces[2] ? `, ainsi que ${topPlaces[2]}` : ""}`
                      : joinFr(topPlaces)
                  }. `)}
                {bx.spa > 0 && fr(`${bx.spa} ${n1(bx.spa, "a", "ont")} aussi un spa. `)}
                {stats.priceMin !== null && (
                  <>
                    {fr("Les prix de départ commencent à ")}
                    <strong className="font-bold text-[var(--fg-1)]">{fr(`${frInt(stats.priceMin)} $/nuit`)}</strong>
                    {fr(", sans frais de service.")}
                  </>
                )}
              </p>
              ) : isSauna ? (
              <p className="mt-5 max-w-[62ch] text-[17px] leading-relaxed text-[var(--fg-2)]">
                {fr("Kabanalouer compte ")}
                <strong className="font-bold text-[var(--fg-1)]">{fr(`${stats.count} ${theme.labelPlural}`)}</strong>
                {fr(` à louer ${place}${topPlaces.length > 0 ? `, surtout ${joinFr(topPlaces)}${level === "national" && stats.byRegion.slice(0, 2).every((r) => ["laurentides", "lanaudiere"].includes(regionName(r.region)?.slug ?? "")) ? ", à environ une heure de Montréal" : ""}` : ""}. `)}
                {stats.sauna.prive > 0 && fr(`Dans ${stats.sauna.prive} d'entre eux, le sauna est privé. `)}
                {saunaSpaEauBits.length > 0 && fr(`${upperFirst(saunaSpaEauBits.join(", et "))}${stats.sauna.eau > 0 ? ", pour se rafraîchir entre deux séances" : ""}. `)}
                {stats.priceMin !== null && (
                  <>
                    {fr("Les prix de départ commencent à ")}
                    <strong className="font-bold text-[var(--fg-1)]">{fr(`${frInt(stats.priceMin)} $/nuit`)}</strong>
                    {fr(", sans frais de service.")}
                  </>
                )}
              </p>
              ) : isDog ? (
              <p className="mt-5 max-w-[62ch] text-[17px] leading-relaxed text-[var(--fg-2)]">
                {fr("Kabanalouer compte ")}
                <strong className="font-bold text-[var(--fg-1)]">{fr(`${stats.count} ${theme.labelPlural}`)}</strong>
                {fr(` ${place}${topPlaces.length > 0 ? `, surtout ${joinFr(topPlaces)}` : ""}. `)}
                {showFree && fr(`${dg.gratuit} ${n1(dg.gratuit, "n'exige", "n'exigent")} aucuns frais pour le chien. `)}
                {feeCovered && comptezBits.length > 0 && fr(`${showFree ? "Ailleurs, comptez" : "Comptez"} en général ${comptezBits.join(" ou ")}. `)}
                {showBig && fr(`${dg.toutesTailles} ${n1(dg.toutesTailles, "accepte", "acceptent")} les chiens de toutes tailles. `)}
                {stats.priceMin !== null && (
                  <>
                    {fr("Les prix de départ commencent à ")}
                    <strong className="font-bold text-[var(--fg-1)]">{fr(`${frInt(stats.priceMin)} $/nuit`)}</strong>
                    {fr(", sans frais de service.")}
                  </>
                )}
              </p>
              ) : isSpa ? (
              <p className="mt-5 max-w-[62ch] text-[17px] leading-relaxed text-[var(--fg-2)]">
                {fr("Kabanalouer compte ")}
                <strong className="font-bold text-[var(--fg-1)]">{fr(`${stats.count} ${theme.labelPlural}`)}</strong>
                {fr(` à louer ${place}${topPlaces.length > 0 ? `, surtout ${joinFr(topPlaces)}` : ""}. `)}
                {stats.spa.prive > 0 &&
                  fr(`Dans ${stats.spa.prive} d'entre eux, le spa est privé${showYear ? `, et au moins ${stats.spa.annee} sont ouverts à l'année` : ""}. `)}
                {stats.priceMin !== null && (
                  <>
                    {fr("Les prix de départ commencent à ")}
                    <strong className="font-bold text-[var(--fg-1)]">{fr(`${frInt(stats.priceMin)} $/nuit`)}</strong>
                    {fr(". ")}
                  </>
                )}
              </p>
              ) : (
              <p className="mt-5 max-w-[62ch] text-[17px] leading-relaxed text-[var(--fg-2)]">
                {fr("Kabanalouer compte ")}
                <strong className="font-bold text-[var(--fg-1)]">{fr(`${stats.count} ${theme.labelPlural}`)}</strong>
                {fr(` à louer ${place}${topPlaces.length > 0 ? `, surtout ${joinFr(topPlaces)}` : ""}. `)}
                {stats.priceMin !== null && (
                  <>
                    {fr("Les prix de départ commencent à ")}
                    <strong className="font-bold text-[var(--fg-1)]">{fr(`${frInt(stats.priceMin)} $/nuit`)}</strong>
                    {fr(". ")}
                  </>
                )}
              </p>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-3">
              {tiles.map((t) => (
                <div key={t.label} className="rounded-[var(--radius-lg)] bg-[var(--bg-surface-alt)] p-4">
                  <dd className="text-[26px] font-extrabold leading-none tracking-[-0.03em] text-[var(--fg-1)]">{fr(t.value)}</dd>
                  <dt className="mt-1.5 text-[13px] font-normal leading-snug text-[var(--fg-3)]">{fr(t.label)}</dt>
                </div>
              ))}
            </dl>
          </div>

          {chips.length > 0 && (
            <div className="-mx-[clamp(16px,4vw,56px)] mt-7 px-[clamp(16px,4vw,56px)] flex flex-nowrap items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Sous-catégories">
              <Link href={here} scroll={false} className={`${CHIP} ${active ? CHIP_IDLE : CHIP_ACTIVE}`} aria-current={active ? undefined : "true"}>
                {fr(`Tous · ${stats.count}`)}
              </Link>
              {chips.map((c) => (
                <Link key={c.key} href={`${here}?${filterDef.param}=${c.key}`} scroll={false} className={`${CHIP} ${active?.key === c.key ? CHIP_ACTIVE : CHIP_IDLE}`} aria-current={active?.key === c.key ? "true" : undefined}>
                  {fr(`${c.label} · ${c.n}`)}
                </Link>
              ))}
            </div>
          )}
        </header>

        {/* ── 2. Grille de fiches ── */}
        <section className={`${WRAP} mt-8`} aria-label="Chalets">
          <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {picked.map((r, i) => {
              const card = (
                <ListingCard key={r.id} listing={toCardListing(r)} priority={i < 4} boldCapacity={isBillard} themeBadge={(() => { const b = badgeOf(theme.slug, r); return b ? fr(b) : undefined; })()} />
              );
              if (!isDog) return card;
              // Chiens : les conditions (nombre, poids, frais) sous la carte, ou un renvoi au propriétaire
              const summary = dogPolicyShortSummary(
                { allowed: true, max: r.dogMax, sizeLimit: r.dogSize, feeType: r.dogFee, feeAmount: r.dogFeeAmount },
                "fr"
              );
              return (
                <div key={r.id}>
                  {card}
                  {summary ? (
                    <p className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-[var(--fg-2)]">
                      <PawIcon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{fr(summary)}</span>
                    </p>
                  ) : (
                    <p className="mt-2 flex items-center gap-1.5 text-[13px] text-[var(--fg-3)]">
                      <PawIcon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">Conditions à confirmer avec le propriétaire</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-10 flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-[var(--fg-3)]">{fr(`${picked.length} sur ${filtered.length} chalets`)}</p>
            <Link href={buttonHref} className="rounded-[var(--radius-sm)] bg-[var(--fg-1)] px-7 py-[15px] text-[15px] font-bold text-white hover:opacity-90">
              {fr(`Voir les ${filtered.length} ${theme.labelPlural}${active ? ` ${active.suffix}` : ""}`)}
            </Link>
          </div>
        </section>

        {/* ── 3. Tableau par région ou par ville, ou données de la ville ── */}
        <section className={`${WRAP} mt-16`}>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--fg-3)]">Données Kabanalouer</p>
          <h2 className="mt-2 text-[length:clamp(26px,3.2vw,40px)] font-extrabold leading-tight tracking-[-0.04em] text-[var(--fg-1)]">
            {fr(`Où louer un chalet ${theme.h2Label ?? theme.label} ${place} ?`)}
          </h2>
          <p className="mt-4 max-w-[70ch] text-base leading-relaxed text-[var(--fg-2)]">
            {level === "national"
              ? fr(fill(theme.nationalRegionParagraph ?? "", { topRegionsParagraph, autresRegions, concentration, evChoix: String(vars.evChoix ?? ""), evLoin: String(vars.evLoin ?? ""), choixExploitants: String(vars.choixExploitants ?? ""), domaineConcentre: String(vars.domaineConcentre ?? "") }))
              : level === "region"
                ? fr(`Voici les villes ${place} qui comptent le plus de ${theme.labelPlural}, classées par nombre de chalets.`)
                : fr(`${city} compte ${stats.count} ${theme.labelPlural}${stats.priceMin !== null ? `, à partir de ${frInt(stats.priceMin)} $/nuit` : ""}${stats.guestsMin !== null ? `, pour ${stats.guestsMin} à ${stats.guestsMax} voyageurs` : ""}. ${accessSentence}`)}
          </p>

          {shownRows.length > 0 && (
            <>
              <div className="mt-6 max-w-[760px] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-1)]">
                <table className="w-full text-left text-sm sm:text-base">
                  <caption className="sr-only">{fr(`${theme.labelPlural} par ${level === "national" ? "région" : "ville"}`)}</caption>
                  <thead className="bg-[var(--bg-surface-alt)] text-xs uppercase tracking-[0.06em] text-[var(--fg-3)]">
                    <tr>
                      <th scope="col" className="px-3 py-3 font-semibold sm:px-4">{level === "national" ? "Région" : "Ville"}</th>
                      <th scope="col" className="px-3 py-3 font-semibold sm:px-4">Chalets</th>
                      {showYear && <th scope="col" className="px-3 py-3 font-semibold sm:px-4">Ouverts à l'année</th>}
                      {showFreeCol && <th scope="col" className="px-3 py-3 font-semibold sm:px-4">Sans frais pour le chien</th>}
                      {isSauna && <th scope="col" className="px-3 py-3 font-semibold sm:px-4">Avec spa aussi</th>}
                      {isBillard && <th scope="col" className="px-3 py-3 font-semibold sm:px-4">Pour 10 et plus</th>}
                      {isEv && evLevelShown && <th scope="col" className="px-3 py-3 font-semibold sm:px-4">Niveau 2</th>}
                      <th scope="col" className="px-3 py-3 font-semibold sm:px-4">À partir de</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shownRows.map((row) => (
                      <tr key={row.href} className="border-t border-[var(--border-1)]">
                        <th scope="row" className="px-3 py-3 font-semibold sm:px-4"><Link href={row.href} className="text-[var(--fg-1)] underline-offset-2 hover:underline">{fr(row.label)}</Link>{row.note && <span className="block text-[13px] font-normal text-[var(--fg-3)]">{fr(row.note)}</span>}</th>
                        <td className="px-3 py-3 tabular-nums sm:px-4">{row.count}</td>
                        {showYear && <td className="px-3 py-3 tabular-nums sm:px-4">{row.yearRound > 0 ? row.yearRound : "—"}</td>}
                        {showFreeCol && <td className="px-3 py-3 tabular-nums sm:px-4">{row.dogFree > 0 ? row.dogFree : "—"}</td>}
                        {isSauna && <td className="px-3 py-3 tabular-nums sm:px-4">{row.saunaSpa > 0 ? row.saunaSpa : "—"}</td>}
                        {isBillard && <td className="px-3 py-3 tabular-nums sm:px-4">{row.groupes > 0 ? row.groupes : "—"}</td>}
                        {isEv && evLevelShown && <td className="px-3 py-3 tabular-nums sm:px-4">{row.ev2 > 0 ? row.ev2 : "—"}</td>}
                        <td className="px-3 py-3 tabular-nums sm:px-4">{row.from !== null ? fr(`${money(row.from)}/nuit`) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-sm text-[var(--fg-3)]">{fr(`Prix de départ moyens des fiches actives avec prix affiché. Mis à jour le ${updated}.`)}</p>
              {(isSauna || isBillard) && level === "national" && elsewhere.length > 0 && (
                <p className="mt-2 text-sm text-[var(--fg-2)]">{fr(`Ailleurs au Québec : ${joinFr(elsewhere)}.`)}</p>
              )}
              {alsoRows.length > 0 && (
                <p className="mt-2 text-sm text-[var(--fg-2)]">
                  {fr("Aussi :")}{" "}
                  {alsoRows.map((row, i) => (
                    <span key={row.href}>{i > 0 && ", "}<Link href={row.href} className="font-semibold underline underline-offset-2">{fr(row.label)}</Link></span>
                  ))}
                </p>
              )}
            </>
          )}

          {level === "city" && region && siblingCities.length > 0 && (
            <p className="mt-4 text-sm text-[var(--fg-2)]">
              {fr(`Autres villes ${region.locative} :`)}{" "}
              {siblingCities.slice(0, 8).map((c, i) => (
                <span key={c.city}>{i > 0 && ", "}<Link href={cityHref(c.region, c.city)} className="font-semibold underline underline-offset-2">{fr(c.city)}</Link></span>
              ))}
            </p>
          )}
          {level !== "national" && stats.count < 3 && (
            <p className="mt-4 text-sm text-[var(--fg-2)]">
              <Link href={themePath({ theme })} className="font-semibold underline underline-offset-2">{fr(`Voir tous les ${theme.labelPlural} au Québec`)}</Link>
            </p>
          )}
        </section>

        {/* ── 4a. Bloc éditorial de la région (pages région seulement) ── */}
        {level === "region" && regionText && (
          <section className={`${WRAP} mt-16`}>
            <h2 className="text-[length:clamp(26px,3.2vw,40px)] font-extrabold leading-tight tracking-[-0.04em] text-[var(--fg-1)]">
              {fr(`${theme.regionBlockTitle ?? theme.label} ${place}`)}
            </h2>
            <p className="mt-4 max-w-[70ch] text-base leading-relaxed text-[var(--fg-2)]">{fr(regionText)}</p>
            <p className="mt-4 text-[15px] text-[var(--fg-2)]">{fr(regionFigures.join(" · "))}</p>
          </section>
        )}

        {/* ── 4b. Guide éditorial (page nationale seulement) ── */}
        {guide && (
          <section className={`${WRAP} mt-16`}>
            <div className="grid gap-8 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
              <div className="lg:sticky lg:top-24 lg:self-start">
                <h2 className="text-[length:clamp(26px,3.2vw,40px)] font-extrabold leading-tight tracking-[-0.04em] text-[var(--fg-1)]">{fr(guide.title)}</h2>
                <p className="mt-3 text-sm text-[var(--fg-3)]">Guide rédigé par l’équipe Kabanalouer</p>
                {guide.intro && <p className="mt-4 text-base leading-relaxed text-[var(--fg-2)]">{fr(guide.intro)}</p>}
              </div>
              <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2">
                {guide.blocks.map((b) => (
                  <div key={b.h3}>
                    <h3 className="text-lg font-bold leading-snug text-[var(--fg-1)]">{fr(b.h3)}</h3>
                    <p className="mt-2 text-base leading-relaxed text-[var(--fg-2)]">{fr(b.p)}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── 5. Villes ── */}
        {level !== "city" && stats.byCity.length > 0 && (
          <section className={`${WRAP} mt-16`}>
            <h2 className="text-[length:clamp(24px,2.8vw,34px)] font-extrabold leading-tight tracking-[-0.04em] text-[var(--fg-1)]">
              {fr(`${theme.labelPlural.charAt(0).toUpperCase()}${theme.labelPlural.slice(1)} par ville`)}
            </h2>
            <ul className="mt-5 flex flex-wrap gap-2">
              {stats.byCity.slice(0, 30).map((c) => (
                <li key={`${c.region}|${c.city}`}>
                  <Link href={cityHref(c.region, c.city)} className={`${CHIP} ${CHIP_IDLE}`}>{fr(`${c.city} · ${c.count}`)}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── 6. FAQ ── */}
        {faq.length > 0 && (
          <section className={`${WRAP} mt-16`}>
            <h2 className="text-[length:clamp(24px,2.8vw,34px)] font-extrabold leading-tight tracking-[-0.04em] text-[var(--fg-1)]">Questions fréquentes</h2>
            <div className="mt-5 max-w-[820px] divide-y divide-[var(--border-1)] border-y border-[var(--border-1)]">
              {faq.map((f, i) => (
                <details key={f.q} className="group py-4" {...(i === 0 ? { open: true } : {})}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-[var(--fg-1)] [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span aria-hidden="true" className="text-xl text-[var(--fg-3)] transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-base leading-relaxed text-[var(--fg-2)]"><Rich text={f.a} /></p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* ── 7. Autres thèmes ── */}
        {otherThemes.length > 0 && (
          <section className={`${WRAP} mt-16`}>
            <h2 className="text-lg font-bold text-[var(--fg-1)]">{fr(level === "national" ? "Autres types de chalets" : `Autres types de chalets ${place}`)}</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {otherThemes.map((o) => (
                <li key={o.href}><Link href={o.href} className={`${CHIP} ${CHIP_IDLE}`}>{fr(o.label)}</Link></li>
              ))}
            </ul>
          </section>
        )}

        {/* ── 8. Bannière proprios mince ── */}
        <div className={`${WRAP} mt-16`}>
          <OwnersSlimBanner title={fr(theme.titleOwner)} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
