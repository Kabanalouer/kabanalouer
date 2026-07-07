# CLAUDE.md — Kabanalouer

## Design system prioritaire — ne pas dévier

- **Couleur primaire :** olive `#636e40` (variantes : 600 `#4d5631`, 700 `#3a4124`, 100 `#e8ebdc`, 50 `#f5f6ec`)
- **Couleur accent :** coral `#f04e45`
- **Typographie :** Plus Jakarta Sans uniquement
- **Boutons CTA :** toujours `rounded-full`
- **Pas d'emojis** dans l'UI, **sentence case** partout, **prix en format québécois** (ex. `120 $/nuit`)
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
- **Module vedettes** : région (49 $/mois) et accueil (99 $/mois) — Stripe à intégrer (pas encore fait)
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
- **Offre de lancement — une fois dans sa vie par proprio** : `users.free_launch_claimed_at` (`TIMESTAMPTZ`, permanent, jamais effacé) bloque toute deuxième réclamation, même si la première annonce gratuite a été annulée depuis. Les 50 places (`FREE_LAUNCH_LIMIT`) sont comptées sur ce même flag (`getFreeLaunchClaimedCount()`) — pas sur les abonnements gratuits actuellement actifs, qui pourraient sous-compter si certains ont été annulés. L'annonce gratuite ne compte **jamais** dans le rang tarifaire des annonces payantes.
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
- **À faire éventuellement** :
  - Tester la version anglaise (signup + recovery) — bloqué le 2026-07-07 par la limite de débit par défaut de Supabase Auth (`email rate limit exceeded`) après plusieurs tests consécutifs en français ; **pas un bug du hook**. À reprendre lors du grand test complet, en vérifiant/ajustant au besoin Authentication → Rate Limits dans Supabase.
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
RESEND_API_KEY
CRON_SECRET                        # openssl rand -hex 32 — protège /api/sync-ical
NEXT_PUBLIC_APP_URL                # https://kabanalouer.ca
NEXT_PUBLIC_VERCEL_URL             # https://kabanalouer.ca
```

---

## 11. Comptes de test

| Compte | Email | Rôle | Notes |
|---|---|---|---|
| Admin | simon.authentik@gmail.com | admin | Accès `/admin` |
| Voyageur | slemay@authentik.com | traveler | Compte voyageur de test |
| Proprio test | info@chaletauthentik.com | host | `is_free_launch=false` pour tester le flux Stripe payant |

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
| `add-users-free-launch-claimed-column.sql` | Ajoute `free_launch_claimed_at` à `users` (offre de lancement une fois dans sa vie, étape 1/10) | ⚠️ **Non confirmé** — jamais explicitement validé comme exécuté ; à vérifier avant le grand test complet, sans quoi `/api/subscriptions/activate-free` échouera |
| `backfill-subscriptions-listing-id.sql` | Remplit `listing_id` sur les lignes `subscriptions` existantes (étape 3/10) | Exécuté et confirmé en prod le 2026-07-07 |
| `restructure-subscriptions-per-listing-cutover.sql` | Cutover structurel : `DROP CONSTRAINT` sur `user_id`, `ADD CONSTRAINT UNIQUE`/`SET NOT NULL` sur `listing_id` (étape 4/10) | Exécuté et confirmé en prod le 2026-07-07 |
| `add-listings-winback-columns.sql` | Ajoute `unpublished_at`/`reminder_winback_3d_sent`/`14d_sent` à `listings` (séquence de retour, étape 8/10) | ⚠️ **Non confirmé** — à vérifier avant le grand test complet, sans quoi le cron win-back échouera silencieusement |
| `ai-usage-log.sql` | Crée la table `ai_usage_log` pour le rate limiting IA | À vérifier |
| `messages-constraints.sql` | Contrainte max 5000 chars sur `messages.content` | À vérifier |
| `avatar-bucket-mime.sql` | Restreint les MIME types du bucket `avatars` | À vérifier |

---

## 13. Dernière session — 2026-07-02

### Fonctionnalités complétées

**Correction du rôle proprio à l'inscription**
- Bug : les proprios arrivaient en mode voyageur après confirmation email ou connexion Google
- Fix A (`signup/page.tsx`) : rôle passé dans l'URL de callback Google OAuth (`?role=host`) plutôt que dans `queryParams` (qui est envoyé à Google et jamais retourné)
- Fix B (`auth/callback/route.ts`) : le callback lit `user.user_metadata.role` (email) ou le param URL `role` (Google) et met à jour `public.users` immédiatement

**Intégration Stripe Checkout complète**
- `app/api/stripe/checkout/route.ts` : Price ID réel branché, vérification rôle `host`, création/récupération customer Stripe
- `app/api/stripe/webhook/route.ts` : bug `expires_at` corrigé → `subscription.items.data[0].current_period_end` ; `is_free_launch: false` ajouté
- `app/dashboard/subscription/page.tsx` : trois états distincts — offre de lancement (badge gratuit), abonné payant (bouton portail), inactif (bouton Stripe)
- `PublishUI.tsx` : prix corrigé 199 → 299 $/an

**Cloudflare Turnstile**
- `TurnstileWidget.tsx` : composant avec `strategy="afterInteractive"` + `onLoad` callback (fix du widget qui n'apparaissait pas)
- Intégré sur `app/(auth)/signup/page.tsx` et `app/(auth)/login/page.tsx`

**Audit de sécurité**
- Headers HTTP, rate limiting IA, CRON_SECRET, SSRF iCal, validation formulaires serveur, restriction MIME avatars, Origin check sur `/api/views`

### Leçons techniques retenues

- **Stripe SDK v22+ :** `current_period_end` a été déplacé de `Subscription` vers `SubscriptionItem`. Utiliser `subscription.items.data[0].current_period_end`.
- **Google OAuth + rôle :** `queryParams` dans `signInWithOAuth()` sont ajoutés à l'URL envoyée à Google — ils ne reviennent jamais dans le callback Supabase. Passer le rôle dans `redirectTo` à la place.
- **Turnstile timing :** `strategy="lazyOnload"` charge pendant l'idle du navigateur (peu fiable sur des pages simples). Toujours utiliser `strategy="afterInteractive"` avec `onLoad` callback qui déclenche le render du widget.
- **`text-align` est hérité en CSS :** un `text-center` sur un ancêtre affecte les dropdowns positionnés en absolu. Toujours ajouter `text-left` explicitement sur les éléments de texte dans les dropdowns.

### Prochaine étape immédiate

Tester le paiement Stripe de bout en bout avec une carte de test Stripe (ex. `4242 4242 4242 4242`), vérifier que l'abonnement s'active dans la table `subscriptions`, et remettre `is_free_launch=true` sur `info@chaletauthentik.com` si le test est concluant.

---

## 14. Points en suspens

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
- Grand test complet des emails en conditions réelles
- Templates Supabase Auth bilingues (encore en anglais générique)
- Email de confirmation d'achat vedette (dépend du Stripe Checkout vedettes, pas encore fait)

### Langue préférée (`preferred_language`) — en attente de test manuel (2026-07-07)

Implémenté (commit `4eabe82`) mais pas encore testé en conditions réelles :
- Section langue FR/EN dans `/dashboard/profile` (met à jour `auth.updateUser` + `public.users.preferred_language`, redirige vers l'équivalent `/en`)
- Redirection automatique dans le middleware pour les utilisateurs connectés sous `/dashboard`, `/messages`, `/favoris` si l'URL ne correspond pas à `preferred_language`

À valider lors du grand test de bout en bout : sélecteur FR/EN dans le profil (mise à jour + redirection immédiate + persistance après refresh), redirection automatique dans l'espace connecté, et confirmer que les pages publiques restent librement navigables via le sélecteur du footer même connecté.
