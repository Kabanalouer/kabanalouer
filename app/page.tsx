import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import ListingCard, { type Listing } from "@/components/ListingCard";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";

const MOCK_LISTINGS: Listing[] = [
  {
    id: "1",
    title: "Chalet rustique au bord du lac Tremblant",
    region: "Laurentides",
    price: 275,
    rating: 4.8,
    reviewCount: 34,
    capacity: 8,
    bedrooms: 4,
    photo: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80",
    tags: ["Bord du lac", "Spa", "Foyer"],
  },
  {
    id: "2",
    title: "Villa de luxe avec vue sur le fleuve Saint-Laurent",
    region: "Charlevoix",
    price: 520,
    rating: 4.9,
    reviewCount: 18,
    capacity: 12,
    bedrooms: 6,
    photo: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80",
    tags: ["Vue panoramique", "Piscine", "Ski"],
  },
  {
    id: "3",
    title: "Micro-chalet moderne dans les bois",
    region: "Estrie",
    price: 185,
    rating: 4.7,
    reviewCount: 42,
    capacity: 4,
    bedrooms: 2,
    photo: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800&q=80",
    isNew: true,
    tags: ["Nature", "Tranquillité", "Randonnée"],
  },
  {
    id: "4",
    title: "Grand chalet familial près des pistes de ski",
    region: "Lanaudière",
    price: 350,
    rating: 4.6,
    reviewCount: 27,
    capacity: 16,
    bedrooms: 8,
    photo: "https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=800&q=80",
    tags: ["Ski alpin", "Piscine intérieure", "Billard"],
  },
  {
    id: "5",
    title: "Chalet au bord de la rivière Batiscan",
    region: "Mauricie",
    price: 225,
    rating: 4.8,
    reviewCount: 15,
    capacity: 6,
    bedrooms: 3,
    photo: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80",
    isNew: true,
    tags: ["Rivière", "Kayak", "Foyer extérieur"],
  },
  {
    id: "6",
    title: "Chalet nordique avec sauna et spa privatif",
    region: "Saguenay–Lac-Saint-Jean",
    price: 310,
    rating: 4.9,
    reviewCount: 9,
    capacity: 8,
    bedrooms: 4,
    photo: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80",
    isNew: true,
    tags: ["Sauna", "Spa", "Raquettes"],
  },
];

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
        redirect("/dashboard/listings");
      }
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative h-[580px] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1920&q=80')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/45 to-black/65" />
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
            <h2 className="text-2xl font-bold text-gray-900">Chalets à la une</h2>
            <p className="text-gray-500 mt-1 text-sm">
              Des propriétaires vérifiés dans toutes les régions
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
          {MOCK_LISTINGS.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
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
