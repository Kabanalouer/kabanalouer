import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "À propos | Kabanalouer — Marketplace de chalets au Québec",
  description:
    "Kabanalouer est la marketplace de référence pour la location de chalets au Québec. Notre mission : connecter voyageurs et propriétaires sans intermédiaire.",
  alternates: { canonical: "/a-propos" },
  openGraph: {
    title: "À propos | Kabanalouer — Marketplace de chalets au Québec",
    description:
      "Kabanalouer est la marketplace de référence pour la location de chalets au Québec. Notre mission : connecter voyageurs et propriétaires sans intermédiaire.",
    url: "/a-propos",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Kabanalouer",
  url: "https://kabanalouer.vercel.app",
  description: "Marketplace de location de chalets au Québec",
  areaServed: "Québec, Canada",
  foundingDate: "2026",
  slogan: "La marketplace des chalets québécois",
};

export default function AProposPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <Navbar />

      {/* ── Hero ── */}
      <section className="bg-[#F8FAF9] border-b border-gray-100 py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            🍁 Fait au Québec
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-5 leading-tight">
            Notre mission
          </h1>
          <p className="text-lg text-gray-500 max-w-lg mx-auto leading-relaxed">
            Connecter les voyageurs québécois avec les plus beaux chalets de la province.
            Sans intermédiaire, sans frais cachés.
          </p>
        </div>
      </section>

      {/* ── Notre histoire ── */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Pourquoi Kabanalouer ?</h2>
          <div className="space-y-4 text-gray-600 leading-relaxed text-lg">
            <p>
              Kabanalouer est né d&apos;un constat simple — les plateformes existantes chargent
              des frais de service élevés, compliquent la communication entre propriétaires et
              voyageurs, et ne sont pas adaptées à la réalité des chalets québécois.
            </p>
            <p>
              Nous avons créé Kabanalouer pour changer ça : une plateforme simple, transparente,
              et 100&nbsp;% dédiée au Québec. Ici, les voyageurs contactent directement les
              propriétaires, sans passer par un intermédiaire qui prend une commission sur chaque
              transaction.
            </p>
            <p>
              Notre modèle est simple : les propriétaires paient un abonnement annuel fixe pour
              afficher leur chalet. Les voyageurs accèdent gratuitement à toutes les annonces. Pas
              de commission, pas de frais de service, pas de surprise.
            </p>
          </div>
        </div>
      </section>

      {/* ── Nos valeurs ── */}
      <section className="py-20 bg-[#F8FAF9]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Nos valeurs</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ValueCard
              emoji="🌲"
              title="Authenticité québécoise"
              description="Nous mettons en valeur les chalets uniques du Québec, des Laurentides à la Gaspésie. Chaque annonce raconte une histoire, un lieu, une expérience."
            />
            <ValueCard
              emoji="🤝"
              title="Contact direct"
              description="Nous croyons que la meilleure expérience passe par une relation directe entre propriétaires et voyageurs. Aucun intermédiaire ne s'intercale entre vous."
            />
            <ValueCard
              emoji="💚"
              title="Transparence"
              description="Aucune commission cachée, aucun frais surprise. Un modèle simple et honnête pour tous — le prix affiché est le prix que vous payez."
            />
          </div>
        </div>
      </section>

      {/* ── En chiffres ── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Kabanalouer en chiffres
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Stat value="14" label="régions du Québec couvertes" />
            <Stat value="0 $" label="de frais de service pour les voyageurs" />
            <Stat value="Direct" label="contact avec les propriétaires" />
            <Stat value="24/7" label="disponible en ligne" />
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-primary py-20">
        <div className="max-w-3xl mx-auto px-4 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Rejoignez la communauté</h2>
          <p className="text-white/80 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            Que vous cherchiez un chalet pour votre prochaine escapade ou que vous souhaitiez
            afficher votre propriété, Kabanalouer est fait pour vous.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/chalets"
              className="inline-flex items-center justify-center gap-2 bg-white text-primary font-bold px-8 py-4 rounded-xl hover:bg-gray-50 transition-colors text-lg"
            >
              Explorer les chalets →
            </Link>
            <Link
              href="/devenir-hote"
              className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm border border-white/30 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/20 transition-colors text-lg"
            >
              Afficher mon chalet →
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function ValueCard({
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

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center p-6 bg-[#F8FAF9] rounded-2xl border border-gray-100">
      <div className="text-3xl font-bold text-primary mb-2">{value}</div>
      <div className="text-sm text-gray-500 leading-snug">{label}</div>
    </div>
  );
}
