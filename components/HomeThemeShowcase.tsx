import Link from "next/link";
import { getLocale } from "next-intl/server";
import ListingCard, { type Listing } from "@/components/ListingCard";
import { createClient } from "@/lib/supabase/server";
import { normalizePhotos } from "@/lib/photo";
import { localePath } from "@/lib/localePath";
import { getAmenityLabels, type AmenityValue } from "@/lib/amenities-catalog";
import { PROMO_DISPLAY_COLUMNS, visiblePromoFilter } from "@/lib/promoLabel";
import { AMENITY_LANDINGS, listingMatchesLanding, type AmenityLandingKey } from "@/lib/amenityLandings";

// Première section de l'accueil (2026-10-25, demande de Simon) : remplace « Nouveaux chalets ». Les 3 meilleurs
// chalets de trois thèmes (bord de l'eau, spa, télétravail), chacun avec un lien vers tous les chalets du thème.
// Même ordre que partout : revendiquées d'abord, puis meilleur score, puis plus récentes. Un chalet n'apparaît
// deux fois que si un thème n'a pas assez de chalets autrement : les thèmes sont servis dans l'ordre et un chalet
// déjà choisi est écarté des suivants, sauf pour compléter à 3.

export const SHOWCASE_THEMES = ["waterfront", "spa", "remote-work"] as const satisfies readonly AmenityLandingKey[];
const PER_THEME = 3;

const TEXTS: Record<(typeof SHOWCASE_THEMES)[number], { titleFr: string; titleEn: string; allFr: string; allEn: string }> = {
  waterfront: { titleFr: "Location de chalet au bord de l’eau", titleEn: "Waterfront cabin rentals", allFr: "Voir tous les chalets au bord de l’eau", allEn: "See all waterfront cabins" },
  spa: { titleFr: "Location de chalet avec spa", titleEn: "Cabin rentals with a hot tub", allFr: "Voir tous les chalets avec spa", allEn: "See all cabins with a hot tub" },
  "remote-work": { titleFr: "Location de chalet pour le télétravail", titleEn: "Cabin rentals for remote work", allFr: "Voir tous les chalets pour le télétravail", allEn: "See all cabins for remote work" },
};

const CARD_COLUMNS = "id, title, title_en, region, city, price_low, price_on_request, capacity, bedrooms, photos, amenities, listing_number, custom_slug";

export default async function HomeThemeShowcase({ userId }: { userId: string | null }) {
  const [supabase, locale] = await Promise.all([createClient(), getLocale()]);
  const isEn = locale === "en";

  // Léger d'abord (id + équipements) : on choisit les 9 gagnants avant de charger les photos.
  const { data: ranked } = await supabase
    .from("listings")
    .select("id, amenities")
    .eq("is_published", true)
    .eq("is_test", false)
    .order("unclaimed_rank", { ascending: true })
    .order("score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(300);

  // 1re passe : jamais le même chalet deux fois. 2e passe : un thème qui n'a pas ses 3 chalets reprend, dans
  // l'ordre du classement, des chalets déjà présentés ailleurs (décision de Simon, 2026-10-25).
  // Bord de l'eau : directement sur l'eau (bord-eau) avant ceux qui ont seulement un accès (tri stable).
  const candidatesFor = (key: string) => {
    const landing = AMENITY_LANDINGS.find((l) => l.key === key)!;
    const rows = (ranked ?? []).filter((r) => listingMatchesLanding(r.amenities, landing));
    if (key !== "waterfront") return rows;
    const direct = (r: { amenities: unknown }) => (Array.isArray(r.amenities) && (r.amenities as { id?: string }[]).some((a) => a?.id === "bord-eau") ? 0 : 1);
    return [...rows].sort((a, b) => direct(a) - direct(b));
  };
  const used = new Set<string>();
  const lists = SHOWCASE_THEMES.map((key) => ({ key, landing: AMENITY_LANDINGS.find((l) => l.key === key)!, ids: [] as string[], rows: candidatesFor(key) }));
  for (const list of lists) {
    for (const row of list.rows) {
      if (list.ids.length >= PER_THEME) break;
      const id = row.id as string;
      if (used.has(id)) continue;
      list.ids.push(id);
      used.add(id);
    }
  }
  for (const list of lists) {
    for (const row of list.rows) {
      if (list.ids.length >= PER_THEME) break;
      const id = row.id as string;
      if (list.ids.includes(id)) continue;
      list.ids.push(id);
    }
  }
  const picks = lists.filter((p) => p.ids.length > 0);
  if (picks.length === 0) return null;

  const today = new Date().toISOString().split("T")[0];
  const [{ data: rows }, { data: promos }] = await Promise.all([
    supabase.from("listings").select(CARD_COLUMNS).eq("is_published", true).in("id", [...used]),
    supabase.from("promotions").select(`listing_id, ${PROMO_DISPLAY_COLUMNS}`).in("listing_id", [...used]).eq("is_active", true).or(visiblePromoFilter(today)),
  ]);
  const promoMap = new Map((promos ?? []).map((p) => [p.listing_id as string, p]));
  const byId = new Map((rows ?? []).map((l) => [l.id as string, l]));

  const toCard = (id: string): Listing | null => {
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
      promoData: (promoMap.get(id) as unknown as Listing["promoData"]) ?? null,
    };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 w-full flex flex-col gap-16">
      {picks.map(({ key, landing, ids }) => {
        const text = TEXTS[key];
        const cards = ids.map(toCard).filter((c): c is Listing => c !== null);
        const href = localePath(isEn ? landing.pathEn : landing.pathFr, locale);
        return (
          <section key={key}>
            <div className="flex items-end justify-between gap-4 mb-8">
              <h2 className="text-3xl font-bold text-charcoal-800 tracking-h2 leading-snug">{isEn ? text.titleEn : text.titleFr}</h2>
              <Link href={href} className="text-charcoal-800 font-medium text-sm underline underline-offset-4 hover:text-primary transition-colors hidden md:block whitespace-nowrap">
                {isEn ? text.allEn : text.allFr} →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
              {cards.map((listing) => (
                <ListingCard key={listing.id} listing={listing} currentUserId={userId} />
              ))}
            </div>
            <div className="mt-8 flex justify-center md:hidden">
              <Link href={href} className="text-charcoal-800 font-medium text-sm underline underline-offset-4">
                {isEn ? text.allEn : text.allFr} →
              </Link>
            </div>
          </section>
        );
      })}
    </div>
  );
}
