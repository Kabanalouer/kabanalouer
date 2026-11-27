import Image from "next/image";
import Link from "next/link";
import FavoriteButton from "@/components/chalets/FavoriteButton";
import type { Listing } from "@/components/ListingCard";
import { splitListingTitle } from "@/lib/splitListingTitle";
import { buildListingPath } from "@/lib/listingUrl";
import { localePath } from "@/lib/localePath";
import { getRegionByDbValue } from "@/lib/regions";
import { formatPrice } from "@/lib/formatPrice";
import { formatPromoLines, isLastminuteVisible } from "@/lib/promoLabel";

// Cartes de l'accueil (option 2b) : bord de l'eau (carrousel), spa (coup de cœur + grille), télétravail (liste).
// Présentation seulement : les chalets affichés viennent de HomeThemeShowcase, inchangés.

// L'ordre des chalets vient toujours de l'algorithme de classement (HomeThemeShowcase) : aucun réglage manuel.
export type ShowcaseListing = Listing;

const FALLBACK_PHOTO = "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80";

function cardData(listing: ShowcaseListing, locale: string) {
  const isEn = locale === "en";
  const { name, tagline } = splitListingTitle(listing.title);
  const regionLabel = isEn ? getRegionByDbValue(listing.region)?.nameEn ?? listing.region : listing.region;
  const location = listing.city?.trim() || regionLabel;
  const href =
    buildListingPath(
      { region: listing.region, city: listing.city ?? null, listing_number: listing.listing_number ?? null, custom_slug: listing.custom_slug ?? null },
      isEn ? "en" : "fr"
    ) ?? localePath(`/chalets/${listing.id}`, locale);
  const photo = listing.photos[0] ?? FALLBACK_PHOTO;
  const guests = isEn ? `${listing.capacity} guests` : `${listing.capacity} voyageurs`;
  const guestsShort = isEn ? `${listing.capacity} guests` : `${listing.capacity} voy.`;
  const rooms = isEn ? `${listing.bedrooms} bd.` : `${listing.bedrooms} ch.`;
  return { isEn, name, tagline, location, href, photo, guests, guestsShort, rooms };
}

// Espace insécable avant le « $ » en français (jamais un « $ » seul en début de ligne).
function priceText(listing: ShowcaseListing, locale: string) {
  return formatPrice(listing.price, locale).replace(" $", " $");
}

function Price({ listing, locale, className = "", onDark = false }: { listing: ShowcaseListing; locale: string; className?: string; onDark?: boolean }) {
  const isEn = locale === "en";
  if (listing.priceOnRequest) {
    return (
      <span className={`font-bold ${className} ${onDark ? "text-white" : "text-action"}`}>
        {isEn ? "Request a price →" : "Demander un prix →"}
      </span>
    );
  }
  if (listing.price > 0) {
    return (
      <span className={`${onDark ? "" : "text-charcoal-800"} ${className}`}>
        <b className="font-bold">{priceText(listing, locale)}</b>{" "}
        <span className={onDark ? "text-white/80" : "text-charcoal-400"}>{isEn ? "/night" : "/nuit"}</span>
      </span>
    );
  }
  return null;
}

// Pastille en haut à gauche de la photo : promo = highlight, dernière minute = bg-inverse.
function PromoBadge({ listing, locale }: { listing: ShowcaseListing; locale: string }) {
  if (!listing.hasPromo || !listing.promoData || !isLastminuteVisible(listing.promoData, null)) return null;
  const lastMinute = listing.promoData.type.startsWith("lastminute");
  return (
    <span
      className={`absolute top-3 left-3 z-10 text-xs font-bold px-3 py-1 rounded-[var(--radius-pill)] text-white ${lastMinute ? "bg-inverse" : "bg-highlight"}`}
    >
      {formatPromoLines(listing.promoData, locale).line1}
    </span>
  );
}

function Heart({ listing, userId }: { listing: ShowcaseListing; userId: string | null }) {
  return (
    <div className="absolute top-2.5 right-2.5 z-10">
      {/* Pseudo-élément : zone de toucher 44 × 44 autour du cœur visuel de 32 px */}
      <FavoriteButton
        listingId={listing.id}
        initialIsFavorite={listing.isFavorite ?? false}
        currentUserId={userId}
        className="relative block before:absolute before:-inset-1.5 before:rounded-full"
      />
    </div>
  );
}

const PHOTO_ZOOM = "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03] motion-reduce:transition-none";

/* ── Bord de l'eau : carte du carrousel (photo 4/5) ── */
export function CarouselCard({ listing, locale, userId }: { listing: ShowcaseListing; locale: string; userId: string | null }) {
  const d = cardData(listing, locale);
  return (
    <Link href={d.href} title={listing.title} className="group show-card block">
      <div className="relative aspect-[4/5] rounded-[var(--radius-lg)] overflow-hidden bg-charcoal-100">
        <Image src={d.photo} alt={listing.title} fill loading="lazy" sizes="(max-width:640px) 78vw, (max-width:1024px) 40vw, 280px" className={`object-cover ${PHOTO_ZOOM}`} />
        <PromoBadge listing={listing} locale={locale} />
        <Heart listing={listing} userId={userId} />
      </div>
      <div className="mt-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="min-w-0 flex-1 truncate text-base font-bold text-charcoal-800">{d.name}</h3>
          <span className="min-w-0 max-w-[50%] shrink-0 truncate whitespace-nowrap text-sm text-charcoal-400">{d.location}</span>
        </div>
        <p className="mt-0.5 truncate text-sm text-charcoal-400">
          {d.tagline ? `${d.tagline} · ${d.guestsShort}` : d.guestsShort}
        </p>
        <Price listing={listing} locale={locale} className="mt-1 block text-[15px]" />
      </div>
    </Link>
  );
}

/* ── Spa : coup de cœur (photo pleine hauteur, texte sur la photo) ── */
export function FeaturedCard({ listing, locale, userId }: { listing: ShowcaseListing; locale: string; userId: string | null }) {
  const d = cardData(listing, locale);
  return (
    <Link
      href={d.href}
      title={listing.title}
      className="group relative block overflow-hidden rounded-[var(--radius-xl)] bg-charcoal-100 aspect-[4/5] sm:aspect-auto sm:h-[420px] lg:h-full lg:min-h-[560px]"
    >
      <Image src={d.photo} alt={listing.title} fill loading="lazy" sizes="(max-width:1024px) 100vw, 55vw" className={`object-cover ${PHOTO_ZOOM}`} />
      <span className="absolute inset-0 bg-[linear-gradient(to_top,rgba(20,24,12,.88),transparent_60%)]" aria-hidden="true" />
      <PromoBadge listing={listing} locale={locale} />
      <Heart listing={listing} userId={userId} />
      <div className="absolute inset-x-0 bottom-0 z-10 p-5 sm:p-7 text-white">
        <span className="inline-block rounded-[var(--radius-pill)] bg-highlight px-3 py-1 text-xs font-bold uppercase tracking-[0.08em]">
          {d.isEn ? "Favorite" : "Coup de cœur"}
        </span>
        <h3 className="mt-3 text-[28px] sm:text-[32px] leading-tight font-extrabold tracking-[-0.02em]">{d.name}</h3>
        <p className="mt-1 text-white/90 text-[15px]">
          {[d.location, d.tagline, d.guests].filter(Boolean).join(" · ")}
        </p>
        <Price listing={listing} locale={locale} onDark className="mt-2 block text-base" />
      </div>
    </Link>
  );
}

/* ── Spa : petite carte de la grille 2 × 2 (photo 4/3, sans accroche) ── */
export function SmallCard({ listing, locale, userId }: { listing: ShowcaseListing; locale: string; userId: string | null }) {
  const d = cardData(listing, locale);
  return (
    <Link href={d.href} title={listing.title} className="group block min-w-0">
      <div className="relative aspect-[4/3] rounded-[var(--radius-lg)] overflow-hidden bg-charcoal-100">
        <Image src={d.photo} alt={listing.title} fill loading="lazy" sizes="(max-width:640px) 78vw, (max-width:1024px) 45vw, 25vw" className={`object-cover ${PHOTO_ZOOM}`} />
        <PromoBadge listing={listing} locale={locale} />
        <Heart listing={listing} userId={userId} />
      </div>
      <div className="mt-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="min-w-0 flex-1 truncate text-base font-bold text-charcoal-800">{d.name}</h3>
          <span className="min-w-0 max-w-[50%] shrink-0 truncate whitespace-nowrap text-sm text-charcoal-400">{d.location}</span>
        </div>
        <Price listing={listing} locale={locale} className="mt-1 block text-[15px]" />
      </div>
    </Link>
  );
}

/* ── Télétravail : carte horizontale (liste) ── */
export function RowCard({ listing, locale, userId }: { listing: ShowcaseListing; locale: string; userId: string | null }) {
  const d = cardData(listing, locale);
  const sub = [d.location, d.tagline].filter(Boolean).join(" · ");
  return (
    <Link
      href={d.href}
      title={listing.title}
      className="group grid grid-cols-[96px_minmax(0,1fr)] sm:grid-cols-[180px_minmax(0,1fr)_auto] items-center gap-x-4 sm:gap-x-5 gap-y-1 rounded-[var(--radius-lg)] bg-white p-3 transition-shadow duration-200 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] row-span-2 sm:row-span-1 overflow-hidden rounded-lg bg-charcoal-100">
        <Image src={d.photo} alt={listing.title} fill loading="lazy" sizes="(max-width:640px) 96px, 180px" className="object-cover" />
        {/* Badge et cœur seulement dès 640 px : trop à l'étroit sur la vignette de 96 px */}
        <div className="hidden sm:block">
          <PromoBadge listing={listing} locale={locale} />
          <Heart listing={listing} userId={userId} />
        </div>
      </div>
      <div className="min-w-0 self-end sm:self-center">
        <h3 className="truncate text-[17px] font-bold text-charcoal-800">{d.name}</h3>
        <p className="mt-0.5 truncate text-sm text-charcoal-400">{sub}</p>
        <p className="mt-0.5 truncate text-sm text-charcoal-400">{`${d.guests} · ${d.rooms}`}</p>
      </div>
      <div className="col-start-2 self-start sm:col-start-3 sm:row-start-1 sm:self-center sm:text-right">
        {listing.priceOnRequest ? (
          <Price listing={listing} locale={locale} className="text-sm" />
        ) : listing.price > 0 ? (
          <>
            <span className="inline sm:block text-base sm:text-xl font-extrabold text-charcoal-800">{priceText(listing, locale)}</span>{" "}
            <span className="inline sm:block text-sm text-charcoal-400">{d.isEn ? "/night" : "/nuit"}</span>
          </>
        ) : null}
      </div>
    </Link>
  );
}
