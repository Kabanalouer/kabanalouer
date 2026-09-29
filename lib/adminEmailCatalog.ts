// Catalogue des courriels du site, affiché dans Admin → Séquences courriel
// (app/admin/emails). Les envois de test passent par /api/admin/test-email,
// qui associe chaque `id` testable à sa fonction d'envoi.

export type EmailCategory = "proprio" | "voyageur" | "compte" | "interne";

export type CatalogEmail = {
  id: string;
  category: EmailCategory;
  name: string;
  trigger: string;
  /** false : envoyé par Supabase (Send Email Hook), pas de bouton de test */
  testable: boolean;
  /** destinataire imposé dans le code (notifications internes) */
  fixedRecipient?: string;
};

export const CATEGORY_ORDER: EmailCategory[] = ["proprio", "voyageur", "compte", "interne"];

export const CATEGORY_LABELS: Record<EmailCategory, { title: string; description: string }> = {
  proprio: { title: "Proprios", description: "Dans l’ordre où un proprio les reçoit après la publication de son annonce." },
  voyageur: { title: "Voyageurs", description: "Courriels reçus par les voyageurs." },
  compte: { title: "Connexion et compte", description: "Envoyés par Supabase (Send Email Hook) — à tester par le vrai parcours sur le site." },
  interne: { title: "Notifications internes", description: "Envoyées à l’équipe Kabanalouer, jamais aux utilisateurs." },
};

export const EMAIL_CATALOG: CatalogEmail[] = [
  // Proprios
  { id: "draft-reminder", category: "proprio", name: "Rappel — annonce commencée mais pas publiée", trigger: "48 h après la création d’un brouillon jamais publié (cron quotidien, 11 h), une seule fois par brouillon.", testable: true },
  { id: "welcome-subscription", category: "proprio", name: "Abonnement actif — annonce publiée", trigger: "À l’activation de l’offre gratuite ou au paiement de la 1re annonce payante.", testable: true },
  { id: "import-published", category: "proprio", name: "Annonce importée publiée par l’admin", trigger: "Quand l’admin publie une annonce importée d’Airbnb au nom du proprio.", testable: true },
  { id: "boost-invite", category: "proprio", name: "Invitation à booster", trigger: "48 h après la première publication (cron quotidien, 11 h).", testable: true },
  { id: "sms-invite", category: "proprio", name: "Recevoir ses demandes par texto", trigger: "96 h après la première publication (cron quotidien, 11 h) — sauté si le proprio reçoit déjà les textos.", testable: true },
  { id: "new-message-host", category: "proprio", name: "Nouveau message d’un voyageur", trigger: "2 à 3 min après un message non lu — avec la note « répondre en moins de 24 h ». Désactivable dans le profil.", testable: true },
  { id: "review-received", category: "proprio", name: "Nouvel avis reçu", trigger: "Quand un voyageur publie un avis sur le chalet.", testable: true },
  { id: "featured-confirmation", category: "proprio", name: "Boost acheté — confirmation", trigger: "Après le paiement d’un boost (webhook Stripe).", testable: true },
  { id: "featured-expiring", category: "proprio", name: "Boost — fin dans 3 jours", trigger: "3 jours avant la fin du mois de boost.", testable: true },
  { id: "featured-expired", category: "proprio", name: "Boost — terminé", trigger: "À la fin du mois de boost.", testable: true },
  { id: "reminder-30", category: "proprio", name: "Offre gratuite — rappel 30 jours", trigger: "30 jours avant la fin de l’année gratuite.", testable: true },
  { id: "reminder-10", category: "proprio", name: "Offre gratuite — rappel 10 jours", trigger: "10 jours avant la fin de l’année gratuite.", testable: true },
  { id: "reminder-3", category: "proprio", name: "Offre gratuite — rappel 3 jours", trigger: "3 jours avant la fin de l’année gratuite.", testable: true },
  { id: "auto-renewal", category: "proprio", name: "Abonnement payant — renouvellement à venir", trigger: "30 jours avant le renouvellement automatique.", testable: true },
  { id: "payment-failed", category: "proprio", name: "Paiement refusé", trigger: "Quand Stripe passe l’abonnement en retard de paiement.", testable: true },
  { id: "winback-3", category: "proprio", name: "Annonce dépubliée — relance 3 jours", trigger: "3 jours après une dépublication liée à l’abonnement.", testable: true },
  { id: "winback-14", category: "proprio", name: "Annonce dépubliée — relance 14 jours", trigger: "14 jours après une dépublication liée à l’abonnement.", testable: true },

  // Voyageurs
  { id: "welcome-traveler", category: "voyageur", name: "Bienvenue voyageur", trigger: "À la confirmation du compte voyageur (une seule fois).", testable: true },
  { id: "new-message-traveler", category: "voyageur", name: "Nouveau message du proprio", trigger: "2 à 3 min après un message non lu.", testable: true },
  { id: "review-request", category: "voyageur", name: "Demande d’avis (échange ou séjour)", trigger: "72 h après la dernière réponse du proprio dans une conversation (cron quotidien).", testable: true },
  { id: "stay-review-request", category: "voyageur", name: "Demande d’avis de séjour", trigger: "24 h après la date de départ indiquée par le voyageur (cron quotidien).", testable: true },
  { id: "review-replied", category: "voyageur", name: "Le proprio a répondu à ton avis", trigger: "Quand le proprio répond à un avis.", testable: true },

  // Connexion et compte (Supabase)
  { id: "auth-signup", category: "compte", name: "Confirmation d’inscription", trigger: "À l’inscription par courriel (/signup).", testable: false },
  { id: "auth-recovery", category: "compte", name: "Mot de passe oublié", trigger: "Sur /login → « Mot de passe oublié ? ».", testable: false },
  { id: "auth-magiclink", category: "compte", name: "Lien de connexion", trigger: "Sur /login → « Recevoir un lien de connexion ».", testable: false },

  // Interne
  { id: "contact-notification", category: "interne", name: "Nouveau message de contact", trigger: "Quand un visiteur envoie le formulaire /contact.", testable: true, fixedRecipient: "simon.authentik@gmail.com" },
  { id: "import-notification", category: "interne", name: "Import d’annonce (pour info)", trigger: "Quand un proprio importe une annonce Airbnb — il la complète et la publie lui-même.", testable: true, fixedRecipient: "simon.authentik@gmail.com" },
];
