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
        url: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&q=80",
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
    images: ["https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&q=80"],
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
    <div className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative h-[580px] z-10">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1920&q=80')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/45 to-black/65" />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-white text-center px-4">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <span>✦</span>
            <span>La marketplace des chalets québécois</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5 max-w-3xl leading-tight">
            Découvrez les plus beaux chalets du Québec
          </h1>
          <p className="text-lg md:text-xl mb-10 text-white/85 max-w-lg">
            Contactez directement les propriétaires.
            <br />
            Sans intermédiaire, sans frais de service.
          </p>
          <SearchBar />
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-5 flex flex-wrap justify-center gap-6 md:gap-16">
          <Stat value="500+" label="Chalets disponibles" />
          <Stat value="15" label="Régions du Québec" />
          <Stat value="0 $" label="Frais de service" />
          <Stat value="Direct" label="Contact propriétaire" />
        </div>
      </section>

      {/* ── Featured listings ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 w-full">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Nouveaux chalets</h2>
            <p className="text-gray-500 mt-1 text-sm">
              Les derniers chalets ajoutés sur Kabanalouer
            </p>
          </div>
          <Link
            href="/chalets"
            className="text-primary font-semibold text-sm hover:underline hidden md:block"
          >
            Voir tous les chalets →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} currentUserId={user?.id ?? null} />
          ))}
        </div>
        <div className="mt-8 flex justify-center md:hidden">
          <Link href="/chalets" className="text-primary font-semibold">
            Voir tous les chalets →
          </Link>
        </div>
      </section>

      {/* ── Why Kabanalouer ── */}
      <section className="bg-[#F8FAF9] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">
            Pourquoi choisir Kabanalouer ?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <WhyCard
              emoji="🤝"
              title="Contact direct"
              description="Parlez directement aux propriétaires. Posez vos questions, négociez les dates, aucun intermédiaire entre vous."
            />
            <WhyCard
              emoji="✅"
              title="Propriétaires vérifiés"
              description="Tous nos hôtes sont validés. Profils complets, photos authentiques et avis de vrais voyageurs pour vous guider."
            />
            <WhyCard
              emoji="💸"
              title="Zéro frais de service"
              description="Aucune commission cachée pour les voyageurs. Le prix affiché est le prix que vous payez."
            />
          </div>
        </div>
      </section>

      {/* ── Host CTA ── */}
      <section className="bg-primary py-16">
        <div className="max-w-3xl mx-auto px-4 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            Vous êtes propriétaire de chalet ?
          </h2>
          <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto leading-relaxed">
            Rejoignez des centaines de propriétaires qui font confiance à Kabanalouer.
            Abonnement annuel à seulement{" "}
            <strong className="text-white">299 $/an</strong>.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-white text-primary font-bold px-8 py-4 rounded-xl hover:bg-gray-50 transition-colors text-lg"
          >
            Inscrire mon chalet gratuitement →
          </Link>
          <p className="text-white/55 text-sm mt-5">
            30 jours d&apos;essai gratuit · Aucune carte requise pour commencer
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function WhyCard({
  emoji,
  title,
  description,
}: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100">
      <div className="text-3xl mb-4">{emoji}</div>
      <h3 className="font-bold text-gray-900 text-lg mb-2">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
}
