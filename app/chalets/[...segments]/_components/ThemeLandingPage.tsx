import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ListingCard, { type Listing } from "@/components/ListingCard";
import OwnersSlimBanner from "@/components/chalets/OwnersSlimBanner";
import { fr } from "@/lib/frTypography";
import { safeJsonLd } from "@/lib/jsonLd";
import { SITE_URL } from "@/lib/siteUrl";
import { buildListingPath } from "@/lib/listingUrl";
import { slugify } from "@/lib/slugify";
import { getRegionByDbValue } from "@/lib/regions";
import { comboLinkLabel, comboPath, activeThemesInCity, activeThemesInRegion, getComboIndex, COMBO_THEMES, MIN_LISTINGS_FOR_COMBO } from "@/lib/comboLandings";
import { accessBadge, pickDiverse, visibleAccessChips, type AccessKey, type ThemeRow } from "@/lib/themeStats";
import { themePath, placeOf, type ThemeScope } from "@/lib/themeRouting";
import { TO_PROVIDE } from "@/content/themes/types";

// Gabarit unique des pages thème (national, thème × région, thème × ville) : /chalets/bord-de-l-eau…
// Tout le contenu est rendu côté serveur. Seules les 24 fiches affichées sont chargées dans la page.

const WRAP = "mx-auto w-full max-w-[1360px] px-[clamp(16px,4vw,56px)]";
const HOME_DISTANCE_KM = { lat: 45.5017, lng: -73.5673 }; // Montréal
const CHIP = "flex-none whitespace-nowrap rounded-[var(--radius-pill)] px-4 py-[9px] min-h-11 sm:min-h-10 inline-flex items-center text-sm font-semibold transition-colors";
const CHIP_IDLE = "border border-[var(--border-2)] bg-white text-[var(--fg-1)] hover:border-charcoal-400";
const CHIP_ACTIVE = "border border-[var(--fg-1)] bg-[var(--fg-1)] text-white";

const ACCESS_LABEL: Record<AccessKey, string> = {
  direct: "Directement au bord de l'eau",
  lake: "Accès au lac",
  beach: "Avec plage",
  boats: "Embarcations incluses",
};

const money = (n: number) => `${n} $`;
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

export default async function ThemeLandingPage({ scope, acces }: { scope: ThemeScope; acces?: string }) {
  const { target, stats, national, scoped } = scope;
  const { theme, region, city } = target;
  const level = city ? "city" : region ? "region" : "national";
  const place = placeOf(target);
  const here = themePath(target);
  const guide = theme.guide === TO_PROVIDE ? null : theme.guide;
  const faqSource = theme.faq === TO_PROVIDE ? [] : theme.faq;

  const chips = visibleAccessChips(stats);
  const active = chips.includes(acces as AccessKey) ? (acces as AccessKey) : null;
  const filtered = active ? scoped.filter((r) => r[active]) : scoped;
  const picked = pickDiverse(filtered);
  const regionName = (db: string) => getRegionByDbValue(db);
  const cityHref = (db: string, c: string) => `/chalets/${theme.slug}/${regionName(db)?.slug}/${slugify(c)}`;
  const regionHref = (db: string) => `/chalets/${theme.slug}/${regionName(db)?.slug}`;

  // ── Intro « réponse directe » ──
  const topPlaces =
    level === "national"
      ? stats.byRegion.slice(0, 3).map((r) => regionName(r.region)?.locative ?? "")
      : level === "region"
        ? stats.byCity.slice(0, 3).map((c) => `à ${c.city}`)
        : [];
  const searchHref = `/chalets?${new URLSearchParams({ theme: theme.slug, ...(region ? { region: region.dbValue } : {}), ...(city ? { city } : {}) }).toString()}`;

  // ── Variables de la FAQ ──
  const countIn = (slug: string) => national.byRegion.find((r) => regionName(r.region)?.slug === slug)?.count ?? 0;
  const quebecCities = national.byCity.filter((c) => regionName(c.region)?.slug === "quebec").slice(0, 3).map((c) => c.city);
  const siblingCities = (level === "city" ? scope.regionStats?.byCity.filter((c) => c.city !== city) : stats.byCity) ?? [];
  const topVilles = siblingCities.slice(0, 5).map((c, i) => `${c.city} (${c.count}${i === 0 ? " chalets" : ""})`).join(", ");
  const dogsLink = stats.dogs > 0
    ? `[Voir les chalets au bord de l'eau qui acceptent les chiens](${searchHref}&dogs=1)`
    : "[chalets qui acceptent les chiens](/chalets/chiens-acceptes)";
  const vars: Record<string, string> = {
    N: String(stats.count),
    lieu: place,
    prixMin: stats.priceMin !== null ? String(stats.priceMin) : "—",
    prixP10: stats.priceP10 !== null ? String(stats.priceP10) : "—",
    prixP90: stats.priceP90 !== null ? String(stats.priceP90) : "—",
    nLaurentides: String(countIn("laurentides")),
    nLanaudiere: String(countIn("lanaudiere")),
    nQuebec: String(countIn("quebec")),
    villesMontreal: joinFr(citiesNearMontreal(scope)),
    villesQuebec: joinFr(quebecCities),
    topVilles,
    nChiens: String(stats.dogs),
    lienChiens: dogsLink,
  };
  const faq = faqSource
    .filter((f) => (f.scope === "national" ? level === "national" : f.scope === "local" ? level !== "national" && siblingCities.length > 0 : true))
    .map((f) => ({
      q: fr(fill(f.q, vars)),
      a: fr(fill(stats.dogs === 0 && f.aNone ? f.aNone : f.a, vars)),
    }));

  // ── Paragraphe éditorial du tableau ──
  const top3 = stats.byRegion.slice(0, 3).map((r) => regionName(r.region)?.slug);
  const expected = ["quebec", "laurentides", "lanaudiere"];
  const topRegionsParagraph =
    top3.length === 3 && expected.every((s) => top3.includes(s))
      ? "La région de Québec, les Laurentides et Lanaudière regroupent la majorité des chalets au bord de l'eau sur Kabanalouer."
      : `${joinFr(stats.byRegion.slice(0, 3).map((r) => regionName(r.region)?.name ?? r.region))} regroupent le plus de chalets au bord de l'eau sur Kabanalouer.`;
  const regionIntro = region ? theme.regionIntro?.[region.slug] : undefined;
  const accessSentence = `${stats.byAccess.direct} sont directement sur la rive et ${stats.byAccess.lake} ont un accès à un lac.`;

  // ── Tableau (régions ou villes) ──
  const tableRows =
    level === "national"
      ? national.byRegion.filter((r) => r.count >= 3).map((r) => ({ label: regionName(r.region)?.name ?? r.region, href: regionHref(r.region), count: r.count, from: r.priceFrom }))
      : level === "region"
        ? stats.byCity.map((c) => ({ label: c.city, href: cityHref(c.region, c.city), count: c.count, from: c.priceFrom }))
        : [];
  const shownRows = tableRows.slice(0, 6);
  const alsoRows = tableRows.slice(6);

  // ── Autres thèmes, même niveau géographique (seulement les pages actives) ──
  const comboIndex = await getComboIndex();
  const otherThemes: { label: string; href: string }[] = [];
  if (level === "national") {
    for (const ct of COMBO_THEMES) {
      if (ct.slugFr === theme.slug || ct.key === "waterfront") continue;
      const total = Object.values(comboIndex.region).reduce((s, r) => s + (r[ct.key] ?? 0), 0);
      if (total >= MIN_LISTINGS_FOR_COMBO) otherThemes.push({ label: ct.linkFr, href: ct.parentPathFr });
    }
  } else if (region) {
    const links = city ? activeThemesInCity(comboIndex, region, city) : activeThemesInRegion(comboIndex, region);
    for (const l of links) if (l.theme.key !== "waterfront") otherThemes.push({ label: comboLinkLabel(l, false, { withPlace: false }), href: comboPath(l.theme, l.region, l.city, false) });
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
  const tiles = [
    { value: String(stats.count), label: "chalets" },
    stats.priceMin !== null ? { value: money(stats.priceMin), label: "prix de départ le plus bas" } : null,
    level === "city"
      ? null
      : level === "region"
        ? { value: String(stats.citiesCount), label: stats.citiesCount > 1 ? "villes" : "ville" }
        : { value: String(stats.regionsCount), label: stats.regionsCount > 1 ? "régions" : "région" },
    stats.guestsMin !== null && stats.guestsMax !== null ? { value: `${stats.guestsMin} à ${stats.guestsMax}`, label: "voyageurs" } : null,
  ].filter((t): t is { value: string; label: string } => !!t);

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
              <p className="mt-5 max-w-[62ch] text-[17px] leading-relaxed text-[var(--fg-2)]">
                {fr("Kabanalouer compte ")}
                <strong className="font-bold text-[var(--fg-1)]">{fr(`${stats.count} ${theme.labelPlural}`)}</strong>
                {fr(` à louer ${place}${topPlaces.length > 0 ? `, surtout ${joinFr(topPlaces)}` : ""}. `)}
                {stats.priceMin !== null && (
                  <>
                    {fr("Les prix de départ commencent à ")}
                    <strong className="font-bold text-[var(--fg-1)]">{fr(`${stats.priceMin} $/nuit`)}</strong>
                    {fr(". ")}
                  </>
                )}
                {fr("Vous écrivez directement au propriétaire, sans frais de service.")}
              </p>
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
              {chips.map((k) => {
                const n = k === "direct" ? stats.byAccess.direct : k === "lake" ? stats.byAccess.lake : k === "beach" ? stats.byAccess.beach : stats.byAccess.boats;
                return (
                  <Link key={k} href={`${here}?acces=${k}`} scroll={false} className={`${CHIP} ${active === k ? CHIP_ACTIVE : CHIP_IDLE}`} aria-current={active === k ? "true" : undefined}>
                    {fr(`${ACCESS_LABEL[k]} · ${n}`)}
                  </Link>
                );
              })}
            </div>
          )}
        </header>

        {/* ── 2. Grille de fiches ── */}
        <section className={`${WRAP} mt-8`} aria-label="Chalets">
          <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {picked.map((r, i) => (
              <ListingCard key={r.id} listing={toCardListing(r)} priority={i < 4} themeBadge={fr(accessBadge(r))} />
            ))}
          </div>
          <div className="mt-10 flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-[var(--fg-3)]">{fr(`${picked.length} sur ${filtered.length} chalets`)}</p>
            <Link href={searchHref} className="rounded-[var(--radius-sm)] bg-[var(--fg-1)] px-7 py-[15px] text-[15px] font-bold text-white hover:opacity-90">
              {fr(`Voir les ${stats.count} ${theme.labelPlural}`)}
            </Link>
          </div>
        </section>

        {/* ── 3. Tableau par région ou par ville, ou données de la ville ── */}
        <section className={`${WRAP} mt-16`}>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--fg-3)]">Données Kabanalouer</p>
          <h2 className="mt-2 text-[length:clamp(26px,3.2vw,40px)] font-extrabold leading-tight tracking-[-0.04em] text-[var(--fg-1)]">
            {fr(`Où louer un chalet ${theme.label} ${place} ?`)}
          </h2>
          <p className="mt-4 max-w-[70ch] text-base leading-relaxed text-[var(--fg-2)]">
            {level === "national"
              ? fr(fill(theme.nationalRegionParagraph ?? "", { topRegionsParagraph }))
              : level === "region"
                ? fr(regionIntro ?? `Voici les villes ${place} qui comptent le plus de ${theme.labelPlural}, classées par nombre de chalets.`)
                : fr(`${city} compte ${stats.count} ${theme.labelPlural}${stats.priceMin !== null ? `, à partir de ${stats.priceMin} $/nuit` : ""}${stats.guestsMin !== null ? `, pour ${stats.guestsMin} à ${stats.guestsMax} voyageurs` : ""}. ${accessSentence}`)}
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
                      <th scope="col" className="px-3 py-3 font-semibold sm:px-4">À partir de</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shownRows.map((row) => (
                      <tr key={row.href} className="border-t border-[var(--border-1)]">
                        <th scope="row" className="px-3 py-3 font-semibold sm:px-4"><Link href={row.href} className="text-[var(--fg-1)] underline-offset-2 hover:underline">{fr(row.label)}</Link></th>
                        <td className="px-3 py-3 tabular-nums sm:px-4">{row.count}</td>
                        <td className="px-3 py-3 tabular-nums sm:px-4">{row.from !== null ? fr(`${money(row.from)}/nuit`) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-sm text-[var(--fg-3)]">{fr(`Prix de départ moyens des fiches actives avec prix affiché. Mis à jour le ${updated}.`)}</p>
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

        {/* ── 4. Guide éditorial ── */}
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
