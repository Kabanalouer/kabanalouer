import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description:
    "Conditions d'utilisation de la plateforme Kabanalouer — marketplace de location de chalets au Québec.",
  alternates: { canonical: "/conditions" },
  openGraph: {
    title: "Conditions d'utilisation | Kabanalouer",
    description: "Conditions d'utilisation de la plateforme Kabanalouer.",
    url: "/conditions",
  },
};

const TOC = [
  { id: "definitions", label: "1. Définitions" },
  { id: "service", label: "2. Description du service" },
  { id: "inscription", label: "3. Inscription et comptes" },
  { id: "hotes", label: "4. Obligations des propriétaires" },
  { id: "voyageurs", label: "5. Obligations des voyageurs" },
  { id: "abonnement", label: "6. Abonnement propriétaire" },
  { id: "contenu-interdit", label: "7. Contenu interdit" },
  { id: "propriete-intellectuelle", label: "8. Propriété intellectuelle" },
  { id: "responsabilite", label: "9. Limitation de responsabilité" },
  { id: "resiliation", label: "10. Résiliation" },
  { id: "droit", label: "11. Droit applicable" },
  { id: "contact", label: "12. Contact" },
];

export default function ConditionsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16 w-full flex-1">
        {/* Header */}
        <div className="mb-10">
          <p className="text-xs text-charcoal-400 uppercase tracking-widest mb-2">Légal</p>
          <h1 className="text-3xl font-bold text-charcoal-800 mb-3">
            Conditions d&apos;utilisation
          </h1>
          <p className="text-sm text-charcoal-400">Dernière mise à jour : mai 2026</p>
        </div>

        {/* Table of contents */}
        <nav className="bg-charcoal-50 rounded-2xl p-6 mb-12 border border-[#ebebeb]">
          <p className="text-xs font-semibold text-charcoal-400 uppercase tracking-widest mb-4">
            Table des matières
          </p>
          <ol className="space-y-2">
            {TOC.map(({ id, label }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="text-sm text-primary hover:underline"
                >
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Intro */}
        <p className="text-charcoal-600 leading-relaxed mb-10">
          Les présentes conditions d&apos;utilisation (« Conditions ») régissent l&apos;accès et
          l&apos;utilisation de la plateforme Kabanalouer, accessible à l&apos;adresse{" "}
          <strong>kabanalouer.vercel.app</strong>, exploitée par Kabanalouer (« nous »,
          « notre »). En accédant à la plateforme ou en l&apos;utilisant, vous acceptez
          d&apos;être lié par ces Conditions.
        </p>

        <div className="space-y-12 text-charcoal-700">

          {/* 1 */}
          <section id="definitions" className="scroll-mt-24">
            <H2>1. Définitions</H2>
            <ul className="space-y-2 text-sm leading-relaxed">
              <LegalItem term="Plateforme">
                Le site web Kabanalouer et ses fonctionnalités, accessible à
                kabanalouer.vercel.app.
              </LegalItem>
              <LegalItem term="Propriétaire">
                Tout utilisateur qui crée une annonce de location de chalet sur la Plateforme.
              </LegalItem>
              <LegalItem term="Voyageur">
                Tout utilisateur qui consulte les annonces et contacte des propriétaires via la
                Plateforme.
              </LegalItem>
              <LegalItem term="Annonce">
                L&apos;ensemble des informations publiées par un Propriétaire pour présenter son chalet
                (description, photos, tarifs, disponibilités).
              </LegalItem>
              <LegalItem term="Abonnement">
                Le forfait annuel souscrit par un Propriétaire pour publier une Annonce sur la
                Plateforme.
              </LegalItem>
            </ul>
          </section>

          {/* 2 */}
          <section id="service" className="scroll-mt-24">
            <H2>2. Description du service</H2>
            <p className="text-sm leading-relaxed">
              Kabanalouer est une plateforme de mise en relation entre propriétaires de chalets
              (Propriétaires) et locataires potentiels (Voyageurs) au Québec. Kabanalouer facilite la
              publication d&apos;annonces et la communication entre utilisateurs, mais{" "}
              <strong>n&apos;est pas partie aux contrats de location</strong> conclus entre les
              Propriétaires et les Voyageurs. Les transactions financières se font directement entre
              Propriétaires et Voyageurs, sans que Kabanalouer n&apos;intervienne comme intermédiaire de
              paiement dans les transactions locatives.
            </p>
          </section>

          {/* 3 */}
          <section id="inscription" className="scroll-mt-24">
            <H2>3. Inscription et comptes utilisateurs</H2>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>
                Pour accéder à certaines fonctionnalités (messagerie, publication
                d&apos;annonces), vous devez créer un compte avec une adresse courriel valide.
              </p>
              <p>
                Vous êtes responsable de la confidentialité de vos identifiants de connexion et
                de toute activité effectuée depuis votre compte. Vous devez nous notifier sans
                délai de tout accès non autorisé à votre compte.
              </p>
              <p>
                Vous déclarez que les informations fournies lors de l&apos;inscription sont
                exactes, complètes et à jour. Kabanalouer se réserve le droit de suspendre ou
                supprimer tout compte contenant des informations fausses ou trompeuses.
              </p>
            </div>
          </section>

          {/* 4 */}
          <section id="hotes" className="scroll-mt-24">
            <H2>4. Obligations des propriétaires</H2>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>En tant que Propriétaire, vous vous engagez à :</p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>
                  <strong>Détenir un numéro CITQ valide</strong> (6 chiffres) conformément
                  à la Loi sur les établissements d&apos;hébergement touristique du Québec.
                  Ce numéro est obligatoire pour publier une Annonce sur Kabanalouer.
                </li>
                <li>
                  Fournir des informations exactes, complètes et non trompeuses concernant
                  votre chalet (localisation, équipements, capacité, tarifs, règles).
                </li>
                <li>
                  Maintenir votre calendrier de disponibilités à jour afin d&apos;éviter les
                  conflits de réservation.
                </li>
                <li>
                  Respecter toutes les lois, règlements et obligations fiscales applicables
                  à la location de courte durée au Québec.
                </li>
                <li>
                  Répondre aux demandes des Voyageurs dans un délai raisonnable
                  (recommandé : 48 heures).
                </li>
                <li>
                  Ne pas solliciter les Voyageurs pour contourner la Plateforme lors des
                  premières prises de contact.
                </li>
              </ul>
            </div>
          </section>

          {/* 5 */}
          <section id="voyageurs" className="scroll-mt-24">
            <H2>5. Obligations des voyageurs</H2>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>En tant que Voyageur, vous vous engagez à :</p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>
                  Utiliser la Plateforme uniquement pour des fins légitimes de recherche de
                  logement.
                </li>
                <li>
                  Respecter les règles de la maison communiquées par le Propriétaire lors de
                  votre séjour.
                </li>
                <li>
                  Fournir des informations véridiques dans vos demandes de contact.
                </li>
                <li>
                  Ne pas harceler ou importuner les Propriétaires.
                </li>
              </ul>
            </div>
          </section>

          {/* 6 */}
          <section id="abonnement" className="scroll-mt-24">
            <H2>6. Abonnement propriétaire</H2>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>
                La publication d&apos;une Annonce requiert la souscription à un abonnement annuel
                au prix de <strong>299 $ CAD par chalet</strong>, sauf dans le cadre de
                l&apos;offre de lancement accordée aux premiers propriétaires.
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>
                  L&apos;abonnement est <strong>par chalet</strong> : plusieurs chalets
                  nécessitent plusieurs abonnements distincts.
                </li>
                <li>
                  Le paiement est traité via Stripe. En souscrivant, vous acceptez les
                  conditions d&apos;utilisation de Stripe.
                </li>
                <li>
                  L&apos;abonnement est <strong>non remboursable</strong> et non transférable.
                </li>
                <li>
                  À l&apos;expiration, votre Annonce est automatiquement dépubliée. Vos données
                  sont conservées pendant 90 jours pour permettre un renouvellement.
                </li>
                <li>
                  Kabanalouer se réserve le droit de modifier les tarifs avec un préavis de
                  30 jours par courriel.
                </li>
              </ul>
            </div>
          </section>

          {/* 7 */}
          <section id="contenu-interdit" className="scroll-mt-24">
            <H2>7. Contenu interdit</H2>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>Il est interdit de publier ou diffuser sur la Plateforme :</p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>Des informations fausses, trompeuses ou frauduleuses.</li>
                <li>
                  Des annonces pour des propriétés que vous ne gérez pas ou n&apos;êtes pas
                  autorisé à louer.
                </li>
                <li>Tout contenu discriminatoire, offensant ou illégal.</li>
                <li>
                  Des liens ou redirections vers des plateformes concurrentes dans le but de
                  détourner du trafic.
                </li>
                <li>
                  Tout contenu portant atteinte aux droits de propriété intellectuelle de tiers.
                </li>
              </ul>
              <p>
                Kabanalouer se réserve le droit de supprimer tout contenu non conforme et de
                suspendre ou résilier le compte de l&apos;utilisateur fautif, sans préavis ni
                remboursement.
              </p>
            </div>
          </section>

          {/* 8 */}
          <section id="propriete-intellectuelle" className="scroll-mt-24">
            <H2>8. Propriété intellectuelle</H2>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>
                La Plateforme, son design, son code source, ses marques et son contenu éditorial
                sont la propriété exclusive de Kabanalouer et protégés par les lois canadiennes
                sur la propriété intellectuelle.
              </p>
              <p>
                En publiant des photos et textes sur la Plateforme, vous accordez à Kabanalouer
                une licence non exclusive, mondiale et gratuite pour les afficher et les
                promouvoir dans le cadre du fonctionnement de la Plateforme et de ses
                communications marketing.
              </p>
              <p>
                Vous déclarez détenir tous les droits nécessaires sur le contenu que vous publiez
                et garantissez Kabanalouer contre tout recours de tiers à ce sujet.
              </p>
            </div>
          </section>

          {/* 9 */}
          <section id="responsabilite" className="scroll-mt-24">
            <H2>9. Limitation de responsabilité</H2>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>
                Kabanalouer est une <strong>plateforme de mise en relation</strong> et
                n&apos;est pas partie aux contrats conclus entre Propriétaires et Voyageurs.
                Kabanalouer ne peut être tenu responsable :
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>
                  Des litiges survenant dans le cadre d&apos;une location (non-paiement,
                  dommages, annulation, désaccord sur l&apos;état du logement).
                </li>
                <li>
                  De l&apos;exactitude des informations publiées par les Propriétaires.
                </li>
                <li>
                  Des actes ou omissions des utilisateurs sur la Plateforme.
                </li>
                <li>
                  Des interruptions de service dues à des pannes techniques, maintenances ou
                  événements hors de notre contrôle.
                </li>
              </ul>
              <p>
                Dans toute la mesure permise par la loi, la responsabilité de Kabanalouer est
                limitée au montant de l&apos;abonnement payé par l&apos;utilisateur au cours
                des 12 derniers mois.
              </p>
            </div>
          </section>

          {/* 10 */}
          <section id="resiliation" className="scroll-mt-24">
            <H2>10. Résiliation</H2>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>
                Vous pouvez résilier votre compte à tout moment depuis votre tableau de bord ou
                en nous contactant par courriel. La résiliation n&apos;entraîne pas de
                remboursement de l&apos;abonnement en cours.
              </p>
              <p>
                Kabanalouer peut suspendre ou résilier votre accès sans préavis en cas de
                violation des présentes Conditions, d&apos;activité frauduleuse ou de comportement
                nuisant à la communauté ou à la réputation de la Plateforme.
              </p>
            </div>
          </section>

          {/* 11 */}
          <section id="droit" className="scroll-mt-24">
            <H2>11. Droit applicable</H2>
            <p className="text-sm leading-relaxed">
              Les présentes Conditions sont régies par les lois de la province de Québec et les
              lois fédérales du Canada qui s&apos;y appliquent. Tout litige découlant de ces
              Conditions sera soumis à la compétence exclusive des tribunaux du Québec.
            </p>
          </section>

          {/* 12 */}
          <section id="contact" className="scroll-mt-24">
            <H2>12. Contact</H2>
            <p className="text-sm leading-relaxed">
              Pour toute question concernant ces Conditions, vous pouvez nous contacter à
              l&apos;adresse :{" "}
              <a
                href="mailto:support@kabanalouer.ca"
                className="text-primary hover:underline"
              >
                support@kabanalouer.ca
              </a>
            </p>
          </section>

        </div>

        {/* Back links */}
        <div className="mt-16 pt-8 border-t border-[#ebebeb] flex flex-col sm:flex-row gap-3">
          <Link href="/confidentialite" className="text-sm text-primary hover:underline">
            Politique de confidentialité →
          </Link>
          <Link href="/" className="text-sm text-charcoal-400 hover:text-charcoal-600">
            Retour à l&apos;accueil
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-bold text-charcoal-800 mb-4 pb-2 border-b border-[#ebebeb]">
      {children}
    </h2>
  );
}

function LegalItem({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <li>
      <strong>{term} :</strong>{" "}
      <span className="text-charcoal-600">{children}</span>
    </li>
  );
}
