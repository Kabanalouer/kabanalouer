import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import AuthCodeWelcomeTrigger from "@/components/AuthCodeWelcomeTrigger";
import SearchBar from "@/components/SearchBar";
import ListingCard, { type Listing } from "@/components/ListingCard";
import Footer from "@/components/Footer";
import PriceComparison from "@/components/PriceComparison";
import OwnersSection from "@/components/OwnersSection";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { normalizePhotos } from "@/lib/photo";
import { getTranslations, getLocale } from "next-intl/server";
import type { Metadata } from "next";
import { localePath } from "@/lib/localePath";
import { SITE_URL } from "@/lib/siteUrl";
import { getAmenityLabels, type AmenityValue } from "@/lib/amenities-catalog";
import { PROMO_DISPLAY_COLUMNS, visiblePromoFilter } from "@/lib/promoLabel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home");
  const locale = await getLocale();
  const isEn = locale === "en";
  const canonicalPath = isEn ? "/en" : "/";
  return {
    title: t("metaTitle"),
    description: t("metaDesc"),
    alternates: {
      canonical: canonicalPath,
      languages: { fr: "/", en: "/en", "x-default": "/" },
    },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDesc"),
      url: canonicalPath,
      siteName: "Kabanalouer",
      locale: isEn ? "en_CA" : "fr_CA",
      type: "website",
      images: [
        {
          url: `${SITE_URL}/hero-chalet.webp`,
          width: 1200,
          height: 630,
          alt: isEn ? "Lakeside cabin in Quebec" : "Chalet au bord du lac au Québec",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("ogTitle"),
      description: t("metaDesc"),
      images: [`${SITE_URL}/hero-chalet.webp`],
    },
  };
}

export default async function HomePage() {
  const [supabase, t, locale] = await Promise.all([
    createClient(),
    getTranslations("home"),
    getLocale(),
  ]);
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const cookieStore = await cookies();
    const isVoyageurMode = cookieStore.get("kbl_voyageur")?.value === "1";
    if (!isVoyageurMode) {
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role === "host" || profile?.role === "admin") {
        redirect(locale === "en" ? "/en/dashboard" : "/dashboard");
      }
    }
  }

  // « Nouveautés » : les 3 chalets publiés le plus récemment (6 plus tard,
  // quand il y aura plus d'annonces). Pas de colonne
  // de date de publication : la ligne subscriptions d'une annonce est créée à
  // sa première publication (gratuite ou payante), on trie donc par sa date.
  // Lecture serveur seulement (subscriptions n'est pas lisible par les visiteurs).
  const NEW_LISTINGS_COUNT = 3;
  const LISTING_CARD_COLUMNS = "id, title, title_en, region, city, price_low, price_on_request, capacity, bedrooms, photos, amenities, listing_number, custom_slug";
  const { data: recentSubs } = await createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
    .from("subscriptions")
    .select("listing_id, created_at")
    .order("created_at", { ascending: false })
    .limit(30);
  const publishedOrder = (recentSubs ?? []).map((r) => r.listing_id as string);
  const { data: candidateListings } = publishedOrder.length > 0
    ? await supabase
        .from("listings")
        .select(LISTING_CARD_COLUMNS)
        .eq("is_published", true)
        .in("id", publishedOrder)
    : { data: [] };
  const rawListings = (candidateListings ?? [])
    .sort((a, b) => publishedOrder.indexOf(a.id as string) - publishedOrder.indexOf(b.id as string))
    .slice(0, NEW_LISTINGS_COUNT);

  // Vedette listings for current month
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const { data: vedetteRows } = await supabase
    .from("featured_listings")
    .select("listing_id")
    .eq("type", "home")
    .eq("month", currentMonth)
    .eq("status", "active")
    .limit(3);
  const vedetteIds = (vedetteRows ?? []).map((r) => r.listing_id as string);
  const { data: rawVedette } = vedetteIds.length > 0
    ? await supabase
        .from("listings")
        .select("id, title, title_en, region, city, price_low, price_on_request, capacity, bedrooms, photos, amenities, listing_number, custom_slug")
        .in("id", vedetteIds)
        .eq("is_published", true)
    : { data: [] as typeof rawListings };
  const vedetteListings: Listing[] = (rawVedette ?? []).map((l) => ({
    id: l.id,
    title: (locale === "en" && (l.title_en as string | null)) || (l.title ?? ""),
    region: l.region ?? "",
    city: (l.city as string | null) ?? null,
    listing_number: (l.listing_number as number | null) ?? null,
    custom_slug: (l.custom_slug as string | null) ?? null,
    price: (l.price_low as number) ?? 0,
    priceOnRequest: (l.price_on_request as boolean) ?? false,
    capacity: (l.capacity as number) ?? 1,
    bedrooms: (l.bedrooms as number) ?? 1,
    photos: normalizePhotos(l.photos).map((p) => p.url),
    tags: Array.isArray(l.amenities) ? getAmenityLabels(l.amenities as AmenityValue[], locale).slice(0, 3) : [],
    isFeatured: true,
  }));

  const featuredIds = (rawListings ?? []).map((l) => l.id as string);
  const today = new Date().toISOString().split("T")[0];
  const { data: activePromos } = featuredIds.length > 0
    ? await supabase
        .from("promotions")
        .select(`listing_id, ${PROMO_DISPLAY_COLUMNS}`)
        .in("listing_id", featuredIds)
        .eq("is_active", true)
        .or(visiblePromoFilter(today))
    : { data: [] as { listing_id: string; type: string; value: number; min_nights: number | null; days_before: number | null; start_date: string | null; end_date: string | null; date_basis: "stay" | "booking" }[] };
  const promoMap = new Map((activePromos ?? []).map((p) => [p.listing_id as string, p]));

  const featuredListings: Listing[] = (rawListings ?? []).map((l) => ({
    id: l.id,
    title: (locale === "en" && (l.title_en as string | null)) || (l.title ?? ""),
    region: l.region ?? "",
    city: (l.city as string | null) ?? null,
    listing_number: (l.listing_number as number | null) ?? null,
    custom_slug: (l.custom_slug as string | null) ?? null,
    price: (l.price_low as number) ?? 0,
    priceOnRequest: (l.price_on_request as boolean) ?? false,
    capacity: (l.capacity as number) ?? 1,
    bedrooms: (l.bedrooms as number) ?? 1,
    photos: normalizePhotos(l.photos).map((p) => p.url),
    tags: Array.isArray(l.amenities) ? getAmenityLabels(l.amenities as AmenityValue[], locale).slice(0, 3) : [],
    hasPromo: promoMap.has(l.id as string),
    promoData: promoMap.get(l.id as string) ?? null,
  }));

  const BASE_URL = SITE_URL;
  const isEn = locale === "en";

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Kabanalouer",
    url: BASE_URL,
    description: isEn ? "Cabin rental marketplace in Quebec" : "Marketplace de location de chalets au Québec",
    potentialAction: {
      "@type": "SearchAction",
      target: `${BASE_URL}${isEn ? "/en/cabins" : "/chalets"}?city={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Kabanalouer",
    url: BASE_URL,
    logo: `${BASE_URL}/logo-wordmark.svg`,
    description: isEn
      ? "Cabin rental marketplace in Quebec — contact owners directly, no service fees."
      : "Marketplace de location de chalets au Québec — contact direct avec les propriétaires, aucun frais de service.",
    areaServed: "Québec, Canada",
    sameAs: [],
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <AuthCodeWelcomeTrigger />
      <Navbar />
      <main className="flex flex-1 flex-col">

      {/* ── Hero ── */}
      {/* min-h sur mobile : le hero grandit pour contenir le contenu. sm+ : hauteur fixe viewport. */}
      {/* flex flex-col sur la section : flex-1 (plutôt que h-full) reste centré même quand min-h remplace une hauteur fixe */}
      <section className="relative min-h-[calc(100svh-80px)] sm:h-[calc(100svh-80px)] md:h-[calc(100vh-80px)] flex flex-col z-40">
        {/* overflow-hidden uniquement sur le wrapper background pour clipper le scale-[1.02] */}
        <div className="absolute inset-0 overflow-hidden">
          {/* next/image (priority) : LCP préchargé + variantes responsive au lieu du webp 2560px en CSS */}
          <div className="absolute inset-0 scale-[1.02]">
            <Image
              src="/hero-chalet.webp"
              alt=""
              fill
              priority
              fetchPriority="high"
              sizes="100vw"
              className="object-cover object-center"
            />
          </div>
          {/* Overlay — léger en haut, dense en bas */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/35 to-black/65" />
        </div>

        {/* Content — centré verticalement, mobile et desktop */}
        <div className="relative z-10 flex-1 flex flex-col justify-center text-white">

          {/* Contenu : badge + titre + sous-titre + recherche */}
          <div className="flex flex-col items-center text-center px-4 pt-6 pb-6 sm:py-10">
            <div className="inline-flex items-center text-center bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-semibold tracking-[0.04em] sm:tracking-[0.06em] uppercase px-3 sm:px-4 py-2 rounded-full mb-3 sm:mb-6 max-w-[260px] sm:max-w-none leading-tight">
              {t("badge")}
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-[3.25rem] font-bold leading-[1.15] tracking-normal mb-4 sm:mb-5 max-w-3xl">
              {t("heroTitle")}
            </h1>
            <p className="hidden sm:block text-base md:text-lg text-white/80 mb-10 leading-relaxed sm:whitespace-nowrap font-semibold px-2 sm:px-0">
              {t("heroSubtitle")}
            </p>
            <div className="w-full flex justify-center">
              <SearchBar />
            </div>

          </div>

        </div>

      </section>

      {/* ── Chalets en vedette ── */}
      {vedetteListings.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 w-full">
          <h2 className="text-2xl font-bold text-charcoal-800 mb-8 tracking-[-0.02em]">
            {t("featuredTitle")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
            {vedetteListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} currentUserId={user?.id ?? null} />
            ))}
          </div>
        </section>
      )}

      {/* ── Featured listings ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        {/* Section header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs font-semibold tracking-[0.08em] uppercase text-primary mb-2">
              {t("pickLabel")}
            </p>
            <h2 className="text-3xl font-bold text-charcoal-800 tracking-[-0.03em] leading-snug">
              {t("pickTitle")}
            </h2>
          </div>
          <Link
            href={localePath("/chalets", locale)}
            className="text-charcoal-800 font-medium text-sm underline underline-offset-4 hover:text-primary transition-colors hidden md:block"
          >
            {t("viewAll")}
          </Link>
        </div>

        {featuredListings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
            {featuredListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} currentUserId={user?.id ?? null} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-charcoal-400">
            <p className="text-lg font-medium mb-2">{t("noListings")}</p>
            <p className="text-base">{t("noListingsSoon")}</p>
          </div>
        )}

        <div className="mt-10 flex justify-center md:hidden">
          <Link
            href={localePath("/chalets", locale)}
            className="text-charcoal-800 font-medium text-sm underline underline-offset-4"
          >
            {t("viewAllMobile")}
          </Link>
        </div>
      </section>

      {/* ── Notre différence — comparaison des prix ── */}
      <PriceComparison />

      {/* ── Pour les propriétaires ── */}
      <OwnersSection />

      </main>

      <Footer />
    </div>
  );
}
