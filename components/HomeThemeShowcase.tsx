import Link from "next/link";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { normalizePhotos } from "@/lib/photo";
import { localePath } from "@/lib/localePath";
import { getAmenityLabels, type AmenityValue } from "@/lib/amenities-catalog";
import { PROMO_DISPLAY_COLUMNS, visiblePromoFilter } from "@/lib/promoLabel";
import { AMENITY_LANDINGS, countAmenityLandingsWith, listingMatchesLanding, type AmenityLandingKey } from "@/lib/amenityLandings";
import ShowcaseCarousel from "@/components/home/ShowcaseCarousel";
import { CarouselCard, FeaturedCard, RowCard, SmallCard, type ShowcaseListing } from "@/components/home/ShowcaseParts";

// Trois rangées de l'accueil (option 2b, 2026-11-27) : bord de l'eau (carrousel), spa (coup de cœur + grille),
// télétravail (intro + liste). Les chalets sont choisis comme avant (2026-10-25) : revendiquées d'abord, puis meilleur
// score, puis plus récentes ; un chalet déjà choisi est écarté des thèmes suivants, sauf pour compléter les 3 premiers.
// Les 3 premiers de chaque thème sont donc les mêmes qu'avant ; les rangées plus fournies (8 pour le bord de l'eau, 5 pour
// le spa) prolongent la même liste, sans doublon entre les thèmes.

export const SHOWCASE_THEMES = ["waterfront", "spa", "remote-work"] as const satisfies readonly AmenityLandingKey[];
type ThemeKey = (typeof SHOWCASE_THEMES)[number];
const BASE_PER_THEME = 3;
const TARGET: Record<ThemeKey, number> = { waterfront: 8, spa: 5, "remote-work": 3 };

const TEXTS: Record<ThemeKey, { titleFr: string; titleEn: string }> = {
  waterfront: { titleFr: "Location de chalet au bord de l’eau", titleEn: "Waterfront cabin rentals" },
  spa: { titleFr: "Location de chalet avec spa", titleEn: "Cabin rentals with a hot tub" },
  "remote-work": { titleFr: "Location de chalet pour le télétravail", titleEn: "Cabin rentals for remote work" },
};

const CARD_COLUMNS = "id, title, title_en, region, city, price_low, price_on_request, capacity, bedrooms, photos, amenities, listing_number, custom_slug";

// H2 SEO : taille display, 800, interlettrage -0,04em, interligne 1.
const H2_CLASS = "text-[length:var(--fs-display)] font-extrabold tracking-[-0.04em] leading-none text-charcoal-800";
const SECTION_GAP = "pt-[clamp(64px,8vw,96px)]";

export default async function HomeThemeShowcase({ userId }: { userId: string | null }) {
  const [supabase, locale] = await Promise.all([createClient(), getLocale()]);
  const isEn = locale === "en";

  // Léger d'abord (id + équipements) : on choisit les gagnants avant de charger les photos.
  const [{ data: ranked }, counts] = await Promise.all([
    supabase
      .from("listings")
      .select("id, amenities, unclaimed_rank")
      .eq("is_published", true)
      .eq("is_test", false)
      .order("unclaimed_rank", { ascending: true })
      .order("score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(300),
    // Même source que les pages catégorie (« N chalets ») ; sans réponse, le lien devient « Voir tous les chalets → ».
    countAmenityLandingsWith(supabase).catch(() => null),
  ]);

  // 1re passe : jamais le même chalet deux fois. 2e passe : un thème qui n'a pas ses 3 chalets reprend, dans
  // l'ordre du classement, des chalets déjà présentés ailleurs (décision de Simon, 2026-10-25).
  // Bord de l'eau : revendiquées d'abord (même avec seulement un accès), puis dans chaque groupe directement sur l'eau
  // (bord-eau) avant accès seulement ; le score et la date restent l'ordre à égalité (tri stable).
  const candidatesFor = (key: string) => {
    const landing = AMENITY_LANDINGS.find((l) => l.key === key)!;
    const rows = (ranked ?? []).filter((r) => listingMatchesLanding(r.amenities, landing));
    if (key !== "waterfront") return rows;
    const direct = (r: { amenities: unknown }) => (Array.isArray(r.amenities) && (r.amenities as { id?: string }[]).some((a) => a?.id === "bord-eau") ? 0 : 1);
    return [...rows].sort((a, b) => (a.unclaimed_rank as number) - (b.unclaimed_rank as number) || direct(a) - direct(b));
  };
  const used = new Set<string>();
  const lists = SHOWCASE_THEMES.map((key) => ({ key, landing: AMENITY_LANDINGS.find((l) => l.key === key)!, ids: [] as string[], rows: candidatesFor(key) }));
  for (const list of lists) {
    for (const row of list.rows) {
      if (list.ids.length >= BASE_PER_THEME) break;
      const id = row.id as string;
      if (used.has(id)) continue;
      list.ids.push(id);
      used.add(id);
    }
  }
  for (const list of lists) {
    for (const row of list.rows) {
      if (list.ids.length >= BASE_PER_THEME) break;
      const id = row.id as string;
      if (list.ids.includes(id)) continue;
      list.ids.push(id);
    }
  }
  // Prolongement : les rangées plus fournies continuent la même liste, sans reprendre un chalet déjà choisi.
  for (const list of lists) {
    for (const row of list.rows) {
      if (list.ids.length >= TARGET[list.key]) break;
      const id = row.id as string;
      if (used.has(id)) continue;
      list.ids.push(id);
      used.add(id);
    }
  }
  const picks = lists.filter((p) => p.ids.length > 0);
  if (picks.length === 0) return null;

  const today = new Date().toISOString().split("T")[0];
  const allIds = [...new Set(picks.flatMap((p) => p.ids))];
  const [{ data: rows }, { data: promos }] = await Promise.all([
    supabase.from("listings").select(CARD_COLUMNS).eq("is_published", true).in("id", allIds),
    supabase.from("promotions").select(`listing_id, ${PROMO_DISPLAY_COLUMNS}`).in("listing_id", allIds).eq("is_active", true).or(visiblePromoFilter(today)),
  ]);
  const promoMap = new Map((promos ?? []).map((p) => [p.listing_id as string, p]));
  const byId = new Map((rows ?? []).map((l) => [l.id as string, l]));

  const toCard = (id: string): ShowcaseListing | null => {
    const l = byId.get(id);
    if (!l) return null;
    return {
      id: l.id as string,
      title: (isEn && (l.title_en as string | null)) || ((l.title as string | null) ?? ""),
      region: (l.region as string | null) ?? "",
      city: (l.city as string | null) ?? null,
      listing_number: (l.listing_number as number | null) ?? null,
      custom_slug: (l.custom_slug as string | null) ?? null,
      price: (l.price_low as number) ?? 0,
      priceOnRequest: (l.price_on_request as boolean) ?? false,
      capacity: (l.capacity as number) ?? 1,
      bedrooms: (l.bedrooms as number) ?? 1,
      photos: normalizePhotos(l.photos).map((p) => p.url),
      tags: Array.isArray(l.amenities) ? getAmenityLabels(l.amenities as AmenityValue[], locale).slice(0, 3) : [],
      hasPromo: promoMap.has(id),
      promoData: (promoMap.get(id) as unknown as ShowcaseListing["promoData"]) ?? null,
    };
  };

  // En-tête commun : H2 SEO, puis le lien sous le titre (6 px) avec le vrai nombre de chalets de la catégorie.
  const header = (key: ThemeKey, href: string) => {
    const n = counts?.[key];
    const label = n && n > 0 ? (isEn ? `See all ${n} cabins →` : `Voir les ${n} chalets →`) : isEn ? "See all cabins →" : "Voir tous les chalets →";
    return (
      <>
        <h2 className={H2_CLASS}>{isEn ? TEXTS[key].titleEn : TEXTS[key].titleFr}</h2>
        <Link href={href} className="mt-1.5 inline-block text-[15px] font-bold text-link hover:text-action-hover transition-colors">
          {label}
        </Link>
      </>
    );
  };

  return (
    <>
      {picks.map(({ key, landing, ids }) => {
        const cards = ids.map(toCard).filter((c): c is ShowcaseListing => c !== null);
        if (cards.length === 0) return null;
        const href = localePath(isEn ? landing.pathEn : landing.pathFr, locale);

        if (key === "waterfront") {
          return (
            <section key={key} className={SECTION_GAP}>
              <ShowcaseCarousel
                header={header(key, href)}
                prevLabel={isEn ? "Previous cabins" : "Chalets précédents"}
                nextLabel={isEn ? "Next cabins" : "Chalets suivants"}
              >
                {cards.map((c) => (
                  <CarouselCard key={c.id} listing={c} locale={locale} userId={userId} />
                ))}
              </ShowcaseCarousel>
            </section>
          );
        }

        if (key === "spa") {
          // Coup de cœur : le chalet marqué `featured` s'il y en a un, sinon le premier de la liste.
          const featured = cards.find((c) => c.featured) ?? cards[0];
          const others = cards.filter((c) => c.id !== featured.id).slice(0, 4);
          return (
            <section key={key} className={`show-wrap ${SECTION_GAP}`}>
              <div className="show-inner">
                <div className="mb-6 sm:mb-8">{header(key, href)}</div>
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                  <FeaturedCard listing={featured} locale={locale} userId={userId} />
                  {others.length > 0 && (
                    <div className="show-rail lg:content-start lg:gap-y-6">
                      {others.map((c) => (
                        <SmallCard key={c.id} listing={c} locale={locale} userId={userId} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          );
        }

        // Télétravail : section pleine largeur sur fond gris clair, intro à gauche et liste horizontale à droite.
        return (
          <section key={key} className="mt-[clamp(64px,8vw,96px)] bg-charcoal-50 py-[clamp(56px,7vw,72px)]">
            <div className="mx-auto max-w-[1280px] px-[clamp(16px,4vw,56px)] grid gap-8 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-12">
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-primary">
                  {isEn ? "Reliable Wi-Fi · work space" : "Wi-Fi fiable · espace bureau"}
                </p>
                {header(key, href)}
                <p className="mt-5 max-w-[56ch] text-base leading-relaxed text-charcoal-600">
                  {isEn
                    ? "Work by day, enjoy the lake in the evening. Cabins with high-speed Internet and a real home-office nook."
                    : "Travaillez de jour, profitez du lac le soir. Des chalets avec Internet haute vitesse et un vrai coin bureau."}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                {cards.slice(0, 3).map((c) => (
                  <RowCard key={c.id} listing={c} locale={locale} userId={userId} />
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
}
