import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import ListingCard, { type Listing } from "@/components/ListingCard";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";
import { normalizePhotos } from "@/lib/photo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kabanalouer — Location de chalets au Québec | Contact direct avec les propriétaires",
  description:
    "Découvrez des centaines de chalets à louer au Québec. Contact direct avec les propriétaires, aucun frais de service. Laurentides, Charlevoix, Estrie et plus.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Kabanalouer — Location de chalets au Québec",
    description:
      "Découvrez des centaines de chalets à louer au Québec. Contact direct avec les propriétaires, aucun frais de service.",
    url: "/",
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
    title: "Kabanalouer — Location de chalets au Québec",
    description:
      "Contact direct avec les propriétaires, aucun frais de service. Laurentides, Charlevoix, Estrie et plus.",
    images: ["https://kabanalouer.vercel.app/hero-chalet.webp"],
  },
};

export default async function HomePage() {
  const supabase = await createClient();
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
      if (profile?.role === "host") {
        redirect("/dashboard");
      }
    }
  }

  const { data: rawListings } = await supabase
    .from("listings")
    .select("id, title, region, city, price_low, price_on_request, capacity, bedrooms, photos, amenities")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(6);

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
  }));

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Kabanalouer",
    url: "https://kabanalouer.vercel.app",
    description: "Marketplace de location de chalets au Québec",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://kabanalouer.vercel.app/chalets?destination={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative h-[calc(100svh-80px)] md:h-[calc(100vh-80px)] z-10 overflow-hidden">
        {/* Photo */}
        <div
          className="absolute inset-0 bg-cover bg-center scale-[1.02]"
          style={{
            backgroundImage:
              "url('/hero-chalet.webp')",
          }}
        />
        {/* Overlay — léger en haut, dense en bas */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/35 to-black/65" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-start h-full text-white text-center px-4 pt-[14vh]">
          {/* Badge */}
          <div className="inline-flex items-center bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-semibold tracking-[0.06em] uppercase px-4 py-2 rounded-full mb-6">
            La marketplace de la location de chalet au Québec
          </div>

          {/* Headline */}
          <h1 className="text-[2.6rem] md:text-5xl lg:text-[3.75rem] font-extrabold leading-[1.04] tracking-[-0.035em] mb-5 max-w-3xl">
            Trouvez votre chalet au Québec en quelques clics.
          </h1>

          {/* Subtitle */}
          <p className="text-base md:text-lg text-white/80 mb-10 leading-relaxed whitespace-nowrap font-semibold">
            Payez moins cher en contactant le propriétaire directement.
          </p>

          <SearchBar />
        </div>

        {/* Stats — anchored at bottom of hero */}
        <div className="absolute bottom-0 left-0 right-0 z-10 border-t border-white/15">
          <div className="flex flex-wrap justify-center gap-8 md:gap-20 px-4 py-5 bg-black/30 backdrop-blur-sm">
            <HeroStat value="500+" label="Chalets disponibles" />
            <HeroStat value="15" label="Régions du Québec" />
            <HeroStat value="0 $" label="Frais de service" />
            <HeroStat value="Direct" label="Contact propriétaire" />
          </div>
        </div>
      </section>

      {/* ── Featured listings ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        {/* Section header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs font-semibold tracking-[0.08em] uppercase text-primary mb-2">
              Coups de cœur · Été 2026
            </p>
            <h2 className="text-3xl font-bold text-charcoal-800 tracking-[-0.03em] leading-snug">
              Des chalets choisis avec soin.
            </h2>
          </div>
          <Link
            href="/chalets"
            className="text-charcoal-800 font-medium text-sm underline underline-offset-4 hover:text-primary transition-colors hidden md:block"
          >
            Tout voir →
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
            <p className="text-lg font-medium mb-2">Aucun chalet disponible pour l&apos;instant.</p>
            <p className="text-sm">De nouveaux chalets arrivent bientôt.</p>
          </div>
        )}

        <div className="mt-10 flex justify-center md:hidden">
          <Link
            href="/chalets"
            className="text-charcoal-800 font-medium text-sm underline underline-offset-4"
          >
            Voir tous les chalets →
          </Link>
        </div>
      </section>

      {/* ── Pourquoi Kabanalouer ── */}
      <section className="bg-charcoal-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-[0.08em] uppercase text-primary mb-3">
              Notre différence
            </p>
            <h2 className="text-3xl font-bold text-charcoal-800 tracking-[-0.03em]">
              Pourquoi choisir Kabanalouer ?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <WhyCard
              icon={<IconUsers />}
              title="Contact direct"
              description="Parlez directement aux propriétaires. Posez vos questions, négociez les dates, aucun intermédiaire entre vous."
            />
            <WhyCard
              icon={<IconShieldCheck />}
              title="Propriétaires vérifiés"
              description="Tous nos hôtes détiennent un numéro CITQ valide. Profils complets et photos authentiques pour vous guider."
            />
            <WhyCard
              icon={<IconPercent />}
              title="Zéro frais de service"
              description="Aucune commission cachée pour les voyageurs. Le prix affiché est le prix que vous payez, point final."
            />
          </div>
        </div>
      </section>

      {/* ── CTA Hôtes ── */}
      <section className="bg-primary py-20">
        <div className="max-w-3xl mx-auto px-4 text-center text-white">
          <p className="text-xs font-semibold tracking-[0.08em] uppercase text-white/60 mb-4">
            Pour les propriétaires
          </p>
          <h2 className="text-3xl md:text-4xl font-bold mb-5 tracking-[-0.03em] leading-tight">
            Vous êtes propriétaire de chalet ?
          </h2>
          <p className="text-white/80 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            Rejoignez des centaines de propriétaires qui font confiance à Kabanalouer.
            Abonnement annuel à seulement{" "}
            <strong className="text-white font-semibold">299 $/an</strong> par chalet.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-white text-primary font-bold px-10 py-4 rounded-xl hover:bg-gray-50 transition-colors text-base"
          >
            Inscrire mon chalet →
          </Link>
          <p className="text-white/50 text-xs mt-5 tracking-wide">
            Offre gratuite pour les 50 premiers hôtes · Aucune carte requise
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}

/* ── HeroStat ── */
function HeroStat({ value, label }: { value: string; label: string }) {
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
