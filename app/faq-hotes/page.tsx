import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ Hôtes",
  description:
    "Toutes les réponses à vos questions sur la publication de votre chalet sur Kabanalouer.",
  alternates: { canonical: "/faq-hotes" },
  openGraph: {
    title: "FAQ Hôtes | Kabanalouer",
    description:
      "Toutes les réponses à vos questions sur la publication de votre chalet sur Kabanalouer.",
    url: "/faq-hotes",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Comment créer mon annonce ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Créez un compte hôte gratuit, remplissez les informations de votre chalet (photos, description, équipements, calendrier), puis activez votre annonce via la section « Publier mon annonce ».",
      },
    },
    {
      "@type": "Question",
      name: "Combien de temps faut-il pour créer une annonce ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Entre 15 et 30 minutes pour une annonce complète. Notre IA peut générer votre titre et description automatiquement.",
      },
    },
    {
      "@type": "Question",
      name: "Ai-je besoin d'un numéro CITQ ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Oui, un numéro CITQ valide à 6 chiffres est obligatoire pour publier votre annonce sur Kabanalouer, conformément à la réglementation québécoise.",
      },
    },
    {
      "@type": "Question",
      name: "Combien de photos puis-je ajouter ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Jusqu'à 80 photos par annonce. Un minimum de 5 photos est requis pour publier. Les photos sont automatiquement compressées en WebP.",
      },
    },
    {
      "@type": "Question",
      name: "La synchronisation iCal est-elle automatique ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Oui, une synchronisation automatique se fait toutes les heures. Vous pouvez aussi forcer une synchronisation manuelle à tout moment.",
      },
    },
    {
      "@type": "Question",
      name: "Que se passe-t-il si je ne renouvelle pas ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Votre annonce est automatiquement dépubliée à l'expiration. Vos données sont conservées 90 jours.",
      },
    },
    {
      "@type": "Question",
      name: "Puis-je avoir plusieurs chalets ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Oui, chaque chalet nécessite son propre abonnement à 299 $/an.",
      },
    },
  ],
};

type FaqSection = {
  title: string;
  items: { q: string; a: string }[];
};

const SECTIONS: FaqSection[] = [
  {
    title: "Démarrage",
    items: [
      {
        q: "Comment créer mon annonce ?",
        a: "Créez un compte hôte gratuit, remplissez les informations de votre chalet (photos, description, équipements, calendrier), puis activez votre annonce via la section « Publier mon annonce ».",
      },
      {
        q: "Combien de temps faut-il pour créer une annonce ?",
        a: "Entre 15 et 30 minutes pour une annonce complète. Notre IA peut générer votre titre et description automatiquement.",
      },
      {
        q: "Ai-je besoin d'un numéro CITQ ?",
        a: "Oui, un numéro CITQ valide à 6 chiffres est obligatoire pour publier votre annonce sur Kabanalouer, conformément à la réglementation québécoise.",
      },
    ],
  },
  {
    title: "Photos",
    items: [
      {
        q: "Combien de photos puis-je ajouter ?",
        a: "Jusqu'à 80 photos par annonce. Un minimum de 5 photos est requis pour publier. Les photos sont automatiquement compressées en WebP pour une qualité optimale.",
      },
      {
        q: "Quelles sont les exigences pour les photos ?",
        a: "Formats acceptés : JPG, PNG, WebP. Taille maximum : 2 Mo par photo après compression automatique. Résolution recommandée : minimum 1920 px.",
      },
    ],
  },
  {
    title: "Calendrier et disponibilités",
    items: [
      {
        q: "Comment gérer mes disponibilités ?",
        a: "Dans votre tableau de bord, accédez à la section « Calendrier » de votre annonce. Vous pouvez bloquer des dates manuellement ou synchroniser automatiquement via iCal (Airbnb, Booking.com, etc.).",
      },
      {
        q: "La synchronisation iCal est-elle automatique ?",
        a: "Oui, une synchronisation automatique se fait toutes les heures. Vous pouvez aussi forcer une synchronisation manuelle à tout moment.",
      },
    ],
  },
  {
    title: "Messagerie et voyageurs",
    items: [
      {
        q: "Comment les voyageurs me contactent-ils ?",
        a: "Via la messagerie intégrée de Kabanalouer. Vous recevez une notification par courriel à chaque nouveau message.",
      },
      {
        q: "Les coordonnées des voyageurs sont-elles visibles ?",
        a: "Les voyageurs vous contactent via notre messagerie. Leurs coordonnées (courriel, téléphone) sont incluses dans leur demande de contact.",
      },
    ],
  },
  {
    title: "Abonnement",
    items: [
      {
        q: "Que se passe-t-il si je ne renouvelle pas ?",
        a: "Votre annonce est automatiquement dépubliée à l'expiration. Vos données sont conservées 90 jours.",
      },
      {
        q: "Puis-je avoir plusieurs chalets ?",
        a: "Oui, chaque chalet nécessite son propre abonnement à 299 $/an.",
      },
      {
        q: "L'offre gratuite s'applique-t-elle à tous mes chalets ?",
        a: "L'offre gratuite s'applique aux 50 premiers abonnements activés sur la plateforme, tous hôtes confondus.",
      },
    ],
  },
];

export default function FaqHotesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Navbar />

      {/* ── Hero ── */}
      <section className="bg-[#F8FAF9] border-b border-gray-100 py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            🏡 Pour les hôtes
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-5 leading-tight">
            Questions fréquentes — Hôtes
          </h1>
          <p className="text-lg text-gray-500 max-w-lg mx-auto">
            Tout ce que vous devez savoir pour afficher votre chalet sur Kabanalouer
          </p>
        </div>
      </section>

      {/* ── FAQ sections ── */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-14">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h2 className="text-lg font-bold text-gray-900 mb-4 pb-3 border-b border-gray-100">
                {section.title}
              </h2>
              <div className="space-y-3">
                {section.items.map(({ q, a }) => (
                  <details
                    key={q}
                    className="group border border-gray-100 rounded-2xl bg-[#F8FAF9] overflow-hidden"
                  >
                    <summary className="flex items-center justify-between px-6 py-4 cursor-pointer list-none font-semibold text-gray-900 text-sm select-none">
                      {q}
                      <svg
                        className="w-4 h-4 text-gray-400 shrink-0 ml-3 transition-transform group-open:rotate-180"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="px-6 pb-5 text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-4">
                      {a}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-[#F8FAF9] border-t border-gray-100 py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Vous avez d&apos;autres questions ?
          </h2>
          <p className="text-gray-500 mb-8">
            Notre équipe est disponible pour vous accompagner.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup?role=host"
              className="inline-flex items-center justify-center bg-primary text-white font-bold px-8 py-4 rounded-xl hover:bg-primary/90 transition-colors"
            >
              Inscrire mon chalet →
            </Link>
            <Link
              href="/tarifs"
              className="inline-flex items-center justify-center border border-gray-200 text-gray-700 font-semibold px-8 py-4 rounded-xl hover:border-primary hover:text-primary transition-colors"
            >
              Voir les tarifs
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
