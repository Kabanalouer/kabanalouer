import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Comment ça marche",
  description:
    "Trouvez et contactez directement les propriétaires de chalets au Québec. Aucun frais de service pour les voyageurs. 3 étapes simples.",
  alternates: { canonical: "/comment-ca-marche" },
  openGraph: {
    title: "Comment ça marche | Kabanalouer",
    description:
      "Trouvez et contactez directement les propriétaires de chalets au Québec. Aucun frais de service pour les voyageurs.",
    url: "/comment-ca-marche",
  },
  twitter: {
    title: "Comment ça marche | Kabanalouer",
    description: "3 étapes simples pour trouver et contacter les propriétaires de chalets au Québec.",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Est-ce que je paye sur Kabanalouer ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Non. Kabanalouer est une plateforme de mise en relation. Le paiement se fait directement entre vous et le propriétaire, selon les modalités convenues ensemble.",
      },
    },
    {
      "@type": "Question",
      name: "Comment contacter un propriétaire ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Cliquez sur « Contacter l'hôte » sur la fiche du chalet. Vous devez créer un compte gratuit pour envoyer un message.",
      },
    },
    {
      "@type": "Question",
      name: "Est-ce que je dois payer pour créer un compte ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Non, la création de compte voyageur est entièrement gratuite.",
      },
    },
    {
      "@type": "Question",
      name: "Comment savoir si un chalet est disponible ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Chaque fiche affiche un calendrier de disponibilités mis à jour par le propriétaire. Vous pouvez aussi filtrer par dates dans la recherche.",
      },
    },
    {
      "@type": "Question",
      name: "Que faire si le propriétaire ne répond pas ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Nous vous recommandons d'attendre 24-48h. Si vous n'avez pas de réponse, n'hésitez pas à contacter un autre chalet similaire.",
      },
    },
  ],
};

export default function CommentCaMarchePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Navbar />

      {/* ── Hero ── */}
      <section className="bg-[#F8FAF9] py-20 border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            🏡 Pour les voyageurs
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-5 leading-tight">
            Comment ça marche ?
          </h1>
          <p className="text-lg text-gray-500 max-w-lg mx-auto leading-relaxed">
            Trouver et réserver votre chalet idéal au Québec en 3 étapes simples.
          </p>
        </div>
      </section>

      {/* ── 3 Steps ── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            <Step
              number={1}
              emoji="🔍"
              title="Cherchez"
              description="Utilisez notre moteur de recherche pour trouver le chalet parfait. Filtrez par région, dates, nombre de voyageurs et équipements. Consultez les photos, les disponibilités et les avis des voyageurs précédents."
              action={{ label: "Explorer les chalets", href: "/chalets" }}
            />
            <Step
              number={2}
              emoji="💬"
              title="Contactez"
              description="Envoyez directement un message au propriétaire via notre messagerie intégrée. Posez vos questions, discutez des détails du séjour et obtenez une confirmation. Aucun intermédiaire, contact direct avec le propriétaire."
            />
            <Step
              number={3}
              emoji="🏡"
              title="Profitez"
              description="Une fois votre séjour confirmé avec le propriétaire, il ne vous reste plus qu'à préparer vos valises et profiter de votre escapade au cœur du Québec !"
            />
          </div>
        </div>
      </section>

      {/* ── Why Kabanalouer ── */}
      <section className="py-20 bg-[#F8FAF9]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">Pourquoi Kabanalouer ?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <WhyCard
              emoji="💸"
              title="Aucun frais de service"
              description="Contrairement aux grandes plateformes, Kabanalouer ne charge aucun frais de service aux voyageurs. Le prix affiché est le prix que vous payez."
            />
            <WhyCard
              emoji="🤝"
              title="Contact direct avec les propriétaires"
              description="Pas d'intermédiaire. Vous communiquez directement avec le propriétaire pour personnaliser votre séjour."
            />
            <WhyCard
              emoji="✅"
              title="Chalets québécois vérifiés"
              description="Tous nos hôtes sont vérifiés. Des chalets authentiques partout au Québec, pour tous les budgets et toutes les saisons."
            />
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Questions fréquentes
          </h2>
          <div className="space-y-4">
            <FaqItem
              question="Est-ce que je paye sur Kabanalouer ?"
              answer="Non. Kabanalouer est une plateforme de mise en relation. Le paiement se fait directement entre vous et le propriétaire, selon les modalités convenues ensemble."
            />
            <FaqItem
              question="Comment contacter un propriétaire ?"
              answer="Cliquez sur « Contacter l'hôte » sur la fiche du chalet. Vous devez créer un compte gratuit pour envoyer un message."
            />
            <FaqItem
              question="Est-ce que je dois payer pour créer un compte ?"
              answer="Non, la création de compte voyageur est entièrement gratuite."
            />
            <FaqItem
              question="Comment savoir si un chalet est disponible ?"
              answer="Chaque fiche affiche un calendrier de disponibilités mis à jour par le propriétaire. Vous pouvez aussi filtrer par dates dans la recherche."
            />
            <FaqItem
              question="Que faire si le propriétaire ne répond pas ?"
              answer="Nous vous recommandons d'attendre 24-48h. Si vous n'avez pas de réponse, n'hésitez pas à contacter un autre chalet similaire."
            />
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-primary py-20">
        <div className="max-w-2xl mx-auto px-4 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Prêt à trouver votre chalet ?</h2>
          <p className="text-white/80 text-lg mb-10">
            Des centaines de chalets québécois vous attendent.
          </p>
          <Link
            href="/chalets"
            className="inline-block bg-white text-primary font-bold px-10 py-4 rounded-xl hover:bg-gray-50 transition-colors text-lg"
          >
            Explorer les chalets →
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Step({
  number,
  emoji,
  title,
  description,
  action,
}: {
  number: number;
  emoji: string;
  title: string;
  description: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex gap-6 md:gap-10 items-start">
      {/* Number + connector */}
      <div className="flex flex-col items-center shrink-0">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-2xl font-black text-primary">{number}</span>
        </div>
        {number < 3 && (
          <div className="w-0.5 h-8 bg-primary/20 mt-3" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-8">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">{emoji}</span>
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        </div>
        <p className="text-gray-500 leading-relaxed max-w-xl">{description}</p>
        {action && (
          <Link
            href={action.href}
            className="inline-flex items-center gap-1.5 mt-4 text-primary font-semibold text-sm hover:underline"
          >
            {action.label} →
          </Link>
        )}
      </div>
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
      <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="border border-gray-100 rounded-2xl p-6 bg-[#F8FAF9]">
      <p className="font-semibold text-gray-900 mb-2">{question}</p>
      <p className="text-gray-500 text-sm leading-relaxed">{answer}</p>
    </div>
  );
}
