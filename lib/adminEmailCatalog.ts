// Catalogue des courriels du site, affiché dans Admin → Séquences courriel
// (app/admin/emails). Les envois de test passent par /api/admin/test-email,
// qui associe chaque `id` testable à sa fonction d'envoi.
//
// Tenir ce fichier à jour à chaque nouveau courriel ou changement de règle :
// c'est la seule vue d'ensemble que Simon consulte. Le statut « en pause »
// doit venir du même réglage que le code d'envoi (ex. BOOSTS_ENABLED), jamais
// d'une valeur recopiée à la main.

import { BOOSTS_ENABLED } from "@/lib/featuredConfig";

export type EmailCategory = "proprio" | "voyageur" | "compte" | "interne";

/** Comment l'envoi est déclenché */
export type EmailMechanism = "event" | "minute" | "hourly" | "daily" | "weekly";

export type CatalogEmail = {
  id: string;
  category: EmailCategory;
  /** Sous-section dans la catégorie (ordre d'affichage = ordre du tableau) */
  group: string;
  name: string;
  /** Le moment de l'envoi, en une phrase */
  when: string;
  /** Règles qui empêchent ou limitent l'envoi */
  conditions?: string;
  mechanism: EmailMechanism;
  /** Heure de la tâche quotidienne ou hebdomadaire (heure du Québec) */
  dailyAt?: string;
  paused?: boolean;
  pausedReason?: string;
  /** false : envoyé par Supabase (Send Email Hook), pas de bouton de test */
  testable: boolean;
  /** destinataire imposé dans le code (notifications internes) */
  fixedRecipient?: string;
  /** Objet des courriels dont le texte n'est pas modifiable dans l'admin
   *  (les autres viennent de lib/emailTemplates, version modifiée comprise) */
  subject?: { fr: string; en?: string };
};

export const MECHANISM_LABELS: Record<EmailMechanism, string> = {
  event: "Envoi immédiat",
  minute: "Vérifié chaque minute",
  hourly: "Vérifié toutes les heures",
  daily: "Tâche quotidienne",
  weekly: "Tâche hebdomadaire",
};

export const CATEGORY_ORDER: EmailCategory[] = ["proprio", "voyageur", "compte", "interne"];

export const CATEGORY_LABELS: Record<EmailCategory, { title: string; description: string }> = {
  proprio: { title: "Proprios", description: "Dans l’ordre où un proprio les reçoit, de la création de son annonce au renouvellement." },
  voyageur: { title: "Voyageurs", description: "De l’inscription aux avis après le séjour." },
  compte: { title: "Connexion et compte", description: "Envoyés par Supabase (Send Email Hook) — à tester par le vrai parcours sur le site." },
  interne: { title: "Notifications internes", description: "Envoyées à l’équipe Kabanalouer, jamais aux utilisateurs." },
};

const BOOST_PAUSE = BOOSTS_ENABLED
  ? {}
  : { paused: true, pausedReason: "Boosts désactivés pour le lancement (lib/featuredConfig.ts) — reprend quand ils seront réactivés." };

export const EMAIL_CATALOG: CatalogEmail[] = [
  // ── Proprios ──
  {
    id: "draft-reminder", category: "proprio", group: "Avant la publication",
    name: "Rappel — annonce commencée mais pas publiée",
    when: "48 h après la création d’un brouillon jamais publié.",
    conditions: "Une seule fois par brouillon, seulement dans les 14 jours suivant sa création.",
    mechanism: "daily", dailyAt: "11 h", testable: true,
  },
  {
    id: "welcome-subscription", category: "proprio", group: "Publication",
    name: "Abonnement actif — annonce publiée",
    when: "Dès l’activation de l’offre gratuite ou le paiement d’une annonce.",
    mechanism: "event", testable: true,
  },
  {
    id: "import-published", category: "proprio", group: "Publication",
    name: "Annonce importée publiée par l’admin",
    when: "Quand l’admin publie une annonce importée d’Airbnb au nom du proprio.",
    mechanism: "event", testable: true,
  },
  {
    id: "boost-invite", category: "proprio", group: "Publication",
    name: "Invitation à booster",
    when: "48 h après la première publication du proprio.",
    conditions: "Une seule fois par proprio (pas par chalet), dans les 14 jours suivant la publication.",
    mechanism: "daily", dailyAt: "11 h", testable: true, ...BOOST_PAUSE,
  },
  {
    id: "sms-invite", category: "proprio", group: "Publication",
    name: "Recevoir ses demandes par texto",
    when: "96 h après la première publication du proprio.",
    conditions: "Une seule fois par proprio. Sauté s’il reçoit déjà les textos.",
    mechanism: "daily", dailyAt: "11 h", testable: true,
  },
  {
    id: "new-message-host", category: "proprio", group: "Demandes et avis",
    name: "Nouveau message d’un voyageur",
    when: "2 à 3 min après un message pas encore lu sur le site.",
    conditions: "Les messages rapprochés sont regroupés en un seul courriel. Désactivable dans le profil (Notifications → Par courriel).",
    mechanism: "minute", testable: true,
  },
  {
    id: "review-received", category: "proprio", group: "Demandes et avis",
    name: "Nouvel avis reçu",
    when: "Dès qu’un voyageur publie un avis sur le chalet.",
    mechanism: "event", testable: true,
  },
  {
    id: "featured-confirmation", category: "proprio", group: "Boost",
    name: "Boost acheté — confirmation",
    when: "Dès le paiement d’un boost.",
    mechanism: "event", testable: true, ...BOOST_PAUSE,
  },
  {
    id: "featured-expiring", category: "proprio", group: "Boost",
    name: "Boost — fin dans 3 jours",
    when: "3 jours avant la fin du mois de boost.",
    mechanism: "daily", dailyAt: "23 h", testable: true, ...BOOST_PAUSE,
  },
  {
    id: "featured-expired", category: "proprio", group: "Boost",
    name: "Boost — terminé",
    when: "À la fin du mois de boost.",
    mechanism: "daily", dailyAt: "23 h", testable: true, ...BOOST_PAUSE,
  },
  {
    id: "reminder-30", category: "proprio", group: "Offre gratuite et abonnement",
    name: "Offre gratuite — rappel 30 jours",
    when: "30 jours avant la fin de l’année gratuite.",
    conditions: "Une seule fois par annonce et par année.",
    mechanism: "daily", dailyAt: "9 h", testable: true,
  },
  {
    id: "reminder-10", category: "proprio", group: "Offre gratuite et abonnement",
    name: "Offre gratuite — rappel 10 jours",
    when: "10 jours avant la fin de l’année gratuite.",
    conditions: "Une seule fois par annonce et par année.",
    mechanism: "daily", dailyAt: "9 h", testable: true,
  },
  {
    id: "reminder-3", category: "proprio", group: "Offre gratuite et abonnement",
    name: "Offre gratuite — rappel 3 jours",
    when: "3 jours avant la fin de l’année gratuite.",
    conditions: "Une seule fois par annonce et par année.",
    mechanism: "daily", dailyAt: "9 h", testable: true,
  },
  {
    id: "auto-renewal", category: "proprio", group: "Offre gratuite et abonnement",
    name: "Abonnement payant — renouvellement à venir",
    when: "30 jours avant le renouvellement automatique.",
    conditions: "Une seule fois par cycle de renouvellement.",
    mechanism: "daily", dailyAt: "9 h", testable: true,
  },
  {
    id: "payment-failed", category: "proprio", group: "Offre gratuite et abonnement",
    name: "Paiement refusé",
    when: "Le jour où Stripe passe l’abonnement en retard de paiement.",
    conditions: "Une seule fois par abonnement en retard.",
    mechanism: "daily", dailyAt: "9 h", testable: true,
  },
  {
    id: "winback-3", category: "proprio", group: "Annonce dépubliée",
    name: "Annonce dépubliée — relance 3 jours",
    when: "3 jours après une dépublication liée à l’abonnement.",
    conditions: "Une seule fois par dépublication.",
    mechanism: "daily", dailyAt: "9 h", testable: true,
  },
  {
    id: "winback-14", category: "proprio", group: "Annonce dépubliée",
    name: "Annonce dépubliée — relance 14 jours",
    when: "14 jours après une dépublication liée à l’abonnement.",
    conditions: "Une seule fois par dépublication.",
    mechanism: "daily", dailyAt: "9 h", testable: true,
  },

  // ── Voyageurs ──
  {
    id: "welcome-traveler", category: "voyageur", group: "Inscription",
    name: "Bienvenue voyageur",
    when: "Dès la confirmation du compte voyageur.",
    conditions: "Une seule fois par compte.",
    mechanism: "event", testable: true,
  },
  {
    id: "new-message-traveler", category: "voyageur", group: "Échanges avec les proprios",
    name: "Nouveau message du proprio",
    when: "2 à 3 min après un message pas encore lu sur le site.",
    conditions: "Les messages rapprochés sont regroupés en un seul courriel. Désactivable dans le profil.",
    mechanism: "minute", testable: true,
  },
  {
    id: "no-reply-nudge", category: "voyageur", group: "Échanges avec les proprios",
    name: "Le proprio n’a pas encore répondu",
    when: "48 h après le premier message du voyageur, si le proprio n’a rien répondu.",
    conditions: "Une seule fois par conversation. Propose 3 chalets de la même ville (sinon de la même région), jamais du même proprio ni déjà contactés — pas d’envoi s’il n’y en a aucun. Désactivable dans le profil.",
    mechanism: "hourly", testable: true,
  },
  {
    id: "review-request", category: "voyageur", group: "Avis",
    name: "Demande d’avis (échange ou séjour)",
    when: "72 h sans nouveau message dans une conversation où le proprio a répondu.",
    conditions: "Une seule fois par conversation.",
    mechanism: "daily", dailyAt: "10 h", testable: true,
  },
  {
    id: "stay-review-request", category: "voyageur", group: "Avis",
    name: "Demande d’avis de séjour",
    when: "Le lendemain de la date de départ.",
    conditions: "Seulement si le voyageur a répondu « J’ai réservé le chalet » au courriel précédent.",
    mechanism: "daily", dailyAt: "10 h", testable: true,
  },
  {
    id: "review-replied", category: "voyageur", group: "Avis",
    name: "Le proprio a répondu à ton avis",
    when: "Dès que le proprio répond à l’avis.",
    mechanism: "event", testable: true,
  },

  // ── Connexion et compte (Supabase) ──
  { id: "auth-signup", category: "compte", group: "Compte", name: "Confirmation d’inscription", subject: { fr: "Confirme ton compte Kabanalouer", en: "Confirm your Kabanalouer account" }, when: "À l’inscription par courriel (/signup).", mechanism: "event", testable: false },
  { id: "auth-recovery", category: "compte", group: "Compte", name: "Mot de passe oublié", subject: { fr: "Réinitialise ton mot de passe Kabanalouer", en: "Reset your Kabanalouer password" }, when: "Sur /login → « Mot de passe oublié ? ».", mechanism: "event", testable: false },
  { id: "auth-magiclink", category: "compte", group: "Compte", name: "Lien de connexion", subject: { fr: "Ton lien de connexion Kabanalouer", en: "Your Kabanalouer sign-in link" }, when: "Sur /login → « Recevoir un lien de connexion ».", mechanism: "event", testable: false },

  // ── Interne ──
  {
    id: "contact-notification", category: "interne", group: "Équipe",
    name: "Nouveau message de contact",
    subject: { fr: "Votre message à Kabanalouer", en: "Your message to Kabanalouer" },
    when: "Dès qu’un visiteur envoie le formulaire /contact.",
    conditions: "En texte brut, « Répondre » écrit directement au visiteur depuis info@.",
    mechanism: "event", testable: true, fixedRecipient: "info@kabanalouer.ca",
  },
  {
    id: "weekly-report", category: "interne", group: "Équipe",
    name: "Rapport du lundi",
    subject: { fr: "Rapport du lundi — {date}" },
    when: "Chaque lundi vers 7 h (6 h en hiver), ou avec « Générer un rapport maintenant » dans Admin → Rapports.",
    conditions: "Rédigé par Claude à partir des chiffres de la semaine et des erreurs ouvertes. Le test envoie un rapport d’exemple, sans appeler l’IA.",
    mechanism: "weekly", dailyAt: "7 h le lundi", testable: true, fixedRecipient: "simon.authentik@gmail.com",
  },
  {
    id: "error-alert", category: "interne", group: "Équipe",
    name: "Nouvelle erreur sur le site",
    subject: { fr: "Nouvelle erreur sur Kabanalouer : {message}" },
    when: "À la première apparition d’une erreur, ou quand une erreur marquée « Réglée » revient.",
    conditions: "Au plus 10 alertes par heure. Jamais pour une erreur ignorée. Détails dans Admin → Erreurs.",
    mechanism: "event", testable: true, fixedRecipient: "simon.authentik@gmail.com",
  },
  {
    id: "launch-offer-ending", category: "interne", group: "Équipe",
    name: "Fin de l’offre de lancement dans 7 jours",
    subject: { fr: "L’offre de lancement se termine le {date}" },
    when: "Le jour où il reste 7 jours à l’offre de lancement.",
    mechanism: "daily", dailyAt: "11 h", testable: true, fixedRecipient: "simon.authentik@gmail.com",
  },
  {
    id: "import-notification", category: "interne", group: "Équipe",
    name: "Import d’annonce (pour info)",
    subject: { fr: "Nouvelle annonce importée — {titreChalet}" },
    when: "Dès qu’un proprio importe une annonce Airbnb.",
    mechanism: "event", testable: true, fixedRecipient: "simon.authentik@gmail.com",
  },
];
