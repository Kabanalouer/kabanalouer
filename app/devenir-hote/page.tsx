import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const metadata = {
  title: "Affichez votre chalet sur Kabanalouer | 50 premiers hôtes gratuits",
  description:
    "Rejoignez la marketplace de chalets au Québec. Contact direct avec les voyageurs, zéro commission, 299$/an. Offre gratuite pour les 50 premiers hôtes.",
  alternates: { canonical: "/devenir-hote" },
  openGraph: {
    title: "Affichez votre chalet sur Kabanalouer | 50 premiers hôtes gratuits",
    description:
      "Rejoignez la marketplace de chalets au Québec. Contact direct avec les voyageurs, zéro commission, 299$/an.",
    url: "/devenir-hote",
    images: [
      {
        url: "https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=1200&q=80",
        width: 1200,
        height: 630,
        alt: "Chalet québécois — Kabanalouer",
      },
    ],
  },
  twitter: {
    title: "Affichez votre chalet sur Kabanalouer",
    description: "Zéro commission, contact direct avec les voyageurs. Offre gratuite pour les 50 premiers hôtes.",
    images: ["https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=1200&q=80"],
  },
};

const FREE_LAUNCH_LIMIT = 50;

async function getActiveSubscriptionCount(): Promise<number> {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { count } = await admin
    .from("subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");
  return count ?? 0;
}

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Kabanalouer",
  url: "https://kabanalouer.vercel.app",
  logo: "https://kabanalouer.vercel.app/favicon.ico",
  description:
    "Marketplace de location de chalets au Québec. Contact direct avec les propriétaires, zéro frais de service.",
  areaServed: {
    "@type": "AdministrativeArea",
    name: "Québec, Canada",
  },
  offers: {
    "@type": "Offer",
    name: "Abonnement annuel hôte",
    price: "299",
    priceCurrency: "CAD",
    description: "Abonnement annuel pour les propriétaires de chalets — tout inclus, aucune commission.",
  },
};

export default async function DevenirHotePage() {
  const usedSlots = await getActiveSubscriptionCount();
  const remaining = Math.max(0, FREE_LAUNCH_LIMIT - usedSlots);
  const progressPct = Math.min(100, Math.round((usedSlots / FREE_LAUNCH_LIMIT) * 100));
  const isUrgent = remaining < 10;

  return (
    <div className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative min-h-[600px] flex items-center z-10">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=1920&q=80')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/55 to-black/30" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-medium px-4 py-1.5 rounded-full mb-6">
              <span>🚀</span>
              <span>Plateforme à plus forte croissance au Québec</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Affichez votre chalet.
              <br />
              Rejoignez la communauté Kabanalouer.
            </h1>
            <p className="text-lg md:text-xl text-white/85 mb-10 leading-relaxed max-w-xl">
              La marketplace de référence pour la location de chalet au Québec.
              Contact direct avec les voyageurs, zéro frais de service.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/signup?role=host"
                className="inline-flex items-center justify-center gap-2 bg-primary text-white font-bold px-8 py-4 rounded-xl hover:bg-primary-dark transition-colors text-lg"
              >
                Inscrire mon chalet gratuitement →
              </Link>
              <Link
                href="/chalets"
                className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm border border-white/30 text-white font-semibold px-6 py-4 rounded-xl hover:bg-white/20 transition-colors text-base"
              >
                Voir les annonces
              </Link>
            </div>
            {remaining > 0 && (
              <p className="text-white/70 text-sm mt-5">
                ✦ {remaining} place{remaining !== 1 ? "s" : ""} gratuites restantes — offre de lancement
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Launch offer ── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-5">
            {isUrgent ? "🔥 Dernières places" : "🎉 Offre de lancement exclusive"}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            {remaining > 0 ? (
              <>Il reste <span className="text-primary">{remaining}</span> place{remaining !== 1 ? "s" : ""} gratuites</>
            ) : (
              "Offre de lancement terminée"
            )}
          </h2>
          <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto">
            {remaining > 0
              ? `Après les ${FREE_LAUNCH_LIMIT} premiers hôtes, l'abonnement sera de 299 $/an par chalet.`
              : "L'abonnement annuel est de 299 $/an par chalet."}
          </p>

          {/* Progress bar */}
          <div className="max-w-sm mx-auto mb-2">
            <div className="flex justify-between text-xs text-gray-400 mb-1.5">
              <span>{usedSlots} / {FREE_LAUNCH_LIMIT} places utilisées</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isUrgent ? "bg-red-500" : "bg-primary"}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {isUrgent && remaining > 0 && (
            <p className="text-red-600 text-xs font-semibold mt-3">
              ⚠️ Plus que {remaining} place{remaining !== 1 ? "s" : ""} — inscrivez-vous maintenant
            </p>
          )}

          <div className="mt-8">
            <Link
              href="/signup?role=host"
              className="inline-flex items-center gap-2 bg-primary text-white font-bold px-8 py-3.5 rounded-xl hover:bg-primary-dark transition-colors"
            >
              {remaining > 0 ? "Profiter de l'offre gratuite →" : "Commencer à 299 $/an →"}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Why Kabanalouer ── */}
      <section className="py-20 bg-[#F8FAF9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">Pourquoi choisir Kabanalouer ?</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">
              Une plateforme pensée pour les propriétaires de chalets québécois, pas pour les grandes plateformes internationales.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <BenefitCard
              emoji="🤝"
              title="Contact direct"
              description="Communiquez directement avec vos voyageurs. Pas d'intermédiaire, pas de commission sur vos revenus."
            />
            <BenefitCard
              emoji="💸"
              title="Zéro frais de service"
              description="Contrairement à Airbnb, aucun frais de service n'est prélevé sur vos réservations. Vous gardez 100 % de vos revenus."
            />
            <BenefitCard
              emoji="🍁"
              title="Plateforme spécialisée Québec"
              description="Une plateforme pensée pour les chalets québécois. Vos voyageurs cherchent spécifiquement au Québec."
            />
            <BenefitCard
              emoji="🛠️"
              title="Outils modernes inclus"
              description="Calendrier de disponibilités, sync iCal avec Airbnb et Booking, messagerie intégrée, tableau de bord et statistiques."
            />
            <BenefitCard
              emoji="🔍"
              title="Visibilité maximale"
              description="Référencement optimisé pour les recherches de chalets au Québec. Soyez trouvé par les bons voyageurs."
            />
            <BenefitCard
              emoji="📋"
              title="Tarif simple et transparent"
              description="Un seul abonnement annuel de 299 $/an par chalet. Pas de surprise, pas de commission cachée."
            />
          </div>
        </div>
      </section>

      {/* ── What's included ── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-12 items-center">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-5">
                299 $/an · tout inclus
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Tout ce dont vous avez besoin, inclus dans votre abonnement
              </h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Un seul forfait, sans module payant supplémentaire. Tout ce qu'il vous faut pour gérer et promouvoir votre chalet en ligne.
              </p>
              <ul className="space-y-3.5">
                {[
                  "Annonce illimitée avec photos HD",
                  "Messagerie directe avec les voyageurs",
                  "Calendrier de disponibilités (18 mois)",
                  "Synchronisation iCal (Airbnb, Booking, etc.)",
                  "Tableau de bord et statistiques",
                  "Génération de description par IA",
                  "Score de qualité et conseils",
                  "Support par courriel",
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">✓</span>
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-10">
                <Link
                  href="/signup?role=host"
                  className="inline-flex items-center gap-2 bg-primary text-white font-bold px-7 py-3.5 rounded-xl hover:bg-primary-dark transition-colors"
                >
                  Commencer gratuitement →
                </Link>
              </div>
            </div>

            {/* Price card */}
            <div className="w-full lg:w-72 shrink-0">
              <div className="bg-[#F8FAF9] rounded-2xl border border-gray-100 p-8 text-center">
                {remaining > 0 ? (
                  <>
                    <p className="text-sm text-gray-400 mb-1">Pour les {FREE_LAUNCH_LIMIT} premiers hôtes</p>
                    <div className="flex items-end justify-center gap-1 mb-1">
                      <span className="text-5xl font-bold text-primary">0 $</span>
                      <span className="text-gray-400 mb-1.5">/an</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-6">puis 299 $/an au renouvellement</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-400 mb-1">Abonnement annuel</p>
                    <div className="flex items-end justify-center gap-1 mb-1">
                      <span className="text-5xl font-bold text-primary">299 $</span>
                      <span className="text-gray-400 mb-1.5">/an</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-6">par chalet, tout inclus</p>
                  </>
                )}
                <div className="space-y-2 text-sm text-gray-600 text-left">
                  {["Annonce complète", "Outils de gestion", "Support inclus"].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <span className="text-primary text-xs">✓</span>
                      {item}
                    </div>
                  ))}
                </div>
                <Link
                  href="/signup?role=host"
                  className="mt-6 w-full inline-flex items-center justify-center bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary-dark transition-colors text-sm"
                >
                  Créer mon annonce
                </Link>
                <p className="text-xs text-gray-400 mt-3">Aucune carte requise pour commencer</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-20 bg-[#F8FAF9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">Ils font confiance à Kabanalouer</h2>
            <p className="text-gray-500 mt-3">Des propriétaires de toutes les régions du Québec</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Testimonial
              quote="Depuis que j'ai inscrit mon chalet sur Kabanalouer, je reçois des demandes de voyageurs directement sans passer par une plateforme américaine. C'est exactement ce que je cherchais !"
              name="Marie-Hélène B."
              region="Laurentides"
              stars={5}
            />
            <Testimonial
              quote="La synchronisation iCal avec mon calendrier Airbnb m'a sauvé des doubles réservations. L'interface est claire et le support est très réactif."
              name="François L."
              region="Charlevoix"
              stars={5}
            />
            <Testimonial
              quote="Pour 299 $ par an, j'ai tout ce qu'il me faut pour gérer mon chalet. Pas de commission, pas de surprise. Je recommande à tous les propriétaires québécois."
              name="Josée T."
              region="Estrie"
              stars={5}
            />
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-primary py-20">
        <div className="max-w-3xl mx-auto px-4 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Prêt à rejoindre la communauté ?
          </h2>
          <p className="text-white/80 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            Créez votre annonce en moins de 10 minutes.
            {remaining > 0 && (
              <> Profitez de l&apos;offre gratuite — il reste seulement <strong className="text-white">{remaining} place{remaining !== 1 ? "s" : ""}</strong>.</>
            )}
          </p>
          <Link
            href="/signup?role=host"
            className="inline-block bg-white text-primary font-bold px-10 py-4 rounded-xl hover:bg-gray-50 transition-colors text-lg"
          >
            Commencer gratuitement →
          </Link>
          {remaining > 0 ? (
            <p className="text-white/55 text-sm mt-5">
              Offre gratuite pour les {remaining} première{remaining !== 1 ? "s" : ""} place{remaining !== 1 ? "s" : ""} disponible{remaining !== 1 ? "s" : ""}
            </p>
          ) : (
            <p className="text-white/55 text-sm mt-5">
              Abonnement annuel · 299 $/an · Aucune commission
            </p>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

function BenefitCard({
  emoji,
  title,
  description,
}: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-primary/20 transition-colors">
      <div className="text-3xl mb-4">{emoji}</div>
      <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function Testimonial({
  quote,
  name,
  region,
  stars,
}: {
  quote: string;
  name: string;
  region: string;
  stars: number;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100">
      <div className="flex gap-0.5 mb-4">
        {Array.from({ length: stars }).map((_, i) => (
          <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <p className="text-gray-600 text-sm leading-relaxed mb-5 italic">&ldquo;{quote}&rdquo;</p>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
          {name[0]}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{name}</p>
          <p className="text-xs text-gray-400">{region}</p>
        </div>
      </div>
    </div>
  );
}
