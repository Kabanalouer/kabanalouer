import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Politique de confidentialité de Kabanalouer — comment nous collectons, utilisons et protégeons vos données personnelles, conformément à la Loi 25 du Québec.",
  alternates: { canonical: "/confidentialite" },
  openGraph: {
    title: "Politique de confidentialité | Kabanalouer",
    description: "Politique de confidentialité de Kabanalouer.",
    url: "/confidentialite",
  },
};

const TOC = [
  { id: "responsable", label: "1. Responsable du traitement" },
  { id: "donnees-collectees", label: "2. Données collectées" },
  { id: "utilisation", label: "3. Utilisation des données" },
  { id: "partage", label: "4. Partage des données" },
  { id: "droits", label: "5. Vos droits (Loi 25)" },
  { id: "conservation", label: "6. Conservation des données" },
  { id: "cookies", label: "7. Cookies et technologies similaires" },
  { id: "securite", label: "8. Sécurité des données" },
  { id: "modifications", label: "9. Modifications de la politique" },
  { id: "contact", label: "10. Contact" },
];

export default function ConfidentialitePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16 w-full flex-1">
        {/* Header */}
        <div className="mb-10">
          <p className="text-xs text-charcoal-400 uppercase tracking-widest mb-2">Légal</p>
          <h1 className="text-3xl font-bold text-charcoal-800 mb-3">
            Politique de confidentialité
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
          La présente politique de confidentialité décrit comment Kabanalouer (« nous »,
          « notre ») collecte, utilise et protège vos données personnelles lorsque vous
          utilisez la plateforme accessible à <strong>kabanalouer.vercel.app</strong>. Elle
          est conforme à la{" "}
          <em>Loi modernisant des dispositions législatives en matière de protection des
          renseignements personnels</em> (Loi 25, Québec) et à la{" "}
          <em>Loi sur la protection des renseignements personnels et les documents
          électroniques</em> (LPRPDE, Canada).
        </p>

        <div className="space-y-12 text-charcoal-700">

          {/* 1 */}
          <section id="responsable" className="scroll-mt-24">
            <H2>1. Responsable du traitement</H2>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>
                Le responsable du traitement de vos données personnelles est{" "}
                <strong>Kabanalouer</strong>, exploitant la plateforme kabanalouer.vercel.app.
              </p>
              <p>
                Pour toute question relative à la protection de vos données, vous pouvez
                contacter notre responsable de la protection des renseignements personnels à :{" "}
                <a href="mailto:support@kabanalouer.ca" className="text-primary hover:underline">
                  support@kabanalouer.ca
                </a>
              </p>
            </div>
          </section>

          {/* 2 */}
          <section id="donnees-collectees" className="scroll-mt-24">
            <H2>2. Données collectées</H2>
            <div className="space-y-4 text-sm leading-relaxed">
              <p>Nous collectons les catégories de données suivantes :</p>

              <div>
                <p className="font-semibold text-charcoal-800 mb-2">Données d&apos;inscription</p>
                <ul className="list-disc list-inside space-y-1 pl-2 text-charcoal-600">
                  <li>Adresse courriel</li>
                  <li>Prénom et nom</li>
                  <li>Mot de passe (stocké sous forme hachée, jamais en clair)</li>
                  <li>Rôle (propriétaire ou voyageur)</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-charcoal-800 mb-2">Données d&apos;annonce (propriétaires)</p>
                <ul className="list-disc list-inside space-y-1 pl-2 text-charcoal-600">
                  <li>Informations sur le chalet (titre, description, adresse, équipements, tarifs)</li>
                  <li>Photos téléversées</li>
                  <li>Numéro CITQ</li>
                  <li>Calendrier de disponibilités et liens iCal</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-charcoal-800 mb-2">Données de navigation</p>
                <ul className="list-disc list-inside space-y-1 pl-2 text-charcoal-600">
                  <li>Adresse IP</li>
                  <li>Type de navigateur et système d&apos;exploitation</li>
                  <li>Pages visitées et durée des visites</li>
                  <li>Source de trafic (référent)</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-charcoal-800 mb-2">Données de messagerie</p>
                <ul className="list-disc list-inside space-y-1 pl-2 text-charcoal-600">
                  <li>Contenu des messages échangés entre propriétaires et voyageurs via la plateforme</li>
                  <li>Horodatage des messages</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-charcoal-800 mb-2">Données de paiement (propriétaires)</p>
                <ul className="list-disc list-inside space-y-1 pl-2 text-charcoal-600">
                  <li>
                    Nous ne stockons pas vos données de paiement. Les transactions sont traitées
                    directement par <strong>Stripe</strong>. Nous conservons uniquement
                    l&apos;identifiant de souscription Stripe.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* 3 */}
          <section id="utilisation" className="scroll-mt-24">
            <H2>3. Utilisation des données</H2>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>Vos données sont utilisées pour :</p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>Créer et gérer votre compte utilisateur.</li>
                <li>Afficher vos annonces aux voyageurs sur la plateforme.</li>
                <li>
                  Permettre la communication entre propriétaires et voyageurs via la messagerie
                  intégrée.
                </li>
                <li>Traiter les paiements d&apos;abonnement via Stripe.</li>
                <li>
                  Envoyer des notifications transactionnelles (nouveau message, expiration
                  d&apos;abonnement, etc.).
                </li>
                <li>
                  Améliorer la plateforme en analysant les comportements de navigation
                  (données agrégées et anonymisées).
                </li>
                <li>Respecter nos obligations légales et réglementaires.</li>
              </ul>
              <p>
                Nous n&apos;utilisons pas vos données à des fins de publicité ciblée auprès de
                tiers et ne les vendons jamais.
              </p>
            </div>
          </section>

          {/* 4 */}
          <section id="partage" className="scroll-mt-24">
            <H2>4. Partage des données</H2>
            <div className="space-y-4 text-sm leading-relaxed">
              <p>
                Nous faisons appel à des prestataires de confiance pour exploiter la
                plateforme. Ces tiers agissent à titre de sous-traitants et ne peuvent utiliser
                vos données qu&apos;aux fins pour lesquelles nous les avons engagés.
              </p>
              <ul className="space-y-3">
                <LegalItem term="Supabase">
                  Base de données et authentification. Données stockées sur des serveurs AWS
                  (région us-east-1). Politique :{" "}
                  <span className="text-charcoal-500">supabase.com/privacy</span>
                </LegalItem>
                <LegalItem term="Vercel">
                  Hébergement et déploiement de la plateforme. Logs d&apos;accès conservés
                  selon la politique de Vercel. Politique :{" "}
                  <span className="text-charcoal-500">vercel.com/legal/privacy-policy</span>
                </LegalItem>
                <LegalItem term="Stripe">
                  Traitement des paiements d&apos;abonnement propriétaire. Stripe est certifié
                  PCI-DSS. Politique :{" "}
                  <span className="text-charcoal-500">stripe.com/privacy</span>
                </LegalItem>
                <LegalItem term="Google Analytics">
                  Analyse du trafic web (données agrégées et anonymisées). Adresses IP
                  tronquées. Politique :{" "}
                  <span className="text-charcoal-500">policies.google.com/privacy</span>
                </LegalItem>
                <LegalItem term="Anthropic (Claude AI)">
                  Génération automatique de description d&apos;annonce (fonctionnalité
                  optionnelle). Seul le contenu de l&apos;annonce est transmis, sans données
                  personnelles identifiantes. Politique :{" "}
                  <span className="text-charcoal-500">anthropic.com/privacy</span>
                </LegalItem>
              </ul>
              <p>
                En dehors de ces prestataires, nous ne partageons vos données avec aucun tiers,
                sauf obligation légale (réponse à une autorité compétente, ordonnance judiciaire).
              </p>
            </div>
          </section>

          {/* 5 */}
          <section id="droits" className="scroll-mt-24">
            <H2>5. Vos droits (Loi 25)</H2>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>
                Conformément à la Loi 25 du Québec, vous disposez des droits suivants
                concernant vos renseignements personnels :
              </p>
              <ul className="space-y-3">
                <LegalItem term="Droit d'accès">
                  Vous pouvez demander à consulter les renseignements personnels que nous
                  détenons à votre sujet.
                </LegalItem>
                <LegalItem term="Droit de rectification">
                  Vous pouvez demander la correction de renseignements inexacts, incomplets
                  ou équivoques.
                </LegalItem>
                <LegalItem term="Droit à l'effacement">
                  Vous pouvez demander la suppression de vos renseignements personnels,
                  sous réserve de nos obligations légales de conservation.
                </LegalItem>
                <LegalItem term="Droit à la portabilité">
                  Vous pouvez demander à recevoir vos renseignements personnels dans un
                  format technologique structuré et couramment utilisé.
                </LegalItem>
                <LegalItem term="Droit à la désindexation">
                  Dans certaines circonstances, vous pouvez demander qu&apos;un hyperlien
                  permettant d&apos;accéder à vos informations soit désindexé.
                </LegalItem>
                <LegalItem term="Droit d'opposition">
                  Vous pouvez vous opposer à l&apos;utilisation de vos données à certaines
                  fins, notamment à des fins de communication.
                </LegalItem>
              </ul>
              <p>
                Pour exercer ces droits, envoyez votre demande à{" "}
                <a href="mailto:support@kabanalouer.ca" className="text-primary hover:underline">
                  support@kabanalouer.ca
                </a>
                . Nous traiterons votre demande dans un délai de 30 jours.
              </p>
            </div>
          </section>

          {/* 6 */}
          <section id="conservation" className="scroll-mt-24">
            <H2>6. Conservation des données</H2>
            <div className="space-y-3 text-sm leading-relaxed">
              <ul className="space-y-3">
                <LegalItem term="Compte actif">
                  Vos données sont conservées pour toute la durée de vie de votre compte.
                </LegalItem>
                <LegalItem term="Abonnement expiré">
                  Vos données d&apos;annonce sont conservées <strong>90 jours</strong> après
                  l&apos;expiration de votre abonnement pour permettre un renouvellement.
                  Au-delà, elles sont supprimées ou anonymisées.
                </LegalItem>
                <LegalItem term="Compte supprimé">
                  Vos données personnelles sont supprimées dans un délai de 30 jours suivant
                  la suppression de votre compte. Les données nécessaires au respect de nos
                  obligations légales (facturation) peuvent être conservées plus longtemps.
                </LegalItem>
                <LegalItem term="Messagerie">
                  Les messages sont conservés tant que les deux comptes concernés existent.
                  La suppression d&apos;un compte entraîne l&apos;anonymisation des messages
                  associés.
                </LegalItem>
                <LegalItem term="Données de navigation">
                  Les logs d&apos;accès sont conservés selon les politiques de Vercel
                  (généralement 30 jours). Les données Google Analytics sont agrégées et
                  conservées 14 mois.
                </LegalItem>
              </ul>
            </div>
          </section>

          {/* 7 */}
          <section id="cookies" className="scroll-mt-24">
            <H2>7. Cookies et technologies similaires</H2>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>Nous utilisons les types de cookies suivants :</p>
              <ul className="space-y-3">
                <LegalItem term="Cookies essentiels">
                  Nécessaires au fonctionnement de la plateforme (session d&apos;authentification,
                  préférences de navigation). Ne peuvent pas être désactivés.
                </LegalItem>
                <LegalItem term="Cookies analytiques">
                  Google Analytics pour comprendre l&apos;utilisation de la plateforme.
                  Ces cookies sont anonymisés et ne permettent pas de vous identifier
                  personnellement.
                </LegalItem>
              </ul>
              <p>
                Vous pouvez gérer vos préférences de cookies via les paramètres de votre
                navigateur. La désactivation des cookies essentiels peut affecter le
                fonctionnement de la plateforme.
              </p>
            </div>
          </section>

          {/* 8 */}
          <section id="securite" className="scroll-mt-24">
            <H2>8. Sécurité des données</H2>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>
                Nous mettons en œuvre des mesures techniques et organisationnelles appropriées
                pour protéger vos données personnelles contre tout accès non autorisé,
                divulgation, modification ou destruction :
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>Transmission des données chiffrée via HTTPS (TLS 1.2+).</li>
                <li>Mots de passe hachés avec bcrypt (via Supabase Auth).</li>
                <li>Accès à la base de données restreint par Row Level Security (RLS).</li>
                <li>
                  Clés d&apos;API sensibles stockées en variables d&apos;environnement,
                  jamais exposées côté client.
                </li>
                <li>
                  Révision régulière des accès et des permissions au sein de notre équipe.
                </li>
              </ul>
              <p>
                En cas de violation de données susceptible d&apos;engendrer un risque sérieux
                pour vos droits, nous vous en informerons dans les délais prévus par la
                loi (72 heures pour les autorités, dès que possible pour les personnes
                concernées).
              </p>
            </div>
          </section>

          {/* 9 */}
          <section id="modifications" className="scroll-mt-24">
            <H2>9. Modifications de la politique</H2>
            <p className="text-sm leading-relaxed">
              Nous pouvons mettre à jour la présente politique de confidentialité pour refléter
              des changements dans nos pratiques ou pour satisfaire aux exigences légales. En
              cas de modification substantielle, nous vous en informerons par courriel ou via
              un avis visible sur la plateforme au moins 15 jours avant l&apos;entrée en
              vigueur des changements. La date de la dernière mise à jour est indiquée en
              haut de cette page.
            </p>
          </section>

          {/* 10 */}
          <section id="contact" className="scroll-mt-24">
            <H2>10. Contact</H2>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>
                Pour toute question, demande d&apos;exercice de vos droits ou plainte
                concernant le traitement de vos données personnelles, contactez-nous à :
              </p>
              <p>
                <a
                  href="mailto:support@kabanalouer.ca"
                  className="text-primary hover:underline"
                >
                  support@kabanalouer.ca
                </a>
              </p>
              <p>
                Si vous estimez que vos droits ne sont pas respectés, vous pouvez également
                déposer une plainte auprès de la{" "}
                <strong>Commission d&apos;accès à l&apos;information du Québec (CAI)</strong>.
              </p>
            </div>
          </section>

        </div>

        {/* Back links */}
        <div className="mt-16 pt-8 border-t border-[#ebebeb] flex flex-col sm:flex-row gap-3">
          <Link href="/conditions" className="text-sm text-primary hover:underline">
            Conditions d&apos;utilisation →
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
