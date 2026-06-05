import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import ListingCard, { type Listing } from "@/components/ListingCard";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";
import { normalizePhotos } from "@/lib/photo";
import { getTranslations, getLocale } from "next-intl/server";
import type { Metadata } from "next";
import { localePath } from "@/lib/localePath";

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
          url: "https://kabanalouer.vercel.app/hero-chalet.webp",
          width: 1200,
          height: 630,
          alt: "Chalet au bord du lac au Québec",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("ogTitle"),
      description: t("metaDesc"),
      images: ["https://kabanalouer.vercel.app/hero-chalet.webp"],
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

  const { data: rawListings } = await supabase
    .from("listings")
    .select("id, title, region, city, price_low, price_on_request, capacity, bedrooms, photos, amenities")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(6);

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
        .select("id, title, region, city, price_low, price_on_request, capacity, bedrooms, photos, amenities")
        .in("id", vedetteIds)
        .eq("is_published", true)
    : { data: [] as typeof rawListings };
  const vedetteListings: Listing[] = (rawVedette ?? []).map((l) => ({
    id: l.id,
    title: l.title ?? "",
    region: l.region ?? "",
    city: (l.city as string | null) ?? null,
    price: (l.price_low as number) ?? 0,
    priceOnRequest: (l.price_on_request as boolean) ?? false,
    capacity: (l.capacity as number) ?? 1,
    bedrooms: (l.bedrooms as number) ?? 1,
    photos: normalizePhotos(l.photos).map((p) => p.url),
    tags: Array.isArray(l.amenities) ? (l.amenities as string[]).slice(0, 3) : [],
    isFeatured: true,
  }));

  const featuredIds = (rawListings ?? []).map((l) => l.id as string);
  const today = new Date().toISOString().split("T")[0];
  const { data: activePromos } = featuredIds.length > 0
    ? await supabase
        .from("promotions")
        .select("listing_id, type, value, min_nights, days_before, start_date, end_date")
        .in("listing_id", featuredIds)
        .eq("is_active", true)
        .or(`type.eq.lastminute,and(start_date.lte.${today},end_date.gte.${today})`)
    : { data: [] as { listing_id: string; type: string; value: number; min_nights: number | null; days_before: number | null; start_date: string | null; end_date: string | null }[] };
  const promoMap = new Map((activePromos ?? []).map((p) => [p.listing_id as string, p]));

  const featuredListings: Listing[] = (rawListings ?? []).map((l) => ({
    id: l.id,
    title: l.title ?? "",
    region: l.region ?? "",
    city: (l.city as string | null) ?? null,
    price: (l.price_low as number) ?? 0,
    priceOnRequest: (l.price_on_request as boolean) ?? false,
    capacity: (l.capacity as number) ?? 1,
    bedrooms: (l.bedrooms as number) ?? 1,
    photos: normalizePhotos(l.photos).map((p) => p.url),
    tags: Array.isArray(l.amenities) ? (l.amenities as string[]).slice(0, 3) : [],
    hasPromo: promoMap.has(l.id as string),
    promoData: promoMap.get(l.id as string) ?? null,
  }));

  const BASE_URL = "https://kabanalouer.vercel.app";

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Kabanalouer",
    url: BASE_URL,
    description: "Marketplace de location de chalets au Québec",
    potentialAction: {
      "@type": "SearchAction",
      target: `${BASE_URL}/chalets?destination={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Kabanalouer",
    url: BASE_URL,
    logo: `${BASE_URL}/logo-wordmark.svg`,
    description: "Marketplace de location de chalets au Québec — contact direct avec les propriétaires, aucun frais de service.",
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
      <Navbar />

      {/* ── Hero ── */}
      {/* min-h sur mobile : le hero grandit pour contenir le contenu. sm+ : hauteur fixe viewport. */}
      <section className="relative min-h-[calc(100svh-80px)] sm:h-[calc(100svh-80px)] md:h-[calc(100vh-80px)] z-40">
        {/* overflow-hidden uniquement sur le wrapper background pour clipper le scale-[1.02] */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center scale-[1.02]"
            style={{ backgroundImage: "url('/hero-chalet.webp')" }}
          />
          {/* Overlay — léger en haut, dense en bas */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/35 to-black/65" />
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-center sm:justify-start text-white">

          {/* Contenu : badge + titre + sous-titre + recherche + stats */}
          <div className="flex flex-col items-center text-center px-4 pt-0 sm:pt-[12vh] pb-10 sm:pb-0">
            <div className="hidden sm:inline-flex items-center text-center bg-white/10 backdrop-blur-sm border border-white/20 text-white text-[10px] sm:text-xs font-semibold tracking-[0.04em] sm:tracking-[0.06em] uppercase px-3 sm:px-4 py-2 rounded-full mb-6 max-w-[280px] sm:max-w-none leading-tight">
              {t("badge")}
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-[3.25rem] font-extrabold leading-[1.04] tracking-[-0.035em] mb-5 max-w-3xl mt-16 sm:mt-0">
              {t("heroTitle")}
            </h1>
            <p className="hidden sm:block text-base md:text-lg text-white/80 mb-10 leading-relaxed sm:whitespace-nowrap font-semibold px-2 sm:px-0">
              {t("heroSubtitle")}
            </p>
            <div className="mt-8 sm:mt-0 w-full flex justify-center">
              <SearchBar />
            </div>

          </div>

        </div>

        {/* Stats footer — masquées en mobile */}
        <div className="hidden lg:flex absolute bottom-0 left-0 right-0 bg-black/20 backdrop-blur-sm divide-x divide-white/20">
          <HeroStat value="0 $" label={t("statFeeLabel")} footer />
          <HeroStat value="Direct" label={t("statDirectLabel")} footer />
          <HeroStat value="100 %" label={t("statVerifiedLabel")} footer />
          <HeroStat value={t("statFreeValue")} label={t("statFreeLabel")} footer />
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
            <p className="text-sm">{t("noListingsSoon")}</p>
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

      {/* ── Pourquoi Kabanalouer ── */}
      <section className="bg-charcoal-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-[0.08em] uppercase text-primary mb-3">
              {t("whyLabel")}
            </p>
            <h2 className="text-3xl font-bold text-charcoal-800 tracking-[-0.03em]">
              {t("whyTitle")}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <WhyCard
              icon={<IconUsers />}
              title={t("why1Title")}
              description={t("why1Desc")}
            />
            <WhyCard
              icon={<IconShieldCheck />}
              title={t("why2Title")}
              description={t("why2Desc")}
            />
            <WhyCard
              icon={<IconPercent />}
              title={t("why3Title")}
              description={t("why3Desc")}
            />
          </div>
        </div>
      </section>

      {/* ── CTA Hôtes ── */}
      <section className="bg-primary py-20">
        <div className="max-w-3xl mx-auto px-4 text-center text-white">
          <p className="text-xs font-semibold tracking-[0.08em] uppercase text-white/60 mb-4">
            {t("ctaLabel")}
          </p>
          <h2 className="text-3xl md:text-4xl font-bold mb-5 tracking-[-0.03em] leading-tight">
            {t("ctaTitle")}
          </h2>
          <p className="text-white/80 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            {t("ctaDescPre")}{" "}
            <strong className="text-white font-semibold">{t("ctaPrice")}</strong>{" "}
            {t("ctaDescPost")}
          </p>
          <Link
            href={localePath("/devenir-hote", locale)}
            className="inline-block bg-white text-primary font-bold px-10 py-4 rounded-xl hover:bg-gray-50 transition-colors text-base"
          >
            {t("ctaButton")}
          </Link>
          <p className="text-white/50 text-xs mt-5 tracking-wide">
            {t("ctaNote")}
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}

/* ── HeroStat ── */
function HeroStat({ value, label, footer }: { value: string; label: string; footer?: boolean }) {
  if (footer) {
    return (
      <div className="flex-1 text-center py-4 px-6">
        <div className="text-xl font-bold text-white tracking-tight">{value}</div>
        <div className="text-xs text-white/70 mt-0.5 tracking-wide">{label}</div>
      </div>
    );
  }
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
      <div className="text-xs text-white/70 mt-0.5 tracking-wide">{label}</div>
    </div>
  );
}

/* ── WhyCard ── */
function WhyCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-7 border border-gray-100">
      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-5">
        {icon}
      </div>
      <h3 className="font-bold text-charcoal-800 text-[17px] mb-2">{title}</h3>
      <p className="text-charcoal-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

/* ── Icons (Lucide-compatible SVG, stroke 1.75) ── */
function IconUsers() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconShieldCheck() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function IconPercent() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="7.5" r="1.5" />
      <circle cx="16.5" cy="16.5" r="1.5" />
      <line x1="19" y1="5" x2="5" y2="19" />
    </svg>
  );
}
