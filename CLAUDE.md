# CLAUDE.md — Kabanalouer

## Design system prioritaire — ne pas dévier

- **Couleur primaire :** olive `#636e40` (variantes : 600 `#4d5631`, 700 `#3a4124`, 100 `#e8ebdc`, 50 `#f5f6ec`)
- **Couleur accent :** coral `#f04e45`
- **Typographie :** Plus Jakarta Sans uniquement
- **Boutons CTA :** toujours `rounded-full`
- **Pas d'emojis** dans l'UI (dashboard, boutons, pages publiques), **sentence case** partout, **prix en format québécois** (ex. `120 $/nuit`). Exception (2026-07-10) : un emoji ponctuel est toléré dans la phrase de clôture chaleureuse d'un email transactionnel de confirmation (ex. "Merci pour ta confiance 🙏"), jamais dans un titre, un sujet, un bouton ou l'UI du site elle-même.
- **Vocabulaire :** "proprio" dans les labels courts, "propriétaire" dans les textes longs, **jamais "hôte"**
- **Ton :** français québécois naturel, chaleureux mais professionnel

Le skill ui-ux-pro-max peut être utilisé pour des suggestions de structure, de patterns UX ou d'animations, mais ne doit JAMAIS proposer une nouvelle palette de couleurs, une nouvelle police, ou un nouveau style de bouton. Le design system ci-dessus est final et non négociable pour ce projet.

---

Contexte complet du projet pour Claude Code. À lire en entier au démarrage.

---

## 1. Le projet

**Kabanalouer** est une marketplace de location de chalets au Québec — le Airbnb du chalet québécois. Les propriétaires publient leurs chalets, les voyageurs les contactent directement. Pas de frais de service pour les voyageurs.

- **Production :** https://kabanalouer.ca (DNS Squarespace → Vercel)
- **GitHub :** https://github.com/Kabanalouer/kabanalouer
- **Simon n'est pas développeur** — toujours expliquer ce qui a été fait en langage clair après chaque intervention.

---

## 2. Stack technique

| Technologie | Version | Notes |
|---|---|---|
| Next.js | 16.2.6 | App Router, server components par défaut |
| React | 19.2.4 | |
| TypeScript | 5.x | strict, zéro erreur avant commit |
| Tailwind CSS | 4.x | config via `@theme` dans `globals.css`, pas de `tailwind.config.js` |
| Supabase | 2.x | Auth + Postgres. Project ID : `fgdwhbemzmccchemtzog` |
| Anthropic SDK | 0.96+ | Modèle : `claude-sonnet-4-6` |
| Google Maps | `@vis.gl/react-google-maps` | Split-view sur /chalets |
| Resend | 6.x | Emails transactionnels |
| Stripe | 22.x | Abonnements propriétaires — intégration complète en prod |
| Cloudflare Turnstile | — | Anti-bot sur signup et login |
| Vercel | — | Auto-deploy depuis `main` |

**Clients Supabase :**
- `@/lib/supabase/client` → composants client (`"use client"`)
- `@/lib/supabase/server` → server components et routes API

**SUPABASE_SERVICE_ROLE_KEY** : jamais en `NEXT_PUBLIC_`, jamais côté client. Routes API uniquement.

---

## 3. Design system

### Couleurs

| Rôle | Token CSS | Hex |
|---|---|---|
| Primaire (olive) | `text-primary`, `bg-primary`, `border-primary` | `#636e40` |
| Primary/600 | — | `#4d5631` |
| Primary/100 | `bg-primary/10` | `#e8ebdc` |
| Primary/50 | `bg-[#f5f6ec]` | `#f5f6ec` |
| Accent coral | `text-primary` via var CSS | `#f04e45` — badges Promo, boutons CTA principaux |
| Charcoal scale | `text-charcoal-{400,500,600,700,800}` | texte et bordures sombres |
| Bordures légères | `border-[#ebebeb]` | inputs, cartes |

> Ne jamais coder le hex directement pour les couleurs qui ont un token. Ne jamais utiliser `border-gray-*`.

### Typographie

**Plus Jakarta Sans** — chargé via `next/font/google`, variable `--font-jakarta`.

### Règles UI strictes

- **Pas d'emojis** dans l'UI — icônes SVG inline uniquement (style Heroicons, `strokeWidth={1.75}`)
- **Sentence case** partout (titres, labels, boutons)
- **Boutons CTA** → `rounded-full` (pill)
- **Prix québécois** → `120 $/nuit`, `299 $/an` (espace avant `$`)
- Fonds de section → `bg-charcoal-50`
- Titres principaux → `text-charcoal-800`
- Texte secondaire → `text-charcoal-400`

### Logo

Fichiers dans `public/` :
- `logo-wordmark.svg` — wordmark sur fonds clairs (Navbar, Footer)
- `logo-wordmark-light.svg` — wordmark sur fonds sombres/colorés
- `logo-mark.svg` — icône seule
- `app/icon.svg` — favicon (copie de `favicon.svg`)

---

## 4. Vocabulaire

- **"Proprio"** dans boutons et labels courts / **"propriétaire"** dans textes longs
- **Jamais "hôte"** dans l'UI (ni "host" visible côté public)
- **Français québécois naturel**, jamais trop familier — pas de "Salut!", "Yo", "Hey"
- Les voyageurs = "voyageurs" (pas "clients", pas "guests")

---

## 5. Base de données (tables principales)

| Table | Rôle |
|---|---|
| `users` | Profils (bio, avatar_url, name, email, role, stripe_customer_id, `free_launch_claimed_at` — offre de lancement réclamée une fois dans sa vie, permanent) |
| `listings` | Annonces chalets |
| `rooms` | Chambres/salons liés à une annonce |
| `availability` | Dates bloquées (manual + ical) |
| `messages` | Messagerie voyageur ↔ proprio (max 5000 chars, contrainte DB) |
| `reviews` | Avis voyageurs sur les chalets (max 2000 chars) |
| `favorites` | Favoris voyageurs |
| `subscriptions` | Un abonnement **par annonce** (`listing_id UUID UNIQUE NOT NULL`, pas par proprio) — `is_free_launch BOOLEAN`, `price_cents`/`price_tier` verrouillés au paiement |
| `ai_usage_log` | Rate limiting IA — 20 appels/heure/utilisateur |
| `promotions` | Promotions par annonce (rabais, durée, dernière minute) |
| `featured_listings` | Annonces vedettes (région, accueil) |
| `contact_messages` | Formulaire de contact public |

---

## 6. Commandes

```bash
npm run dev                                              # dev (localhost:3000)
npx tsc --noEmit                                        # TypeScript check — toujours avant deploy
git add -A && git commit -m "..." && git push           # commit + auto-deploy Vercel
npx vercel --prod                                       # deploy manuel si besoin
```

**Workflow standard :** toujours `npx tsc --noEmit` → zéro erreur → commit → push → `npx vercel --prod`.

---

## 7. Architecture fichiers

```
app/                    Pages App Router
  (auth)/               Login, signup (Turnstile intégré)
  api/                  Routes API (auth check obligatoire)
    ai/                 Génération IA (suggest-titles, generate-description, generate-bio, listing-advice)
    stripe/             checkout, portal, webhook
    views/              Compteur de vues (Origin check + IP throttle)
    sync-ical/          Sync iCal (CRON_SECRET requis)
  dashboard/            Espace proprio
  chalets/              Pages publiques annonces
  auth/callback/        OAuth callback — gère le rôle et la langue
components/
  dashboard/            Composants espace proprio
  chalets/              Composants pages publiques
  TurnstileWidget.tsx   Widget Cloudflare Turnstile (script afterInteractive)
lib/
  supabase/             client.ts + server.ts
  aiRateLimit.ts        Rate limiting IA (table ai_usage_log)
  photo.ts              Compression WebP + normalisation URLs
  amenities.ts          Liste des caractéristiques
  listingScore.ts       Score optimisation 0-100 (buildCriteria, computeScore, getScoreLevel)
public/                 Assets statiques (logos, hero image)
design-system/          Fichiers de référence branding
supabase/               Migrations SQL à exécuter manuellement dans Supabase Dashboard
```

---

## 8. Conventions de code

- **TypeScript strict** — zéro `any`, zéro erreur `tsc` avant commit
- **Composants client** : `"use client"` uniquement si nécessaire (interactivité, hooks, browser APIs)
- **Styles** : Tailwind uniquement, pas de `style={{}}` inline sauf pour des valeurs dynamiques (ex. couleur calculée)
- **Commentaires** : uniquement si le WHY n'est pas évident — pas de commentaires décrivant QUOI fait le code
- **Pas d'abstraction prématurée** — trois lignes similaires valent mieux qu'une abstraction inutile
- **Icônes** : SVG inline avec `strokeWidth={1.75}`, jamais de librairie d'icônes externe

---

## 9. Fonctionnalités clés en place

### Espace proprio (dashboard)
- **Édition d'annonce** : 12 sections avec menu latéral, indicateurs ✓/● par section, score numérique pour "Analyse"
- **Score d'optimisation** (0–100) : `lib/listingScore.ts` — source unique de vérité, partagé entre `AnalyseSection.tsx` et `EditListingForm.tsx`
- **Conseils IA** : `/api/ai/listing-advice` — `claude-sonnet-4-6`, retourne 3 conseils JSON
- **Module promotions** : 3 types (rabais, durée, dernière minute), badges sur les cartes publiques
- **Module vedettes ("boost" côté proprio/admin, "vedette" resté côté voyageur/public)** : région (49 $/mois) et accueil (99 $/mois), Stripe déjà intégré. Séquence email complète ajoutée le 2026-07-08 (confirmation d'achat, rappel J-3, expiration — `lib/emails/featuredListing.ts`, `app/api/cron/expire-featured/route.ts`), avec anti-doublon (`reminder_3d_sent_at`/`expired_email_sent_at` sur `featured_listings`) et un garde-fou `hasNewerRenewal()` qui bloque l'envoi d'un rappel/expiration si le proprio a déjà renouvelé pour un mois ultérieur.
- **iCal sync** bidirectionnel (`/api/sync-ical`)
- **Photos chambres** : drag & drop, compression WebP, upload bucket `listing-photos`

### Abonnement Stripe — un abonnement par annonce, tarif dégressif (restructuré le 2026-07-07)

Jusqu'au 2026-07-07, un proprio avait **un seul abonnement pour tout son compte** (299 $/an, une ligne `subscriptions` par `user_id`), peu importe le nombre d'annonces publiées. Restructuré en 10 étapes séquentielles (commits `e3d0961` → `5a3b99e`) vers **un abonnement distinct par annonce**, avec tarif dégressif au nombre de chalets payants.

- **Architecture** : `subscriptions.listing_id` (`UUID`, `UNIQUE`, `NOT NULL`) remplace `user_id` comme clé d'unicité — un proprio avec 3 chalets payants a 3 lignes `subscriptions` distinctes, chacune avec son propre `status`, `expires_at` et `stripe_subscription_id`. `user_id` reste présent sur la ligne (pour retrouver le proprio) mais n'est plus unique.
- **Tarif dégressif** — `lib/subscriptionPricing.ts`, source unique de vérité pour les prix et les Price IDs (avant, dupliqués dans 5 fichiers) :
  - 1ʳᵉ annonce payante : **299 $/an** (`tier1`, Price ID `price_1ToqE7EVlLGcAv4arl0TmOCz`)
  - 2ᵉ et 3ᵉ : **249 $/an** chacune (`tier2_3`, Price ID `price_1TqeYhEVlLGcAv4aUUuiwT8R`)
  - 4ᵉ et plus : **199 $/an** chacune (`tier4plus`, Price ID `price_1TqeYhEVlLGcAv4a9mPZ8H0T`)
  - Le rang (`getNextPaidRank()`) = nombre d'abonnements payants **actuellement actifs** de ce proprio (`is_free_launch: false`, `status: active`) + 1. C'est le compte actif, pas l'historique total — annuler une annonce libère son rang pour la prochaine ajoutée, confirmé volontairement ainsi.
  - Le prix est **verrouillé au moment du paiement** (`price_cents`/`price_tier` sur la ligne `subscriptions`, via la métadonnée Stripe `price_tier` posée au checkout) et **jamais recalculé rétroactivement** si le proprio ajoute ou annule d'autres annonces par la suite.
- **Offre de lancement — une fois dans sa vie par proprio, sans limite de nombre** : `users.free_launch_claimed_at` (`TIMESTAMPTZ`, permanent, jamais effacé) bloque toute deuxième réclamation, même si la première annonce gratuite a été annulée depuis. L'annonce gratuite ne compte **jamais** dans le rang tarifaire des annonces payantes. **Mise à jour le 2026-09-01** : le plafond de 50 places (`FREE_LAUNCH_LIMIT`) a été retiré — voir la sous-section dédiée plus bas, qui détaille aussi pourquoi cette offre ne passe plus du tout par Stripe.
- **Checkout** (`/api/stripe/checkout`) : `listingId` obligatoire dans le corps de la requête, vérifie la propriété de l'annonce et l'absence d'abonnement actif existant pour elle, calcule le rang/prix au moment de la requête, passe `listing_id` et `price_tier` en métadonnée Stripe.
- **Webhook** `/api/stripe/webhook` :
  - `checkout.session.completed` : upsert par `listing_id` (`onConflict`), enregistre `price_cents`/`price_tier` verrouillés, republie uniquement l'annonce concernée (`id`), plus tout le portefeuille du proprio (`host_id`) comme avant. L'email de bienvenue "nouveau proprio payant" ne se déclenche qu'au `tier1` (rang 1) — le seul cas qui correspond à une première annonce payante active pour ce proprio, sans quoi une 2ᵉ/3ᵉ/4ᵉ annonce le redéclencherait à tort.
  - `customer.subscription.updated`/`deleted` : résolvent la ligne à modifier par `stripe_subscription_id` (unique par annonce), jamais par `stripe_customer_id` — un même customer Stripe porte maintenant un abonnement par annonce, donc plusieurs lignes possibles.
- **Offre de lancement** : `/api/subscriptions/activate-free` (`is_free_launch: true`), upsert par `listing_id`. La page d'abonnement affiche un badge "Offre de lancement" pour les annonces gratuites actives, sans bouton Stripe.
- **Portail Stripe** : `/api/stripe/portal` permet aux abonnés payants de gérer leur abonnement
- **Note technique** : dans Stripe SDK v22+, `current_period_end` est sur `subscription.items.data[0]`, pas sur `subscription` directement
- **Dashboard** (`/dashboard/subscription`) : une carte par chalet (statut, prix verrouillé, action) plutôt qu'un seul état global de compte. La section "Plan details" (299 $/an fixe) et les bannières succès/annulé ont été retirées — devenues inexactes/inatteignables, le checkout redirige toujours vers la page de publication de l'annonce concernée.
- **Cron** `/api/cron/subscription-reminders` (`vercel.json`, `0 13 * * *`) : rappels de renouvellement, notification `past_due`, dépublication et win-back opèrent maintenant **par annonce individuelle** (`listing_id`), pas par proprio — deux annonces du même proprio peuvent expirer, échouer au paiement ou être annulées à des moments différents.
  - **Rappels de renouvellement** : offre de lancement (3 rappels 30j/10j/3j, `sendSubscriptionReminderEmail()`) vs abonnement payant (1 rappel informatif à 30j, `sendAutoRenewalReminderEmail()`) — logique inchangée depuis son ajout le 2026-07-07, juste recentrée sur l'annonce plutôt que le compte. Anti-doublon : `reminder_30d_sent`/`10d`/`3d`/`reminder_auto_renewal_sent` + `reminder_cycle_expires_at` sur `subscriptions`.
  - **Paiement échoué / `past_due`** : notification unique (`sendPaymentFailedEmail()`, colonne `reminder_past_due_sent`), le webhook préserve le vrai statut Stripe (`active`/`past_due`/`trialing`/`canceled`) au lieu de l'écraser en `inactive`.
  - **Dépublication automatique** : annonces des abonnements `status = 'canceled'` OU offre de lancement expirée sans renouvellement (`listings.unpublished_reason = 'subscription'`, jamais posé par les dépublications manuelles). Idempotent (filtre `is_published = true` avant l'update).
  - **Win-back** (ajouté à l'étape 8) : séquence de retour par annonce individuelle — `listings.unpublished_at`, `reminder_winback_3d_sent`/`14d_sent` (`lib/emails/winbackReminder.ts`), posés/remis à zéro dans le même `UPDATE` que la dépublication/republication pour rester synchronisés.
  - **Republication** : le webhook (`checkout.session.completed`) republie automatiquement l'annonce précise dès qu'un paiement réussit — chez Stripe, un abonnement `canceled` ou une offre expirée ne redeviennent actifs que via une **nouvelle** Checkout Session.
- **Garde-fou publication manuelle** : impossible de publier/republier une annonce tant que son abonnement n'est pas `active` — `/api/listings/[id]/publish/route.ts` et `components/dashboard/ListingForm.tsx`. Message : *"Ton abonnement doit être actif pour publier une annonce — renouvelle-le d'abord."*
- **Email de bienvenue, langue Checkout/reçus** (ajoutés le 2026-07-07) : inchangés dans leur logique, voir historique — `lib/emails/welcomeSubscription.ts` (Resend, bilingue, expéditeur `info@kabanalouer.ca`), `preferred_locales` sur le Customer Stripe fixé uniquement à la création (pas rétroactif).
- **Emails mentionnent l'annonce et le prix verrouillé** (étape 9) : `welcomeSubscription`, `subscriptionReminder`, `winbackReminder` acceptent tous `listingTitle` (fallback "ton chalet"/"your listing" si vide) et affichent le prix verrouillé de la ligne `subscriptions` (`price_cents` → `formatPriceLabel()`) au lieu d'un "299 $" codé en dur.
- **Bug critique corrigé en même temps** (étape 10) : `/dashboard/listings/[id]/edit` filtrait encore l'abonnement par `user_id` avec `.maybeSingle()` — plantait dès qu'un proprio avait plusieurs annonces (plusieurs lignes possibles). Filtre maintenant par `listing_id`, et affiche le vrai prix dynamique (`getNextPaidRank`/`priceForRank`) au lieu du texte "199 $/an" codé en dur qui ne correspondait à aucun des trois tarifs réels. `PublishUI.tsx` (code mort, jamais importé depuis que la vraie UI de publication a été déplacée dans `EditListingForm.tsx`) a été supprimé au passage.
- **Migration de données** : vérifié au préalable qu'aucun proprio actif n'avait plusieurs annonces sous un même abonnement (requête de vérification, 0 ligne retournée) — un backfill simple a suffi, pas de cas "grandfathered" à gérer (`supabase/backfill-subscriptions-listing-id.sql`, exécuté et confirmé). Cutover structurel (`DROP CONSTRAINT`/`ADD CONSTRAINT UNIQUE(listing_id)`/`SET NOT NULL`) exécuté et confirmé le même jour (`supabase/restructure-subscriptions-per-listing-cutover.sql`).

### Offre de lancement gratuite illimitée, sans Stripe (2026-09-01)

Basculée de "50 premiers propriétaires gratuits" à "gratuit pour votre première année, sans limite de nombre de proprios" :

- **`FREE_LAUNCH_LIMIT` et `getFreeLaunchClaimedCount()` retirés** de `lib/subscriptionPricing.ts` — l'éligibilité dépend uniquement de `hasClaimedFreeLaunch` (une fois dans sa vie), plus aucun plafond global. Sans ce changement dans `EditListingForm.tsx`, plus personne n'aurait pu réclamer l'offre une fois le 50ᵉ proprio atteint, peu importe le texte affiché.
- **Aucun appel à l'API Stripe** dans `/api/subscriptions/activate-free` — vérifié par grep sur tout le projet. Écriture directe dans `subscriptions` (`is_free_launch: true`, `stripe_subscription_id: null` — plus de faux ID `free_launch_${listingId}` comme avant, confirmé qu'aucun code ne le lit comme un vrai ID Stripe).
- **Même mécanisme réutilisé pour les imports Airbnb publiés par l'admin** (voir sous-section Import plus bas) — deux points d'écriture créent maintenant ce type d'abonnement, tous deux avec la garde "jamais une deuxième fois".
- **Dépublication à l'expiration** : déjà couverte par le cron existant (`is_free_launch = true AND expires_at dépassé`), aucun nouveau code nécessaire — vérifié avant de coder quoi que ce soit.
- **Garde défensive ajoutée** : la branche `past_due` du cron de rappels (email "paiement échoué") vérifie maintenant aussi `is_free_launch = false` — une ligne gratuite n'a jamais de vraie carte Stripe, donc ne devrait jamais atteindre `past_due` par un chemin réel, mais si ça arrivait, l'ancien code aurait envoyé un email affirmant à tort qu'une carte a été refusée.
- **Textes mis à jour partout** : page d'accueil, `/tarifs`, `/devenir-hote`, badge dashboard (`SubscriptionClient.tsx`), FAQ propriétaires, Conditions d'utilisation — nouvelle formule standard FR "Gratuit pour votre première année" / EN "Free for your first year".
- **Promesse "conservation 90 jours" retirée** (FAQ propriétaires, Conditions d'utilisation, Politique de confidentialité section "Conservation des données", y compris le JSON-LD FAQPage codé en dur de `/faq-hotes`) — aucun mécanisme de suppression après 90 jours n'existait ni n'était prévu ; le comportement réel (données conservées indéfiniment après dépublication, aucune suppression automatique) est maintenant ce qui est écrit.

### Traduction automatique des messages FR⇆EN (2026-09-01)

Remplace l'ancien système (traduction à la demande via Claude Haiku, toggle par conversation en `localStorage`, jamais persisté) par une traduction automatique à l'envoi, stockée en base.

- **Google Cloud Translation API v2** (`lib/googleTranslate.ts`) — endpoint `https://translation.googleapis.com/language/translate/v2` (⚠️ pas `/language/translate2` — bug réel commis puis corrigé le jour même, trouvé via un vrai test de bout en bout en production qui a confirmé un 404 Google dans les logs Vercel).
- **Colonnes** : `messages.content_translated`/`translated_language` (nullable), `users.translation_enabled` (bool, défaut `true`, **réglage global par utilisateur, pas par conversation** — remplace le `localStorage` précédent).
- **Déclenchement** : à l'envoi, si `preferred_language` diffère entre expéditeur et destinataire ET que le destinataire n'a pas désactivé la traduction. Centralisé dans une nouvelle route `POST /api/messages`, qui remplace les 3 anciens points d'insertion directe côté client (`MessagesClient.tsx`, `ContactButton.tsx`, `ContactForm.tsx` — ce dernier ne renseignait jamais `language`, corrigé au passage).
- **Échec toujours silencieux** : `translateText()` ne lève jamais d'exception, retourne `null` — le message s'affiche normalement sans traduction plutôt que de bloquer l'envoi.
- **Propagation** : via Realtime `UPDATE` sur `messages` (ajouté dans `MessagesClient.tsx` — l'abonnement existant n'écoutait que `INSERT`, une mise à jour de traduction posée après coup n'aurait jamais atteint le destinataire déjà sur la page).
- **Affichage** : badge "Traduit automatiquement" au-dessus du texte traduit, original en dessous, visible seulement si `translation_enabled` est **actuellement** vrai pour le lecteur — si désactivé après coup, les traductions déjà en base restent stockées mais masquées, jamais supprimées.
- **Testé de bout en bout en production** avec deux vrais comptes (langues différentes, sessions injectées via jetons Supabase le temps du test) : traduction générée et affichée correctement après le correctif d'endpoint.
- Helpers `cleanDescription`/`truncateToLastSentence` extraits vers `lib/aiText.ts` (partagé avec `generate-description` et l'import Airbnb).

### Sécurité (audit complet effectué)
- **Headers HTTP** : X-Frame-Options, X-Content-Type-Options, Referrer-Policy, CSP — configurés dans `next.config.ts`
- **Rate limiting IA** : 20 appels/heure/utilisateur via table `ai_usage_log` (`lib/aiRateLimit.ts`)
- **CRON_SECRET** : `/api/sync-ical` bloqué sans le header `Authorization: Bearer <secret>`
- **SSRF** : `/api/sync-ical` valide les URLs iCal (HTTPS uniquement, pas d'IP privées)
- **Validation serveur** : messages 5000 chars, reviews 2000 chars, contact 5000 chars
- **Avatar bucket** : MIME types restreints aux images uniquement (Supabase Storage)
- **`/api/views`** : Origin check (kabanalouer.ca + localhost) + throttle IP 5 min par annonce

### Cloudflare Turnstile (anti-bot)
- Site Key : `0x4AAAAAADun6nA4SV0GHTM6` (hardcodée dans les pages login/signup)
- Secret Key : configurée dans **Supabase Dashboard → Authentication → Bot Protection**
- `TurnstileWidget.tsx` : script `afterInteractive` + `onLoad` callback pour render fiable
- Passé via `captchaToken` dans `signUp()` et `signInWithPassword()`

### Auth — rôle proprio/voyageur
- **Email signup** : rôle dans `options.data.role` → trigger Postgres → `public.users.role`
- **Google OAuth** : rôle passé dans l'URL de callback (`?role=host`), pas dans `queryParams` (ceux-ci vont à Google et sont perdus). Le callback `/auth/callback` lit le rôle et met à jour `public.users`.
- **Trigger SQL** : `supabase/fix-handle-new-user-role.sql` — à exécuter si des proprios arrivent en mode voyageur après inscription

### Send Email Hook (emails Auth personnalisés) — mis en place le 2026-07-07
- **Edge Function** : `supabase/functions/send-email-hook/index.ts` — déployée et active en production
- Intercepte et personnalise uniquement les emails **signup** (confirmation d'inscription) et **recovery** (réinitialisation de mot de passe), dans la langue de l'utilisateur (`preferred_language`), avec le design Kabanalouer (olive/coral, Plus Jakarta Sans, boutons `rounded-full`)
- **Configuré dans** Supabase Dashboard → Authentication → Hooks → Send Email Hook (type HTTPS), pointant vers la fonction déployée
- **Secrets requis** dans l'environnement de la fonction (via `supabase secrets set`) : `RESEND_API_KEY` et `SEND_EMAIL_HOOK_SECRET`
- ⚠️ **Point important** : une fois ce hook actif, Supabase n'envoie **plus aucun email par défaut, pour aucun type d'événement** — le SMTP interne est désactivé globalement pendant que le hook est actif, pas seulement pour signup/recovery. Si on ajoute un jour magic link, invitation, ou changement d'email, il faudra revenir modifier cette fonction pour les gérer aussi, sinon **aucun email ne partira** pour ces cas.
- **Testé et validé en production le 2026-07-07** : inscription et mot de passe oublié, en français, avec succès
- **Re-confirmé fonctionnel le 2026-09-03** : après un doute soulevé par des notes contradictoires, mot de passe oublié re-testé en conditions réelles (`slemay@authentik.com`, vrai clic sur `/login` → "Mot de passe oublié ?" → `/auth/v1/recover`) — courriel brandé reçu correctement, en français. Le hook n'a jamais cessé de fonctionner.
- ⚠️ **Piège à connaître pour un futur diagnostic** : `admin.generateLink()` (utilisé par la technique de sessions injectées via jetons Supabase — voir plus bas, "sessions injectées... pour contourner Cloudflare Turnstile") **ne déclenche jamais ce hook** — le lien est retourné directement à l'appelant côté serveur, aucun courriel n'est envoyé par aucun canal. Cette méthode pose quand même `recovery_sent_at` sur `auth.users`, ce qui peut *ressembler* à une vraie demande de réinitialisation dans les données mais n'en est pas une (cas vécu le 2026-09-01, source d'une fausse alerte "le hook semble cassé" résolue le 2026-09-03). Seul un vrai clic "Mot de passe oublié" sur `/login` (route `/auth/v1/recover`, pas `/auth/v1/admin/generate_link`) exerce réellement le hook.
- **Version anglaise confirmée fonctionnelle le 2026-09-03** : mot de passe oublié testé en anglais (`slemay@authentik.com` basculé temporairement à `preferred_language='en'`, test réel sur `/en/login`) — courriel brandé reçu, en anglais. **Délai de livraison observé** (~quelques minutes, pas instantané comme le test français) — probablement lié à l'enchaînement rapproché de 2 vraies demandes de récupération (FR à 13h57 EDT, EN à 14h04 EDT), cohérent avec la limite de débit par défaut de Supabase Auth déjà documentée le 2026-07-07 (`email rate limit exceeded`) : le courriel semble avoir été mis en attente plutôt que bloqué. Pas un bug du hook — les deux langues sont maintenant confirmées bout en bout. ⚠️ À vérifier : le compte de test doit être remis à `preferred_language='fr'` après le test (pas encore confirmé fait au moment d'écrire cette note).
- **Bug critique découvert et corrigé le 2026-09-03 en testant le clic réel sur un lien de réinitialisation** (jusque-là, seule la réception du courriel avait été vérifiée, jamais le clic jusqu'au bout) : `@supabase/ssr` utilise le **flux PKCE par défaut** — le lien de courriel revient sur `/reset-password` avec un `?code=` à échanger explicitement via `exchangeCodeForSession()`. `ResetPasswordForm.tsx` ne le faisait jamais (il attendait seulement `getSession()`/l'événement `PASSWORD_RECOVERY`, qui ne se produisent jamais sans cet échange) — chaque lien de réinitialisation affichait donc "Lien invalide ou expiré", **dans les deux langues, probablement depuis toujours**. Corrigé : `ResetPasswordForm.tsx` échange le code avant de vérifier la session ; `ForgotPasswordForm.tsx` localise aussi `redirectTo` (corrige au passage l'écran d'erreur qui s'affichait en français même pour un test anglais).
  - Signup en anglais reste le seul flux jamais testé (voir ci-dessus, signup FR + recovery FR/EN tous confirmés).
- **À faire éventuellement** :
  - Tester la confirmation d'inscription (signup) en anglais — seul flux encore jamais vérifié en conditions réelles.
  - Envisager la rotation de `RESEND_API_KEY` et `SEND_EMAIL_HOOK_SECRET` — exposés en clair dans une session de travail, jamais tournés depuis

### Côté voyageur
- **Recherche** : filtres, Google Maps split-view sur `/chalets`
- **Messagerie** directe proprio ↔ voyageur
- **Avis** avec réponse proprio + notification email Resend
- **Favoris**

### SEO / public
- 14 pages région statiques + pages villes dynamiques
- Sitemap XML automatique
- Métadonnées Open Graph + Twitter sur toutes les pages clés

### i18n (next-intl)
- FR par défaut (`/`), EN via préfixe `/en/`
- `useTranslations()` dans les composants client, `getTranslations()` dans les server components
- Namespaces traduits : `auth`, `home`, `contact`, `creationChoice`, etc.

### Import d'annonces depuis Airbnb (2026-09-01)

Phase 1 de l'import d'annonces externes — **Airbnb seulement**, VRBO retiré (voir plus bas).

**Création du brouillon** :
- **Route** : `POST /api/listings/import` — `{ url, photosRightsConfirmed }`, authentifié (`host`/`admin` seulement), limité à 20 imports/heure/utilisateur (`checkAiRateLimit`, avant l'appel Apify — coûte des crédits réels). Détecte la plateforme par domaine (`lib/apify.ts`, match par label de domaine exact, jamais par sous-chaîne), rejette VRBO avec un message explicite, appelle l'actor Apify `tri_angle/airbnb-rooms-urls-scraper` (poll jusqu'à 60s, `maxDuration = 90` sur la route), mappe les données vers `listings` (`lib/listingImportMapping.ts`), crée le brouillon (`is_published: false`, `import_status: 'pending_review'`), envoie une notification à Simon (`lib/emails/importNotification.ts`), puis déclenche la réécriture IA de la description (Claude Sonnet, `claude-sonnet-4-6`) qui met en valeur les équipements et intègre nom/ville/région pour le SEO.
- **`amenities` et `region` sont des listes fermées** (`lib/amenities.ts`, `lib/regions.ts`) — le texte scrapé ne matche jamais exactement, donc mapping best-effort par mots-clés (`matchAmenities`/`matchRegion` dans `lib/listingImportMapping.ts`). Ce qui ne matche rien est conservé dans `listings.import_raw_data` (jsonb) pour révision admin, jamais perdu silencieusement.
- **VRBO retiré de la phase 1** (2026-09-01) : l'actor `one-api/vrbo-scraper` s'est montré peu fiable sur les photos lors d'un vrai test — sur une annonce, seulement 2 entrées retournées dans `Raw.photos`, toutes les deux des vignettes de carte Google Maps (`maps.googleapis.com`), aucune vraie photo du chalet, alors qu'un premier test avait fonctionné correctement (5 vraies photos + 2 vignettes). Le reste des données (titre, description, chambres, équipements, localisation) était bien extrait — seule l'extraction de photos a échoué, de façon incohérente d'une annonce à l'autre. À réévaluer plus tard : un actor Apify plus fiable, ou une méthode maison. Le mapping VRBO (`mapVrboItem` dans `lib/listingImportMapping.ts`) reste en place, juste non branché sur la route.
- **Testé en conditions réelles** : Airbnb fonctionne très bien — titre, description, 80 photos avec légendes, équipements et région bien mappés sur un vrai chalet des Laurentides.
- **3 failles corrigées le même jour** (trouvées par revue de sécurité automatique sur le commit initial) : allowlist de domaine trop permissive (`.includes()` au lieu d'un match ancré — un lien `airbnb.evil.com` aurait été traité comme un vrai lien Airbnb), absence de limite avant l'appel Apify payant, et injection JSON-LD (`JSON.stringify()` n'échappe pas `</script>` — un titre/description scrapé contenant cette séquence aurait pu s'exécuter comme un vrai script sur la page publique de l'annonce ; voir `lib/jsonLd.ts`, à utiliser pour tout JSON-LD contenant des données qui ne sont pas 100 % du texte statique).

**Révision et publication par l'admin** :
- **Accès admin au formulaire d'édition existant** (`app/dashboard/listings/[id]/edit`) : nouvelle politique RLS admin sur `listings` (voir encadré ci-dessous) — **la toute première du projet**. La page interroge sans filtre `host_id`, laisse RLS trancher (propriétaire OU admin), puis vérifie explicitement `isOwner || isAdmin` avant de rendre le formulaire (RLS autorise aussi la lecture de n'importe quelle annonce **publiée** pour l'affichage public — ça ne doit jamais suffire à ouvrir ce formulaire). `EditListingForm` reçoit toujours `userId = listing.host_id` (le vrai propriétaire, jamais l'admin qui consulte) pour que ses nombreuses écritures Supabase directes (`handleSaveSection`, photos, chambres, promotions, calendrier...) restent correctement filtrées.
- **Bouton "Publier au nom du propriétaire"** : visible uniquement si `isAdminReview && import_status === 'pending_review'` (jamais pour un proprio sur sa propre annonce), reste soumis à la même validation des champs obligatoires que la publication normale. Route `POST /api/admin/listings/[id]/publish` (vérifie `role === 'admin'` server-side) : passe `is_published: true`/`import_status: 'published'`, crée l'abonnement offre de lancement (`is_free_launch: true`, upsert `onConflict: listing_id`, marque `free_launch_claimed_at`) **seulement si ce proprio ne l'a jamais réclamée ailleurs** (sinon rien n'est créé, laissé à une révision manuelle plutôt que de contourner silencieusement la règle "une fois dans sa vie"), puis envoie le courriel de bienvenue (`lib/emails/importPublished.ts`, lien direct vers la fiche publique, mention de l'offre gratuite seulement si un abonnement a effectivement été créé).
- **File d'attente** : `/admin/imports` (ajouté à `AdminNav.tsx`) — liste simple des annonces `import_status = 'pending_review'`, triée par date, lien "Réviser" vers le formulaire d'édition.

> **Politique RLS admin sur `listings` — un cas à part.** Partout ailleurs dans ce projet (abonnements, proprios, panneau annonces), l'admin agit via le client service-role côté serveur, jamais via une session RLS élargie. Exception acceptée sciemment ici : `EditListingForm.tsx` fait de nombreuses écritures Supabase directes côté client (pas via une API centralisée) — router chacune vers une nouvelle API service-role aurait été un chantier disproportionné pour débloquer la révision des imports. Compromis de rapidité de développement accepté malgré le risque : une politique RLS élève les permissions au niveau de **la session admin entière** sur toute la table, pas d'une route précise et auditable. La politique vérifie `role = 'admin'` strictement via une jointure sur `users` (jamais juste "authenticated"). Migration : `supabase/add-listings-admin-rls-policy.sql`.

---

## 10. Variables d'environnement

Requises dans `.env.local` (et dans Vercel → Settings → Environment Variables) :

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY          # server-side uniquement
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
ANTHROPIC_API_KEY
GOOGLE_TRANSLATE_API_KEY           # server-side uniquement — traduction auto des messages
APIFY_API_TOKEN                    # server-side uniquement — import d'annonces Airbnb (Apify)
RESEND_API_KEY
CRON_SECRET                        # openssl rand -hex 32 — protège /api/sync-ical
NEXT_PUBLIC_APP_URL                # https://kabanalouer.ca
```

---

## 11. Comptes de test

| Compte | Email | Rôle | Notes |
|---|---|---|---|
| Admin | simon.authentik@gmail.com | admin | Accès `/admin` |
| Voyageur | slemay@authentik.com | traveler | Compte voyageur de test |
| Proprio test | info@chaletauthentik.com | host | `is_free_launch=false` pour tester le flux Stripe payant |

**Données de test laissées sur `info@chaletauthentik.com` (2026-09-01)** — à nettoyer ou ignorer selon le besoin :
- Annonce brouillon "Chalet test QA au bord du lac" (déjà notée section 14, préexistante).
- Une annonce importée depuis un vrai lien VRBO (`https://www.vrbo.com/fr-ca/location/p9607368`) créée pendant le test du flux d'import — brouillon `pending_review`, jamais publié, `import_raw_data` contient la vraie réponse Apify (utile comme référence si besoin de retester le mapping VRBO plus tard).
- `preferred_language` a été temporairement basculé à `'en'` puis remis à `'fr'` pour le test de traduction — confirmé remis à sa valeur d'origine.

---

## 12. Migrations SQL en attente (Supabase Dashboard → SQL Editor)

Ces fichiers sont dans `/supabase/` et doivent être exécutés manuellement :

| Fichier | Description | Statut |
|---|---|---|
| `fix-handle-new-user-role.sql` | Corrige le trigger d'inscription pour bien lire le rôle | À exécuter si le bug rôle persiste |
| `fix-handle-new-user-preferred-language.sql` | Ajoute `preferred_language` à l'INSERT du trigger (manquant, comptes email restaient bloqués sur `fr`) | Exécuté et confirmé en prod le 2026-07-07 |
| `add-welcome-email-sent-column.sql` | Ajoute `users.welcome_email_sent` (garde anti-doublon, email de bienvenue voyageur) | Exécuté et confirmé en prod le 2026-07-07 |
| `add-subscription-reminder-tracking.sql` | Ajoute `reminder_30d_sent`/`10d`/`3d`/`reminder_cycle_expires_at` à `subscriptions` | Exécuté et confirmé en prod le 2026-07-07 |
| `add-reminder-auto-renewal-column.sql` | Ajoute `reminder_auto_renewal_sent` à `subscriptions` (rappel unique, abonnements payants) | Exécuté et confirmé en prod le 2026-07-07 |
| `add-reminder-past-due-column.sql` | Ajoute `reminder_past_due_sent` à `subscriptions` (notification paiement échoué) | Exécuté et confirmé en prod le 2026-07-07 |
| `add-listings-unpublished-reason-column.sql` | Ajoute `unpublished_reason` à `listings` (dépublication/republication automatique liée à l'abonnement) | Exécuté et confirmé en prod le 2026-07-07 |
| `add-is-free-launch-column.sql` | Ajoute la colonne `is_free_launch` à `subscriptions` | Probablement déjà en place |
| `add-subscriptions-listing-id-column.sql` | Ajoute `listing_id`/`price_cents`/`price_tier` à `subscriptions` (restructuration par annonce, étape 1/10) | Exécuté et confirmé en prod le 2026-07-07 — requis pour le backfill et le cutover ci-dessous, tous deux réussis |
| `add-users-free-launch-claimed-column.sql` | Ajoute `free_launch_claimed_at` à `users` (offre de lancement une fois dans sa vie, étape 1/10) | Exécuté et confirmé en prod le 2026-07-07 |
| `backfill-subscriptions-listing-id.sql` | Remplit `listing_id` sur les lignes `subscriptions` existantes (étape 3/10) | Exécuté et confirmé en prod le 2026-07-07 |
| `restructure-subscriptions-per-listing-cutover.sql` | Cutover structurel : `DROP CONSTRAINT` sur `user_id`, `ADD CONSTRAINT UNIQUE`/`SET NOT NULL` sur `listing_id` (étape 4/10) | Exécuté et confirmé en prod le 2026-07-07 |
| `add-listings-winback-columns.sql` | Ajoute `unpublished_at`/`reminder_winback_3d_sent`/`14d_sent` à `listings` (séquence de retour, étape 8/10) | Exécuté et confirmé en prod le 2026-07-07 |
| `add-translation-columns.sql` | Ajoute `messages.content_translated`/`translated_language` et `users.translation_enabled` (traduction auto FR/EN des messages) | Exécuté et confirmé en prod le 2026-09-01 |
| `add-listing-import-columns.sql` | Ajoute `listings.import_source`/`import_source_url`/`import_status`/`photos_rights_confirmed`/`import_raw_data` (import Airbnb) | Exécuté et confirmé (projet Supabase unique, partagé dev/prod) le 2026-09-01 |
| `add-listings-admin-rls-policy.sql` | Ajoute la politique RLS "Les admins gèrent tous les listings" — première politique RLS admin du projet, voir section 9 (Import d'annonces) pour le compromis accepté | À exécuter par Simon dans Supabase SQL Editor |
| `add-featured-reminder-tracking.sql` | Ajoute `reminder_3d_sent_at`/`expired_email_sent_at` à `featured_listings` (séquence email boost) | À exécuter dans Supabase Dashboard si pas déjà fait |
| `ai-usage-log.sql` | Crée la table `ai_usage_log` pour le rate limiting IA | À vérifier |
| `messages-constraints.sql` | Contrainte max 5000 chars sur `messages.content` | À vérifier |
| `avatar-bucket-mime.sql` | Restreint les MIME types du bucket `avatars` | À vérifier |

---

## 13. Historique des sessions — 2026-07-08 au 2026-09-01

### Fonctionnalités complétées

**Séquence email boost (3 emails)** — `lib/emails/featuredListing.ts`, webhook et cron étendus, voir section 9 (Module vedettes). Migration `add-featured-reminder-tracking.sql` fournie mais pas exécutée automatiquement.

**Renommage "vedette" → "boost"** dans tous les textes proprio/admin (dashboard, emails, panneau admin) — le mot "vedette" reste utilisé côté voyageur (nom de la section publique) et dans tous les identifiants techniques (table `featured_listings`, paramètre d'URL `?section=vedette`, etc.), volontairement inchangés.

**Audit QA complet** (playwright-cli + skill webapp-testing, en lecture seule sauf autorisation explicite) et corrections des bugs trouvés :
- Cron envoyant un rappel/expiration boost contradictoire après un renouvellement anticipé (`hasNewerRenewal()`)
- Phrase incorrecte "couvre le mois en cours" dans l'email de confirmation boost
- Faux témoignages retirés de `/devenir-hote` (contenu fictif, jamais de vrais avis clients)
- Logos en `<object type="image/svg+xml">` bloqués par la CSP (`object-src 'none'`) → remplacés par `<img>` à 6 emplacements
- Espace manquant + traduction anglaise manquante dans le texte vide des pages région (`RegionLanding.tsx`)
- Titres de page génériques corrigés (login, signup, mot de passe, abonnement) — split en `page.tsx` (server, `metadata`) + composant client, pattern déjà utilisé pour `EditListingForm.tsx`
- Nouvelle page 404 (`app/not-found.tsx`)
- Un proprio en offre de lancement gratuite ne pouvait pas passer à un abonnement payant (bloqué en 409) — `app/api/stripe/checkout/route.ts` bloquait le checkout dès qu'une ligne `subscriptions` existait pour l'annonce, même si elle était `is_free_launch: true` ; corrigé pour ne bloquer que si `existingSub?.status === "active" && existingSub?.is_free_launch === false`

**Test de bout en bout réel** de la séquence boost (achat → rappel J-3 → expiration) en production, paiement Stripe en mode Test, chaque écriture Supabase directe montrée et approuvée individuellement avant exécution.

**Bug `user_id` vs `listing_id` sur `subscriptions`** — depuis le cutover du 2026-07-07 (`UNIQUE(listing_id)`, plus par proprio), 7 emplacements filtraient encore par `user_id` avec `.maybeSingle()`, qui plante avec une erreur `PGRST116` dès qu'un proprio a 2+ annonces payantes. Corrigé en 2 lots : 3 fichiers simples (dont `app/api/listings/[id]/publish/route.ts` — vérification de propriété de l'annonce déplacée avant la vérification d'abonnement, filtre `user_id` → `listing_id`) + suppression du code mort `ListingForm.tsx`, puis refonte du panneau admin (`/admin/subscriptions`, `/api/admin/subscriptions`, `/admin/hosts`) — voir détails dans l'historique git, commits de "fix: corrige le bug user_id/listing_id" et "fix: corrige le panneau admin pour l'architecture per-listing". `/admin/hosts` a perdu son modale d'action (cassée par la même refonte) et renvoie maintenant vers `/admin/subscriptions?q=...` pour toute action.

**Revue visuelle du dashboard proprio** avec les skills `frontend-design` + `ui-ux-pro-max` (analyse uniquement, palette/police/boutons du design system non négociables) — 2 corrections "petites et sûres" appliquées : couleur du toggle %/$ dans Promotions (`bg-charcoal-800` → `bg-primary`), état désactivé neutre du bouton Sauvegarder du Calendrier (`bg-charcoal-200`/`text-charcoal-400` au lieu d'une opacité réduite sur `bg-primary`).

### Leçons techniques retenues

- **`.maybeSingle()` sur 2+ lignes ne retourne pas silencieusement `undefined`** — il retourne `{data: null, error: {code: "PGRST116"}, status: 406}` (vérifié dans `@supabase/postgrest-js` v2.105.4). Le bug `user_id`/`listing_id` n'était pas silencieux, juste jamais vérifié par le code appelant.
- **Toute restructuration de contrainte d'unicité** (comme `subscriptions` par `user_id` → `listing_id` le 2026-07-07) doit être suivie d'un grep systématique de tous les `.eq("user_id", ...)` / `onConflict: "user_id"` sur la table concernée — le panneau admin avait été oublié lors du cutover initial.
- **`<object type="image/svg+xml">` est bloqué par une CSP stricte** (`object-src 'none'`) — utiliser `<img>` pour des SVG statiques comme des logos.
- **Skills plugin installés via `/plugin` + `/reload-plugins`** peuvent afficher "0 skills" dans le message de confirmation tout en étant réellement chargés et utilisables dans la session — vérifier directement l'accès au `SKILL.md` plutôt que de se fier au message.

### Suite de session — 2026-07-09

- **Outillage** : installation des plugins `vercel`, `stripe`, `typescript-lsp`, `security-guidance`, `code-simplifier`, `hookify`, `claude-md-management` (via `/plugin` + `/reload-plugins`)
- Bug SITE_URL, note iCal et politique d'approbation traités le même jour — voir sections 10, 14 et 15 (déjà committés séparément, `c64d582`/`65652aa`)

### Session du 2026-07-10 (Cowork)

**Bug critique corrigé** : les compteurs de badges (messages non lus, avis sans réponse) dans la Navbar et la barre de navigation mobile retournaient silencieusement 0 pour tous les proprios — les requêtes Supabase en `HEAD` (`count: exact`) envoyées directement depuis le navigateur retournaient systématiquement une erreur 503 (100 % reproductible, aucune erreur console). Root-causé via sub-agent : seuls `Navbar.tsx` et `DashboardBottomNav.tsx` (client-side, `@/lib/supabase/client`) étaient touchés. Corrigé en créant `app/api/nav/counts/route.ts` (calcul serveur) et en basculant les deux composants sur un simple `fetch()`. Commit `f78cf8c`, vérifié en production (200 au lieu de 503).

**Audit SEO/GEO complet** : correction du schema.org `LodgingBusiness` (checkinTime/checkoutTime, pricing minPrice-only pour éviter d'affirmer un maxPrice inexistant), ajout Organization/WebSite JSON-LD, fixes `robots.ts` (commits `73164d2`, `807726f`). Recherche sur l'éligibilité à Google Vacation Rentals : le modèle peer-to-peer de Kabanalouer est explicitement exclu par Google (réservé aux gestionnaires professionnels multi-propriétés) — pas une piste à poursuivre.

**Audit UX/UI complet** (desktop + mobile, site public et dashboard proprio, via Claude in Chrome) : aucun bug visuel majeur trouvé, corrections précédentes confirmées en production.

**Pages villes bilingues** : ajout de la route EN + métadonnées traduites pour `/chalets/ville/[slug]` (nouveau fichier `app/[locale]/cabins/city/[slug]/page.tsx`, même pattern de ré-export que les pages région), correction de textes restés en français sur `RegionLanding.tsx` malgré le pattern `isEn` déjà en place ailleurs dans le fichier, ajout des URLs EN dans `app/sitemap.ts` (`cityPages`). Commit `a1d4522`.

**Discussions stratégiques (hors code, rien d'implémenté)** :
- Infolettre : recommandation d'utiliser les fonctionnalités natives Resend (Broadcasts + Audiences) plutôt que Mailchimp, puisque le domaine `kabanalouer.ca` est déjà vérifié chez Resend — éviterait un nouvel abonnement/outil à intégrer.
- Blogue : deux approches proposées, aucune décision prise — (a) articles en Markdown dans le repo (simple, mais nécessite mon implication à chaque publication), ou (b) table Supabase + section `/dashboard/blog` (plus de travail initial, mais autonomie complète pour Simon).
- Plan stratégique de lancement complet produit : document Word `Kabanalouer_Plan_Strategique_Lancement.docx` (racine du repo) — positionnement, avatars proprios/voyageurs, accroches, analyse concurrentielle détaillée (concurrents principaux identifiés par Simon : ChaletsAuQuebec.com, Chaletsalouer.com, Trouvermonchalet.ca; concurrents secondaires : RSVPchalets, Reserver.ca, Québec location de chalets, MonsieurChalets, Airbnb/VRBO), plan de recrutement des proprios, plan de communication voyageurs. Cibles chiffrées (KPIs) pas encore définies avec Simon.

### Session du 2026-09-01

Trois chantiers de fond, chacun testé en conditions réelles avant commit :

1. **Offre de lancement gratuite illimitée, sans Stripe** — voir section 9. Retrait complet du plafond de 50 places et de la promesse de conservation "90 jours" (textes + logique).
2. **Traduction automatique des messages FR⇆EN** — voir section 9. Bug d'endpoint Google Translate trouvé et corrigé via un vrai test de bout en bout en production.
3. **Import d'annonces Airbnb, phase 1** — voir section 9. VRBO exploré puis retiré pour fiabilité des photos côté actor Apify. File de révision admin + politique RLS admin (première du projet) + courriels de notification/bienvenue.

**Aussi fait** : 3 failles de sécurité corrigées le jour même sur le commit initial de l'import (allowlist de domaine, absence de limite avant l'appel Apify, injection JSON-LD — voir section 9) ; recherche de faisabilité pour importer depuis Chalet à louer / Chalet au Québec (concurrents) — voir section 14, rien codé.

**Outillage** : première utilisation dans ce projet d'une politique RLS admin (compromis documenté section 9) ; premier usage de sessions injectées via jetons Supabase (`/auth/v1/verify` + cookies `@supabase/ssr` reconstruits) pour contourner Cloudflare Turnstile en test local, faute d'accès aux domaines autorisés à temps.

### Prochaine étape immédiate

**Grand test complet en attente (Simon)** — rien de ce qui suit n'a encore été testé en conditions réelles par un vrai clic bout en bout, seulement par des appels directs :
- Flux de révision admin des imports Airbnb au complet : recevoir la notification, réviser via le formulaire, cliquer "Publier au nom du propriétaire", confirmer que le courriel de bienvenue part bien et que l'abonnement offre de lancement est bien créé.
- QA fonctionnel du site (recherche, formulaires, navigation, erreurs console) — toujours pas fait depuis le 2026-07-10.
- Sélecteur de langue FR/EN dans le profil + redirection automatique (section 14) — toujours pas testé depuis le 2026-07-07.
- Version anglaise des emails Auth (signup + recovery) — toujours pas testée depuis le 2026-07-07 (bloqué à l'époque par une limite de débit Supabase, jamais repris).

**Décisions produits toujours en attente** (aucun changement depuis le 2026-07-10) : infolettre (Resend Broadcasts vs Mailchimp), blogue (Markdown vs table Supabase), cibles chiffrées du plan stratégique.

Voir section 14 pour les autres points en suspens (findings structurels de la revue visuelle non traités, avertissements console à vérifier).

---

## 14. Points en suspens

### Titre de test laissé sur une annonce brouillon (2026-07-09)

Lors d'un test QA de la sauvegarde du formulaire "Titre", le titre "Chalet test QA au bord du lac" a été saisi et sauvegardé sur une vraie annonce brouillon de Simon (effet de bord d'un test, pas une donnée fictive isolée). Pas confirmé si corrigé depuis — à vérifier avec Simon, ou il peut simplement remettre son vrai titre.

### Stripe — reçus/factures bloqués tant que le compte n'est pas activé (2026-07-04)

Le branding (logo, couleurs olive/coral), le webhook et le réglage "Paiements réussis" (Paramètres → Entreprise → E-mails client) sont tous correctement configurés et fonctionnels — testé et confirmé via un paiement complet de bout en bout (`4242 4242 4242 4242`, compte `info@chaletauthentik.com`).

Mais Stripe refuse d'envoyer un reçu à une vraie adresse cliente tant que le compte n'est pas **"activé"** (informations d'entreprise soumises et vérifiées par Stripe) — même en mode Test, il limite l'envoi à l'adresse du propriétaire du compte (`simon.authentik@gmail.com`).

À reprendre une fois le statut fiscal de Simon confirmé (NEQ vs travailleur autonome) et le compte Stripe activé en conséquence.

### Infrastructure email (Resend + Google Workspace) — Phase 1 terminée (2026-07-06)

- **Domaine vérifié** : `kabanalouer.ca` vérifié dans Resend (DKIM + SPF + DMARC)
- **Google Workspace** : configuré et fonctionnel — Gmail actif pour `slemay@kabanalouer.ca` et `info@kabanalouer.ca`
- **SMTP custom Supabase Auth** : branché sur Resend (host `smtp.resend.com`, port `465`, username `resend`, expéditeur `no-reply@kabanalouer.ca`) — testé avec succès
- **Code** : les 3 appels Resend (`app/devenir-hote/actions.ts`, `app/api/reviews/route.ts`, `app/api/reviews/[id]/reply/route.ts`) utilisent maintenant `Kabanalouer <no-reply@kabanalouer.ca>` au lieu de `onboarding@resend.dev` — commité et déployé (commit `445494b`)

**Reste à faire :**
- Grand test complet des emails en conditions réelles — **mot de passe oublié confirmé le 2026-09-03 dans les deux langues (FR et EN)** (voir section Send Email Hook) ; reste à tester : confirmation d'inscription (signup), FR et EN
- Templates Supabase Auth bilingues — **confirmés brandés et fonctionnels dans les deux langues** pour le flux mot de passe oublié

### Langue préférée (`preferred_language`) — en attente de test manuel (2026-07-07)

Implémenté (commit `4eabe82`) mais pas encore testé en conditions réelles :
- Section langue FR/EN dans `/dashboard/profile` (met à jour `auth.updateUser` + `public.users.preferred_language`, redirige vers l'équivalent `/en`)
- Redirection automatique dans le middleware pour les utilisateurs connectés sous `/dashboard`, `/messages`, `/favoris` si l'URL ne correspond pas à `preferred_language`

À valider lors du grand test de bout en bout : sélecteur FR/EN dans le profil (mise à jour + redirection immédiate + persistance après refresh), redirection automatique dans l'espace connecté, et confirmer que les pages publiques restent librement navigables via le sélecteur du footer même connecté.

### Revue visuelle du dashboard proprio (frontend-design + ui-ux-pro-max) — findings non traités (2026-07-08)

Seuls les 2 points "petits et sûrs" ont été corrigés (voir section 13). Restent en suspens, à discuter avant d'y toucher :
- Regroupement des "Caractéristiques" dans l'édition d'annonce
- Traitement de l'espace vide sur les sections courtes du dashboard
- État vide de la section "Aperçu"
- Incohérence de l'ordre des CTA mobile vs desktop

### Import depuis Chalet à louer / Chalet au Québec — faisabilité validée, rien construit (2026-09-01)

Recherche exploratoire (lecture seule, une annonce réelle testée par site) avant de décider si ça vaut la peine de construire un scraper dédié pour ces 2 concurrents (pas d'actor Apify existant, contrairement à Airbnb/VRBO) :

- **chaletsauquebec.com** : entièrement rendu côté serveur (ASP.NET WebForms), zéro JavaScript requis. Titre, description, photos (26 trouvées, conversion `/thumb/` → `/Grand/` pour la pleine résolution), chambres/capacité/équipements (panneau de faits structuré), région (vrai `BreadcrumbList` en microdata), prix — tout extractible par simple fetch HTML. `robots.txt` entièrement ouvert.
- **chaletsalouer.com** : pareil sauf la galerie photo, qui est chargée par un carrousel JS (seulement 5-6 vignettes dans le HTML brut) — nécessiterait Playwright ou de la rétro-ingénierie d'un endpoint AJAX pour cette annonce en particulier. `robots.txt` bloque nommément les crawlers IA (ClaudeBot inclus) via `Content-Signal: ai-train=no` — pas un blocage technique du scraping en général, mais un signal explicite à respecter (user-agent honnête requis, jamais un navigateur ou un autre bot usurpé).
- **Recommandation** : réaliste à construire, mais tester 5-10 annonces de plus par site avant de s'engager (une seule annonce testée par site) — contrairement aux actors Apify (maintenus par une équipe externe), un scraper maison ici serait 100 % à la charge de Kabanalouer si le site change de structure.

### Export iCal — lien jamais affiché sur la page Disponibilités (2026-07-09)

`exportUrl` dans `app/dashboard/listings/[id]/availability/page.tsx` est calculée mais jamais affichée à l'utilisateur (code mort préexistant, pas introduit aujourd'hui) — `ICalSync` ne reçoit que `listingId`/`initialUrl`/`initialLastSync`, pas d'export visible sur cette page. À déterminer : est-ce voulu (export pas encore livré comme fonctionnalité) ou un oubli d'intégration. Non urgent.

---

## 15. Règles d'approbation (mise à jour le 2026-09-01)

**Approbation manuelle stricte et obligatoire — jamais d'auto-approbation, même en mode "Yes, allow all edits during this session" :**
- Toute écriture Supabase directe (INSERT/UPDATE/DELETE, migrations SQL)
- Toute action Stripe (paiements réels ou en mode Test, changements de configuration)

**Pour tout le reste, Simon peut utiliser "Yes, allow all edits during this session" librement, sans repasser par une approbation au cas par cas :** édition de fichiers, lecture/exploration de code, `npx tsc --noEmit`, `git commit` local, création/suppression de fichiers temporaires de script (`.tmp-*.mjs`), et depuis le 2026-09-01, **`git push`** — ajouté aux permissions auto-allow dans `.claude/settings.local.json` (non suivi par git). Justification : le repo n'a qu'un seul remote/branche de déploiement (`main` → Vercel), donc aucun risque de pousser au mauvais endroit ; un push problématique reste réversible via l'historique des déploiements Vercel ou un `git revert`.

Remplace l'ancienne règle (jusqu'au 2026-09-01, `git push` en approbation manuelle stricte comme Supabase/Stripe) en vigueur depuis le 2026-07-09.

Aussi notés pendant la revue, hors scope (pas encore investigués) : 2 avertissements console Playwright détectés sur les sections Localisation/Infos générales/Promotions.

**Changements visuels — aperçu avant/push obligatoire (ajouté le 2026-07-10) :** pour tout changement touchant l'UI (mise en page, couleurs, espacement, contenu affiché, états vides, etc.), toujours montrer un aperçu visuel avant/après — desktop et responsive quand la différence s'y applique — avant de committer/pusher. Reste valide même si `git push` est maintenant en auto-allow : l'aperçu visuel est un point d'arrêt à respecter par discipline, pas seulement un gate de permission — ne jamais pusher un changement visuel sans l'avoir montré au préalable.

---

## 16. Outils Claude Code installés localement (plugins/skills)

Section stable — à ne pas laisser disparaître dans le fil de session (contrairement aux entrées de "dernière session" plus haut, appelées à défiler avec le temps).

**Plugins** (installés via `/plugin` + `/reload-plugins` dans Claude Code, terminal) :
- `vercel` — déploiements et debug
- `stripe` — paiements et abonnements
- `typescript-lsp` — support langage TypeScript
- `security-guidance` — revue de sécurité
- `code-simplifier` — simplification de code
- `hookify` — hooks Claude Code
- `claude-md-management` — gestion de ce fichier CLAUDE.md

**Skills utilisés** (via plugin ou natifs) :
- `ui-ux-pro-max` — suggestions structure/UX/animations (jamais couleurs/police/boutons, voir section design system)
- `webapp-testing` — audits QA
- `frontend-design` — revue visuelle

**Note** : ces plugins/skills sont spécifiques à l'environnement Claude Code (terminal) et n'ont pas d'équivalent automatique dans Cowork — leurs capacités les plus utiles pour ce projet (Vercel, Stripe) sont déjà branchées ici comme connecteurs MCP.
