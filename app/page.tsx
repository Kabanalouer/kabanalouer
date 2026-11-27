import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import AuthCodeWelcomeTrigger from "@/components/AuthCodeWelcomeTrigger";
import SearchBar from "@/components/SearchBar";
import ListingCard, { type Listing } from "@/components/ListingCard";
import Footer from "@/components/Footer";
import PriceComparison from "@/components/PriceComparison";
import OwnersClaimBanner from "@/components/OwnersClaimBanner";
import RegionsExplorer from "@/components/RegionsExplorer";
import ThemesExplorer from "@/components/ThemesExplorer";
import HomeThemeShowcase from "@/components/HomeThemeShowcase";
import HomeSeoSection from "@/components/HomeSeoSection";
import { createClient } from "@/lib/supabase/server";
import { normalizePhotos } from "@/lib/photo";
import { getTranslations, getLocale } from "next-intl/server";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/siteUrl";
import { getAmenityLabels, type AmenityValue } from "@/lib/amenities-catalog";

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
    : { data: [] as { id: string; title: string | null; title_en: string | null; region: string | null; city: string | null; price_low: number | null; price_on_request: boolean | null; capacity: number | null; bedrooms: number | null; photos: unknown; amenities: unknown; listing_number: number | null; custom_slug: string | null }[] };
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

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <AuthCodeWelcomeTrigger />
      <Navbar />
      <main className="flex flex-1 flex-col">

      {/* ── Hero (option 1a) ── */}
      {/* Marge responsive autour de l'image ; svh : pas de saut de la barre d'adresse sur mobile.
          z-40 : les listes de la recherche (destination, calendrier) débordent du hero. */}
      <section className="relative z-40 m-[clamp(8px,1.5vw,16px)] min-h-[min(760px,88svh)] rounded-[16px] sm:rounded-[var(--radius-hero)] flex flex-col">
        {/* overflow-hidden uniquement sur le wrapper de l'image */}
        <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
          {/* next/image (priority) : LCP préchargé + variantes responsive */}
          <Image
            src="/hero-chalet.webp"
            alt=""
            fill
            priority
            fetchPriority="high"
            quality={60}
            sizes="100vw"
            className="object-cover object-[60%_center] sm:object-center"
          />
          {/* Dégradé de protection : plus dense sur mobile, où le texte prend plus de hauteur */}
          <div className="absolute inset-0 sm:hidden bg-[linear-gradient(to_top,rgba(20,24,12,.92)_0%,rgba(20,24,12,.5)_50%,rgba(20,24,12,0)_90%)]" />
          <div className="absolute inset-0 hidden sm:block bg-[linear-gradient(to_top,rgba(20,24,12,.9)_0%,rgba(20,24,12,.35)_50%,rgba(20,24,12,0)_80%)]" />
        </div>

        {/* Contenu aligné en bas, largeur max 1280 px centrée */}
        <div className="relative z-10 mt-auto w-full max-w-[1280px] mx-auto p-[clamp(24px,5vw,56px)] flex flex-col gap-[clamp(20px,2.5vw,28px)] text-white">
          {/* Un seul <h1> : kicker (SEO) + titre d'accroche, tous deux lisibles par Google */}
          <h1 className="hero-title">
            <span className="hero-kicker block text-[length:clamp(15px,1.4vw,20px)] font-bold tracking-[-0.01em] text-white">
              {t("heroKicker")}
            </span>
            <span className="hero-display block mt-[clamp(10px,1.5vw,18px)] text-[length:var(--fs-display-xl)] font-extrabold tracking-[var(--tracking-display)] leading-[var(--lh-display)] text-white">
              {t("heroLine1")}
              <br />
              <span className="hero-accent text-highlight">{t("heroAccent")}</span>
            </span>
          </h1>
          <p className="max-w-[46ch] text-[length:clamp(16px,1.6vw,19px)] leading-normal text-white/90">
            {t("heroSubtitle")}
          </p>
          {/* md+ : la pastille se limite à 860 px ; en dessous, carte pleine largeur */}
          <div data-hero-search className="w-full md:[&>div]:max-w-[860px] md:[&>div]:mx-0">
            <SearchBar />
          </div>
        </div>
      </section>

      {/* ── 3 meilleurs chalets de 3 thèmes (bord de l'eau, spa, télétravail), puis tous les thèmes en tuiles ── */}
      <HomeThemeShowcase userId={user?.id ?? null} />

      {/* ── Notre différence — comparaison des prix (après les rangées de chalets) ── */}
      <PriceComparison />

      <ThemesExplorer />

      {/* ── Chalets en vedette ── */}
      {vedetteListings.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 w-full">
          <h2 className="text-[length:var(--fs-display)] font-extrabold tracking-[-0.04em] leading-none text-charcoal-800 mb-8">
            {t("featuredTitle")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
            {vedetteListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} currentUserId={user?.id ?? null} />
            ))}
          </div>
        </section>
      )}

      {/* ── Explorer par région (seulement les régions avec chalets) ── */}
      <RegionsExplorer />

      {/* ── Présentation et FAQ (référencement « location de chalet au Québec ») ── */}
      <HomeSeoSection />

      {/* ── Pour les propriétaires ── */}
      <OwnersClaimBanner emplacement="banniere_accueil" />

      </main>

      <Footer />
    </div>
  );
}
