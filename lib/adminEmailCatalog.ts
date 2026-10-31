// Catalogue des courriels du site, affiché dans Admin → Séquences courriel
// (app/admin/emails). Les envois de test passent par /api/admin/test-email,
// qui associe chaque `id` testable à sa fonction d'envoi.
//
// Tenir ce fichier à jour à chaque nouveau courriel ou changement de règle :
// c'est la seule vue d'ensemble que Simon consulte. Le statut « en pause »
// doit venir du même réglage que le code d'envoi (ex. BOOSTS_ENABLED), jamais
// d'une valeur recopiée à la main.

import { BOOSTS_ENABLED } from "@/lib/featuredConfig";
import { FREE_YEAR_REMINDERS_ENABLED } from "@/lib/siteIsFree";
import { FREE_UNTIL_FURTHER_NOTICE } from "@/lib/launchOffer";
import { DRAFT_INVITATIONS_ENABLED } from "@/lib/draftInvitationsConfig";

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

const FREE_YEAR_PAUSE = FREE_YEAR_REMINDERS_ENABLED
  ? {}
  : { paused: true, pausedReason: "Rappels de fin d’année gratuite en pause (lib/siteIsFree.ts) — le site ne parle plus d’une durée." };

const DRAFT_PAUSE = DRAFT_INVITATIONS_ENABLED
  ? {}
  : { paused: true, pausedReason: "Invitations brouillon en pause (lib/draftInvitationsConfig.ts) — aucun envoi tant que Simon n’a pas validé l’essai et les textes." };

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
    id: "profile-tip", category: "proprio", group: "Après la publication",
    name: "Photo de profil et présentation",
    when: "24 h après la première publication ou la revendication du proprio.",
    conditions: "Une seule séquence par proprio (pas par chalet). Seulement s’il manque la photo de profil ou la présentation (le courriel nomme ce qui manque). Fenêtre de 24 h à 4 jours.",
    mechanism: "daily", dailyAt: "11 h", testable: true,
  },
  {
    id: "rooms-tip", category: "proprio", group: "Après la publication",
    name: "Remplir la section Chambres",
    when: "4 jours après la première publication ou la revendication du proprio.",
    conditions: "Une seule fois par proprio. Seulement s’il a au moins un chalet publié sans aucune chambre (le courriel nomme le chalet et « et N autres »). Fenêtre de 4 à 8 jours.",
    mechanism: "daily", dailyAt: "11 h", testable: true,
  },
  {
    id: "sms-invite", category: "proprio", group: "Après la publication",
    name: "Recevoir ses demandes par texto",
    when: "8 jours après la première publication ou la revendication du proprio.",
    conditions: "Une seule fois par proprio. Sauté s’il reçoit déjà les textos. Fenêtre de 8 à 14 jours.",
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
    id: "unclaimed-request", category: "proprio", group: "Fiches non revendiquées",
    name: "Un voyageur s’intéresse à votre chalet (propriétaire sans compte)",
    when: "2 à 3 min après un message non lu sur une fiche non revendiquée.",
    conditions: "Envoyé à l’adresse au dossier de la fiche. Un courriel par conversation, sans plafond. Contient « Activer ma fiche » et « Retirer ma fiche ».",
    mechanism: "minute", testable: true,
  },
  {
    id: "claim-link", category: "proprio", group: "Fiches non revendiquées",
    name: "Lien d’activation demandé (« C’est mon chalet »)",
    when: "Quand quelqu’un clique « Envoyer le lien » sur la fiche d’un chalet non revendiqué.",
    conditions: "Envoyé seulement à l’adresse au dossier, jamais à la personne qui clique. Au plus 3 demandes par jour par fiche et 5 par adresse.",
    mechanism: "event", testable: true,
  },
  {
    id: "claim-activated", category: "proprio", group: "Fiches non revendiquées",
    name: "Votre fiche a été activée (ancienne adresse)",
    when: "Dès qu’une fiche est revendiquée, par lien ou par approbation.",
    conditions: "Un courriel par ancienne adresse, même pour plusieurs fiches. L’adresse du nouveau compte est partiellement masquée. Contient « Signaler un problème ».",
    mechanism: "event", testable: true,
  },
  {
    id: "claim-welcome", category: "proprio", group: "Fiches non revendiquées",
    name: "Bienvenue après la revendication",
    when: "Dès qu’un propriétaire active sa fiche avec le lien reçu par courriel (après une approbation manuelle, le courriel « Demande approuvée » joue ce rôle).",
    conditions: "Un seul courriel même s’il active plusieurs fiches. Liste ses fiches, dit que c’est gratuit et propose 3 prochaines étapes : photos, détails, numéro de cellulaire.",
    mechanism: "event", testable: true,
  },
  {
    id: "claim-welcome-draft", category: "proprio", group: "Fiches non revendiquées",
    name: "Bienvenue après la revendication — fiches en brouillon",
    when: "Dès qu’un propriétaire revendique ses fiches en brouillon avec le lien de l’aperçu.",
    conditions: "Cas de secours : remplace « Bienvenue après la revendication » seulement si au moins une fiche en brouillon n’a pas pu être mise en ligne à la revendication (fiche à compléter, CITQ manquant ou abonnement à régler). Dit d’aller dans Mes chalets pour compléter et activer ce qui reste. Un seul courriel même pour plusieurs fiches.",
    mechanism: "event", testable: true,
  },
  {
    id: "claim-approved", category: "proprio", group: "Fiches non revendiquées",
    name: "Demande de vérification approuvée",
    when: "Quand tu approuves une demande dans Admin → Revendications.",
    mechanism: "event", testable: true,
  },
  {
    id: "claim-refused", category: "proprio", group: "Fiches non revendiquées",
    name: "Demande de vérification refusée",
    when: "Quand tu refuses une demande dans Admin → Revendications.",
    conditions: "Ton explication, si tu en écris une, est ajoutée au courriel.",
    mechanism: "event", testable: true,
  },
  {
    id: "claim-invitation", category: "proprio", group: "Fiches non revendiquées",
    name: "Invitation à activer sa fiche",
    when: "Dès que la fiche est en ligne (vérifié aux 10 minutes le jour, avec rattrapage à 8 h) ; tu peux aussi l’envoyer à la main depuis Admin → Invitations.",
    conditions: "Part de info@kabanalouer.ca, seulement pour une fiche non revendiquée et publiée, une seule invitation par adresse (30 par jour au plus). Contient le lien de la fiche, « Activer ma fiche » (gratuitement tant que l’offre de lancement est en cours) et « Retirer ma fiche ». Un pixel invisible compte les ouvertures (indicatif).",
    mechanism: "event", testable: true,
  },
  {
    id: "claim-invitation-reminder", category: "proprio", group: "Fiches non revendiquées",
    name: "Relance de l’invitation (3 jours plus tard)",
    when: "Chaque jour à 8 h (heure de Montréal), pour les adresses invitées il y a 3 jours ou plus dont la fiche n’est pas revendiquée.",
    conditions: "Une seule relance par adresse (30 par jour au plus). Elle apparaît aussi dans Admin → Invitations, où tu peux l’envoyer à la main.",
    mechanism: "daily", dailyAt: "8 h", testable: true,
  },
  {
    id: "claim-invitation-multi", category: "proprio", group: "Fiches non revendiquées",
    name: "Invitation à activer ses fiches — plusieurs chalets",
    when: "Même moment que l’invitation, quand la même adresse a 2 chalets ou plus.",
    conditions: "Une seule invitation pour tous les chalets de l’adresse, envoyée quand tous ses chalets du jour sont en ligne (10 h au plus tard). Textes au pluriel avec le nombre de chalets, liste à puces des fiches et un lien « Retirer » par chalet.",
    mechanism: "event", testable: true,
  },
  {
    id: "claim-invitation-reminder-multi", category: "proprio", group: "Fiches non revendiquées",
    name: "Relance de l’invitation — plusieurs chalets (3 jours plus tard)",
    when: "Même moment que la relance, quand la même adresse a 2 chalets ou plus.",
    conditions: "Une seule relance par adresse. Même présentation que l’invitation pour plusieurs chalets.",
    mechanism: "daily", dailyAt: "8 h", testable: true,
  },
  {
    id: "claim-draft-invitation", category: "proprio", group: "Fiches non revendiquées",
    name: "Brouillon — invitation à voir l’aperçu et activer sa fiche",
    when: "Dès qu’il ne reste plus aucune ligne en attente dans la file d’import pour l’adresse (vérifié aux 5 minutes, entre 8 h et 19 h, heure de Montréal).",
    conditions: "Pour les propriétaires de plusieurs chalets : l’import écrit mode_publication = « brouillon » dans le lot, les fiches restent hors ligne (jamais publiées par le serveur, hors du plafond de 15 par jour). Une seule invitation par adresse, qui liste toutes ses fiches ; le lien mène à un aperçu privé (non indexé, sans limite de durée) puis à l’activation. Pas d’invitation si le propriétaire a déjà retiré une fiche.",
    mechanism: "event", testable: true,
    ...DRAFT_PAUSE,
  },
  {
    id: "claim-draft-invitation-multi", category: "proprio", group: "Fiches non revendiquées",
    name: "Brouillon — invitation, plusieurs chalets",
    when: "Même moment que l’invitation brouillon, quand l’adresse a 2 chalets ou plus.",
    conditions: "Objet : « Vos N chalets sont prêts sur Kabanalouer, il ne reste qu’à les activer » (« , gratuitement » tant que la plateforme est gratuite). Liste à puces des fiches, bouton vers l’aperçu, un lien « Retirer » par chalet.",
    mechanism: "event", testable: true,
    ...DRAFT_PAUSE,
  },
  {
    id: "claim-draft-reminder-3", category: "proprio", group: "Fiches non revendiquées",
    name: "Brouillon — relance à J+3",
    when: "Chaque jour à 8 h (heure de Montréal), 3 jours après l’invitation brouillon.",
    conditions: "Seulement si aucune fiche de l’adresse n’est activée, une seule fois (30 par jour au plus). Si le propriétaire a déjà revendiqué ses fiches sans les activer, le bouton mène à son tableau de bord.",
    mechanism: "daily", dailyAt: "8 h", testable: true,
    ...DRAFT_PAUSE,
  },
  {
    id: "claim-draft-reminder-3-multi", category: "proprio", group: "Fiches non revendiquées",
    name: "Brouillon — relance à J+3, plusieurs chalets",
    when: "Même moment que la relance à J+3, quand l’adresse a 2 chalets ou plus.",
    mechanism: "daily", dailyAt: "8 h", testable: true,
    ...DRAFT_PAUSE,
  },
  {
    id: "claim-draft-reminder-10", category: "proprio", group: "Fiches non revendiquées",
    name: "Brouillon — relance à J+10 (dernier courriel)",
    when: "Chaque jour à 8 h (heure de Montréal), 10 jours après l’invitation brouillon.",
    conditions: "Seulement si aucune fiche de l’adresse n’est activée, une seule fois (30 par jour au plus). C’est le dernier courriel de la séquence.",
    mechanism: "daily", dailyAt: "8 h", testable: true,
    ...DRAFT_PAUSE,
  },
  {
    id: "claim-draft-reminder-10-multi", category: "proprio", group: "Fiches non revendiquées",
    name: "Brouillon — relance à J+10, plusieurs chalets",
    when: "Même moment que la relance à J+10, quand l’adresse a 2 chalets ou plus.",
    mechanism: "daily", dailyAt: "8 h", testable: true,
    ...DRAFT_PAUSE,
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
    mechanism: "daily", dailyAt: "9 h", testable: true, ...FREE_YEAR_PAUSE,
  },
  {
    id: "reminder-10", category: "proprio", group: "Offre gratuite et abonnement",
    name: "Offre gratuite — rappel 10 jours",
    when: "10 jours avant la fin de l’année gratuite.",
    conditions: "Une seule fois par annonce et par année.",
    mechanism: "daily", dailyAt: "9 h", testable: true, ...FREE_YEAR_PAUSE,
  },
  {
    id: "reminder-3", category: "proprio", group: "Offre gratuite et abonnement",
    name: "Offre gratuite — rappel 3 jours",
    when: "3 jours avant la fin de l’année gratuite.",
    conditions: "Une seule fois par annonce et par année.",
    mechanism: "daily", dailyAt: "9 h", testable: true, ...FREE_YEAR_PAUSE,
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
    id: "guest-request", category: "voyageur", group: "Échanges avec les proprios",
    name: "Récapitulatif d’une demande de prix (sans compte)",
    when: "Dès qu’un visiteur envoie une demande de prix sans être connecté.",
    conditions: "Le bouton le connecte directement (lien magique). Répondre à ce courriel écrit au proprio (Reply-To = adresse de la conversation). Si l’adresse avait déjà un compte, le courriel dit « ce n’était pas vous ? » et la réponse va à info@.",
    mechanism: "event", testable: true,
  },
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
    id: "feedback-message", category: "interne", group: "Équipe",
    name: "Retour d’un utilisateur (message)",
    subject: { fr: "Votre retour sur Kabanalouer — {type}" },
    when: "Dès qu’un proprio ou un voyageur connecté envoie « Une idée ou un problème ? » (tableau de bord ou menu de compte).",
    conditions: "En texte brut, « Répondre » écrit directement à la personne depuis info@. Au plus 5 retours par compte et par 24 h.",
    mechanism: "event", testable: true, fixedRecipient: "info@kabanalouer.ca",
  },
  {
    id: "feedback-analysis", category: "interne", group: "Équipe",
    name: "Retour d’un utilisateur (analyse de Claude)",
    subject: { fr: "Analyse du retour de {nom} ({role}) — Priorité {priorite}" },
    when: "Quelques secondes après le message, une fois le retour trié par Claude.",
    conditions: "Catégorie, priorité, recommandation, et un prompt à copier si une action est utile. Envoyé à Simon seulement, jamais dans le fil avec la personne.",
    mechanism: "event", testable: true, fixedRecipient: "simon.authentik@gmail.com",
  },
  {
    id: "claim-admin-alert", category: "interne", group: "Équipe",
    name: "Demande de vérification ou signalement d’une fiche",
    subject: { fr: "Demande de vérification d’une fiche : {titre}" },
    when: "Immédiatement quand un propriétaire envoie une preuve (option B) ou signale un problème après une activation.",
    conditions: "Le contenu du message est échappé. Mène à Admin → Revendications.",
    mechanism: "event", testable: true, fixedRecipient: "simon.authentik@gmail.com",
  },  {
    id: "listing-removed-notice", category: "interne", group: "Équipe",
    name: "Fiche retirée par son propriétaire",
    when: "Dès qu’un propriétaire clique « Retirer ma fiche » et confirme.",
    conditions: "Dit ce que le site a fait tout seul (fiche hors ligne, photos et textes supprimés, adresse exclue) et ce qui reste à faire à la main : fichier de prospection et copies d’images de Vercel.",
    mechanism: "event", testable: true,
  },

  {
    id: "import-duplicate-alert", category: "interne", group: "Équipe",
    name: "Doublon possible à l’import",
    subject: { fr: "Doublon possible à l’import : {titre}" },
    when: "Quand une fiche importée a le même CITQ qu’une annonce déjà tenue par un proprio inscrit.",
    conditions: "La fiche est importée quand même (aucun refus) ; l’alerte et la section « Doublons possibles » d’Admin → Invitations te laissent juger.",
    mechanism: "event", testable: true, fixedRecipient: "simon.authentik@gmail.com",
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
    id: "unclaimed-published", category: "interne", group: "Équipe",
    name: "Chalets du jour en ligne",
    subject: { fr: "{n} nouveaux chalets en ligne sur Kabanalouer" },
    when: "Le matin, quand la dernière fiche importée du jour est en ligne (cron publish-unclaimed ; au plus tard vers 10 h).",
    conditions: "Les fiches sont publiées au fur et à mesure ; un seul avis par jour avec toutes celles mises en ligne (titre, ville, région, lien). Au plus 15 fiches par jour.",
    mechanism: "daily", dailyAt: "entre 6 h et 10 h", testable: false, fixedRecipient: "simon.authentik@gmail.com",
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
    ...(FREE_UNTIL_FURTHER_NOTICE ? { paused: true, pausedReason: "Gratuit jusqu’à nouvel ordre (lib/launchOffer.ts) — aucune fin d’offre prévue." } : {}),
  },
  {
    id: "import-notification", category: "interne", group: "Équipe",
    name: "Import d’annonce (pour info)",
    subject: { fr: "Nouvelle annonce importée — {titreChalet}" },
    when: "Dès qu’un proprio importe une annonce Airbnb.",
    mechanism: "event", testable: true, fixedRecipient: "simon.authentik@gmail.com",
  },
];
