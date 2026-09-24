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
| Stripe | 22.x | Abonnements propriétaires + module vedettes — mode Production activé le 2026-09-04 |
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
| Accent (orange brûlé, adopté le 2026-09-24) | `bg-accent`, `text-accent`, `bg-accent/5 border-accent/20` · hover `accent-dark` | `#C2410C` / `#9A3412` — **signaux seulement** : badges et bandeaux promo, cœur des favoris, pastilles/compteurs non lus. **Jamais** sur le bouton d'action principal (reste olive). Remplace l'ancien corail `#f04e45` (contraste insuffisant, effet rouge-vert avec l'olive) |
| Charcoal scale | `text-charcoal-{400,500,600,700,800}` | texte et bordures sombres |
| Bordures légères | `border-[#ebebeb]` ou `border-charcoal-100` | inputs, cartes |
| Erreur | `error-{50…800}` (ex. `bg-error-50 text-error-600`) | messages d'erreur, états négatifs (« complet », « aucune disponibilité »), suppression |
| Avertissement | `warning-{50…800}` | avis importants, en attente, à compléter |
| Succès | `success-{50…800}` | confirmations, « publiée », « actif » |
| Étoiles des avis | `text-star` (gris foncé `#222222`, comme Airbnb) · étoile vide `text-[#ebebeb]` | **toutes** les notes en étoiles, sans exception — jamais olive ni jaune |
| IA | `text-ai`, `bg-ai-light` | badges et résumés générés par IA |

> Ne jamais coder le hex directement pour les couleurs qui ont un token. **Jamais les palettes Tailwind par défaut** (`gray-*`, `red-*`, `amber-*`, `green-*`, `yellow-*`, `blue-*`…) — toujours `charcoal-*` pour les gris et les jetons d'état ci-dessus (ménage fait le 2026-09-24 : palettes corail/sarcelle/sauge et anciens alias CSS retirés de `globals.css`).

### Typographie

**Plus Jakarta Sans** — chargé via `next/font/google`, variable `--font-jakarta`.

**Échelle de tailles (inspirée d'Airbnb, adoptée le 2026-09-24)** — tokens définis dans `app/globals.css` (`@theme`) :

| Niveau | Classe | Taille | Usage |
|---|---|---|---|
| H1 | `text-2xl sm:text-3xl` (pages de contenu) — plus grand permis sur les héros marketing | 24–30px | titre de page |
| H2 | `text-heading-2 font-semibold` | 22px | titre de section |
| H3 | `text-heading-3 font-semibold` | 18px | sous-titre, titre de carte/modale |
| Texte principal | `text-base` | 16px | paragraphes, descriptions, listes, avis, contenu lu |
| Texte secondaire | `text-sm` | 14px | métadonnées, dates, libellés de formulaire, tableaux denses, boutons secondaires |
| Minimum | `text-xs` | 12px | badges, légendes, mentions |

- **Jamais sous 12px** — pas de `text-[10px]` / `text-[11px]`.
- **H1 : espace entre les mots +0,08em** appliqué globalement (`h1` dans `@layer base`, `app/globals.css`) — Plus Jakarta Sans a des espaces étroites. Ne pas resserrer les lettres des H1 (pas de `tracking-tight` ni `tracking-[-0.0Xem]`, pas de `font-extrabold`). Attention : `--tracking-normal` est redéfini à -0,01em et `--tracking-tight` à -0,035em dans `:root`.
- Un titre de section doit toujours être nettement plus gros que le texte qui le suit (jamais un H2 sans classe de taille, qui retombe à 16px).

### Règles UI strictes

- **Pas d'emojis** dans l'UI — icônes SVG inline uniquement (style Heroicons, `strokeWidth={1.75}`)
- **Sentence case** partout (titres, labels, boutons)
- **Boutons CTA** → `rounded-full` (pill)
- **Prix québécois** → `120 $/nuit`, `299 $/an` — l'espace avant `$` est **insécable** (U+00A0), pour que le `$` ne tombe jamais seul en début de ligne (appliqué à tout le site le 2026-09-24). En anglais : `$120/night`.
- **Notifications** → toujours `CountBadge` / `AvatarDot` (`components/CountBadge.tsx`) : pastille orange brûlé (`bg-accent`), chiffre blanc, plafonné à « 9+ », `aria-label` en mots. Chiffre quand l'utilisateur doit agir (messages, avis à répondre) ; simple point avec contour blanc sur la photo de profil quand l'espace manque (voyageur : messages non lus ; proprio sur mobile : messages ou avis). Le titre de l'onglet est préfixé « (n) » tant qu'il y a des messages non lus (`Navbar.tsx`).
- **Photo de profil absente** → cercle neutre `bg-charcoal-100` + initiale `text-charcoal-600 font-bold`, **partout** (en-tête, avis, carte proprio, mini-profil du formulaire, messagerie, profil, « Mes avis ») — jamais olive, réservé à la marque et aux actions.
- **Photo de profil des voyageurs (2026-09-24)** → jamais demandée **avant** l'envoi d'une demande de prix ou d'un message (ne pas freiner la conversion). Incitations en place : astuce après l'envoi (`PhotoTip`, fenêtre « Contacter » et formulaire de devis), bandeau dans la messagerie (`PhotoReminderBanner`, après le rappel du cellulaire), ligne « Ajouter une photo » dans le menu voyageur. Ajout sur place via `AvatarUploadButton`. Le proprio voit une fiche du voyageur en tête de chaque conversation (photo, membre depuis, présentation `users.bio`, champ « À propos de vous » du profil voyageur). Attention : `bio` est exposée par la vue publique `public_profiles` — ne jamais la présenter comme privée.
- **Nombres décimaux** → toujours `formatDecimal()` / `formatPercent()` de `lib/formatNumber.ts` (« 4,8 » et « 12,5 % » en FR, « 4.8 » et « 12.5% » en EN) — jamais `toFixed()` pour un nombre affiché. Seule exception : coordonnées GPS.
- Fonds de section → `bg-charcoal-50`
- Titres principaux → `text-charcoal-800`
- Texte secondaire → `text-charcoal-400`

### Logo

Fichiers dans `public/` :
- `logo-wordmark.svg` — wordmark sur fonds clairs (Navbar, Footer)
- `logo-wordmark-light.svg` — wordmark sur fonds sombres/colorés
- `logo-mark.svg` — icône seule
- `app/icon.svg` — favicon (copie de `favicon.svg`) · `app/favicon.ico` (16/32/48)
- PNG dérivés : `logo-email.png` (courriels : fond blanc arrondi intégré pour le mode sombre, affiché 143×45, texte alternatif stylisé olive si images bloquées), `logo-wordmark.png` (factures PDF), `logo-mark.png` / `logo-mark-white.png` (512px), `favicon.png` (64px), `favicon-32.png`

**Logo v2 (2026-09-24)** — texte **vectorisé** (tracés, plus de `<text>` : un SVG affiché en `<img>` n'a pas accès aux polices du site et retombait sur San Francisco/Segoe/Roboto selon l'appareil). Réglages : Plus Jakarta Sans **600**, lettres **+0,01em**, traits de l'icône **3,3**. Favicon simplifié pour les petites tailles (traits 4,2, 2 étages de branches, plus de marge).
- **Ne jamais éditer les fichiers du logo à la main** : modifier `scripts/logo/logo.cjs` puis lancer `node scripts/logo/build.cjs` (régénère tous les SVG, PNG et l'ICO).

---

## 4. Vocabulaire

- **"Proprio"** dans boutons et labels courts / **"propriétaire"** dans textes longs
- **Jamais "hôte"** dans l'UI (ni "host" visible côté public)
- **Français québécois naturel**, jamais trop familier — pas de "Salut!", "Yo", "Hey"
- Les voyageurs = "voyageurs" (pas "clients", pas "guests")
- **Typographie française — espaces insécables obligatoires** (règle OQLF, appliquée à tout le site le 2026-09-24) — pour tout texte FR ajouté ou modifié (`messages/fr.json`, chaînes FR en dur dans le code, courriels, FAQ/JSON-LD) :
  - avant `?` `!` `;` → **espace fine insécable** U+202F (ex. `avec {name} ?`)
  - avant `:` → **espace insécable** U+00A0
  - à l'intérieur des guillemets → `«` + U+00A0 … U+00A0 + `»`
  - Pourquoi : une espace normale laisse le signe tomber seul au début de la ligne suivante. Ne jamais coller le signe au mot (convention anglaise, faute en français).
  - **EN** : jamais d'espace avant `?` `!` `:` `;`.
  - **Exceptions** : SMS (`lib/sms.ts`) — ces caractères font passer le SMS en UCS-2 (70 caractères/segment au lieu de 160, coût doublé), garder des espaces normales. Prompts IA (`app/api/ai/`) : non affichés, sans importance.
  - Dans le JSX texte, écrire le caractère lui-même (l'échappement ` ` ne fonctionne que dans une chaîne JS/JSON).

---

## 5. Base de données (tables principales)

| Table | Rôle |
|---|---|
| `users` | Profils (bio, avatar_url, name, email, role, stripe_customer_id). Colonne `free_launch_claimed_at` conservée mais **plus utilisée** depuis le 2026-09-04 (voir section 9, offre de lancement par annonce) — candidate à un nettoyage futur. |
| `listings` | Annonces chalets. `listing_number` (integer, UNIQUE) : numéro d'annonce stable assigné à la création, jamais changé. `custom_slug`/`previous_custom_slug` (text, UNIQUE) : lien personnalisé optionnel du proprio et son dernier remplacé (redirection). Voir section 9, "URL de fiche chalet". |
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
  amenities-catalog.ts  Catalogue d'équipements (catégories, detailSchema, showIf, unit, priorité) — voir section 9
  listing-schema.ts     JSON-LD SEO/GEO de la fiche publique (LodgingBusiness + FAQPage)
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
  - 1ʳᵉ annonce payante : **299 $/an** (`tier1`, Price ID test `price_1ToqE7EVlLGcAv4arl0TmOCz`)
  - 2ᵉ et 3ᵉ : **249 $/an** chacune (`tier2_3`, Price ID test `price_1TqeYhEVlLGcAv4aUUuiwT8R`)
  - 4ᵉ et plus : **199 $/an** chacune (`tier4plus`, Price ID test `price_1TqeYhEVlLGcAv4a9mPZ8H0T`)
  - **Depuis le 2026-09-04** : Price IDs de production distincts, voir la sous-section "Stripe passé en mode Production" plus bas — bascule automatique via `VERCEL_ENV`, jamais un choix manuel dans le code.
  - Le rang (`getNextPaidRank()`) = nombre d'abonnements payants **actuellement actifs** de ce proprio (`is_free_launch: false`, `status: active`) + 1. C'est le compte actif, pas l'historique total — annuler une annonce libère son rang pour la prochaine ajoutée, confirmé volontairement ainsi.
  - Le prix est **verrouillé au moment du paiement** (`price_cents`/`price_tier` sur la ligne `subscriptions`, via la métadonnée Stripe `price_tier` posée au checkout) et **jamais recalculé rétroactivement** si le proprio ajoute ou annule d'autres annonces par la suite.
- **Offre de lancement — une par annonce, sans limite de nombre** (modèle changé le 2026-09-04, voir la sous-section dédiée plus bas) : chaque annonce a droit à sa propre année gratuite, indépendamment des autres annonces du même proprio. L'éligibilité vient de l'existence d'une ligne `subscriptions` pour ce `listing_id` précis (peu importe son statut) — plus de `users.free_launch_claimed_at` (colonne conservée en base mais plus lue nulle part, voir section 5). L'annonce gratuite ne compte **jamais** dans le rang tarifaire des annonces payantes. **Mise à jour le 2026-09-01** : le plafond de 50 places (`FREE_LAUNCH_LIMIT`) a été retiré — voir la sous-section dédiée plus bas, qui détaille aussi pourquoi cette offre ne passe plus du tout par Stripe.
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
  - **Win-back** (ajouté à l'étape 8) : séquence de retour par annonce individuelle — `listings.unpublished_at`, `reminder_winback_3d_sent`/`14d_sent` (`lib/emails/winbackReminder.ts`), posés/remis à zéro dans le même `UPDATE` que la dépublication/republication pour rester synchronisés. **Re-vérifié le 2026-09-03** (doute soulevé par une note périmée suggérant un regroupement par `host_id` resté à refaire) : le code est déjà entièrement sur le modèle par annonce, aucune trace de `host_id` dans `winbackReminder.ts`, bien branché au cron actif (`subscription-reminders`, dans `vercel.json`). Rien à refaire.
  - **Republication** : le webhook (`checkout.session.completed`) republie automatiquement l'annonce précise dès qu'un paiement réussit — chez Stripe, un abonnement `canceled` ou une offre expirée ne redeviennent actifs que via une **nouvelle** Checkout Session.
- **Garde-fou publication manuelle** : impossible de publier/republier une annonce tant que son abonnement n'est pas `active` — `/api/listings/[id]/publish/route.ts` et `components/dashboard/ListingForm.tsx`. Message : *"Ton abonnement doit être actif pour publier une annonce — renouvelle-le d'abord."*
- **Email de bienvenue, langue Checkout/reçus** (ajoutés le 2026-07-07) : inchangés dans leur logique, voir historique — `lib/emails/welcomeSubscription.ts` (Resend, bilingue, expéditeur `info@kabanalouer.ca`), `preferred_locales` sur le Customer Stripe fixé uniquement à la création (pas rétroactif).
- **Emails mentionnent l'annonce et le prix verrouillé** (étape 9) : `welcomeSubscription`, `subscriptionReminder`, `winbackReminder` acceptent tous `listingTitle` (fallback "ton chalet"/"your listing" si vide) et affichent le prix verrouillé de la ligne `subscriptions` (`price_cents` → `formatPriceLabel()`) au lieu d'un "299 $" codé en dur.
- **Bug critique corrigé en même temps** (étape 10) : `/dashboard/listings/[id]/edit` filtrait encore l'abonnement par `user_id` avec `.maybeSingle()` — plantait dès qu'un proprio avait plusieurs annonces (plusieurs lignes possibles). Filtre maintenant par `listing_id`, et affiche le vrai prix dynamique (`getNextPaidRank`/`priceForRank`) au lieu du texte "199 $/an" codé en dur qui ne correspondait à aucun des trois tarifs réels. `PublishUI.tsx` (code mort, jamais importé depuis que la vraie UI de publication a été déplacée dans `EditListingForm.tsx`) a été supprimé au passage.
- **Migration de données** : vérifié au préalable qu'aucun proprio actif n'avait plusieurs annonces sous un même abonnement (requête de vérification, 0 ligne retournée) — un backfill simple a suffi, pas de cas "grandfathered" à gérer (`supabase/backfill-subscriptions-listing-id.sql`, exécuté et confirmé). Cutover structurel (`DROP CONSTRAINT`/`ADD CONSTRAINT UNIQUE(listing_id)`/`SET NOT NULL`) exécuté et confirmé le même jour (`supabase/restructure-subscriptions-per-listing-cutover.sql`).

### Stripe passé en mode Production (2026-09-04)

Compte Stripe activé en Production (Individual, numéro d'assurance sociale, sans NEQ — statut de travailleur autonome).

- **Bascule automatique test/prod** dans le code via `VERCEL_ENV === "production"` (pas `NODE_ENV`, qui vaut `"production"` même sur les builds preview Vercel) : `lib/subscriptionPricing.ts` (Price IDs abonnement), `lib/featuredConfig.ts` (Price IDs vedettes) — `lib/stripeTaxRates.ts` gérait aussi cette bascule pour les taux de taxe manuels à l'origine, mais ce fichier a été supprimé depuis (2026-09-08, commit `2f2ad45`) : voir section "Fiscalité Stripe (TPS/TVQ)", `automatic_tax` (Stripe Tax) l'a remplacé.
- **5 nouveaux Price IDs de production** :
  - Abonnement `tier1` : `price_1UBvrfIRwZDgRnpbzWqem76f`
  - Abonnement `tier2_3` : `price_1UBw6jIRwZDgRnpbZchs7QjF`
  - Abonnement `tier4plus` : `price_1UBw7MIRwZDgRnpbMm4EijEW`
  - Vedette accueil : `price_1UBw4qIRwZDgRnpbGHcRyVId`
  - Vedette région : `price_1UBw5RIRwZDgRnpbHllKdZtT`
- **Taux de taxe manuels créés dans Stripe** (approche initiale, remplacée depuis) : TPS 5% (`txr_1UBv1gIRwZDgRnpbiwUXkMCp`) + TVQ 9,975% (`txr_1UBv3PIRwZDgRnpbGpby6teZ`), appliqués au `line_item` de `stripe.checkout.sessions.create` (`tax_rates`) dans `app/api/stripe/checkout/route.ts` et `app/api/featured/checkout/route.ts`. **Remplacé depuis le 2026-09-08 par Stripe Tax** (`automatic_tax: { enabled: true }` + `billing_address_collection: "required"`) — `lib/stripeTaxRates.ts`/`STRIPE_TAX_RATE_IDS` supprimés (commit `2f2ad45`), voir section "Fiscalité Stripe (TPS/TVQ)" pour le système actuel.
- **Nouveau webhook production** configuré dans Stripe Dashboard (mode Live), `STRIPE_WEBHOOK_SECRET` mis à jour dans Vercel pour l'environnement Production (valeur distincte de celle utilisée en Preview/Development, même nom de variable).
- **Clés API de production** (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`) ajoutées dans Vercel → Settings → Environment Variables, scope Production uniquement.
- **Branding Stripe Checkout** (logo, couleurs olive/coral) configuré côté Stripe Dashboard pour le mode Production.

### Fiscalité Stripe (TPS/TVQ)

- Le compte Stripe (mode Production) est immatriculé pour la TPS/TVH fédérale et la TVQ (Québec) depuis le 2026-09-08.
- Tous les produits actifs (Abonnement annuel Kabanalouer et ses paliers, Vedette page région, Vedette page d'accueil) sont catégorisés **"Software as a service (SaaS) - business use"** dans Stripe, pas "Platform Fee" (Platform Fee est la catégorie par défaut de Stripe mais ne correspond pas à notre modèle — à assigner manuellement à chaque nouveau produit créé).
- `app/api/stripe/checkout/route.ts` et `app/api/featured/checkout/route.ts` utilisent tous les deux `automatic_tax: { enabled: true }` + `billing_address_collection: "required"` pour calculer la taxe automatiquement selon la province du client.
- L'ancien système de taux manuels codés en dur (`lib/stripeTaxRates.ts`, `STRIPE_TAX_RATE_IDS`) a été supprimé (commit `2f2ad45`) — ne pas le réintroduire.
- **Rappel pour tout nouveau produit Stripe créé à l'avenir** : bien assigner une catégorie de produit fiscale appropriée (pas laisser "Platform Fee" par défaut), sinon le calcul de taxe risque d'être incorrect ou absent.

### Offre de lancement : éligibilité par annonce, pas par proprio (2026-09-04)

Décision d'affaires : un proprio avec plusieurs chalets a droit à l'année gratuite séparément pour chacun, pas une seule fois pour tout son compte.

- Remplace le verrou `users.free_launch_claimed_at` (une fois par proprio, permanent) par un check par annonce : l'existence d'une ligne `subscriptions` pour ce `listing_id` (peu importe son statut) suffit à prouver que cette annonce précise a déjà eu — ou a — un abonnement, gratuit ou payant.
- `app/api/subscriptions/activate-free/route.ts` : fusionne l'ancien check host-level avec le check "abonnement actif" déjà présent, élargi à "toute ligne existante". N'écrit plus `free_launch_claimed_at`.
- `app/api/admin/listings/[id]/publish/route.ts` : même changement (flux admin de révision des imports Airbnb).
- `app/dashboard/listings/[id]/edit/page.tsx` : une requête de moins — l'éligibilité vient de la requête subscription déjà chargée.
- `users.free_launch_claimed_at` reste en base (colonne non supprimée) mais n'est plus lue ni écrite nulle part — nettoyage potentiel futur (`DROP COLUMN`), pas fait aujourd'hui.
- Commit `84b9f5e`.

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

**Audit du 2026-07-02 (3 points, tous réglés le 2026-09-03)** :
- **Vercel Deployment Protection** : aucun changement apporté — décision de Simon ("pas de changement"), le SSO déjà en place couvre déjà ce besoin.
- **Fuite de messages d'erreur bruts dans les réponses API** : masquée dans 21 endroits (18 fichiers) — chaque `catch` renvoie désormais un message générique au client, jamais `error.message` brut (qui pouvait exposer des détails internes : structure de requête, noms de colonnes, etc.).
- **`robots.txt`** : déjà conforme (exclut bien `/admin` et `/dashboard`) — correction mineure ajoutée en prime pour `/en/login` et `/en/signup`, qui manquaient à l'exclusion EN.

**Audit du 2026-09-04 (sécurité complète de la marketplace, 3 failles corrigées)** :
- **🔴 CRITIQUE — `public.users` entièrement lisible publiquement** : la politique RLS "Lecture publique des profils" (`SELECT USING (true)`) exposait email, téléphone, `stripe_customer_id` et toute autre colonne sensible de **tous** les utilisateurs à n'importe qui, connecté ou non — les politiques RLS permissives s'additionnent en OR, rendant inutile la politique restrictive coexistante (`auth.uid() = id`). Corrigé par une nouvelle vue `public.public_profiles` (`id`/`name`/`bio`/`avatar_url`/`created_at` seulement, `GRANT SELECT` à `anon`+`authenticated`, contourne intentionnellement la RLS via les privilèges du propriétaire de la vue) puis `DROP POLICY` sur la politique permissive. Deux dépendants adaptés (l'embed PostgREST `author:author_id(...)` suit la vraie FK vers `users`, cassé par la RLS — remplacé par un fetch séparé + merge JS) : `app/chalets/[slug]/page.tsx` (fiche publique + avis) et `app/dashboard/avis/page.tsx` ("Mes avis", auteurs voyageurs). Vérifié visuellement avant le `DROP` via une annonce + un avis de test temporaires, nettoyés après coup — aucune donnée de test laissée. Migrations : `supabase/create-public-profiles-view.sql`, `supabase/fix-users-public-select-policy.sql`.
- **🟠 Upload de photos hors-dossier** : la politique RLS INSERT du bucket `listing-photos` ne vérifiait que `bucket_id`, jamais le dossier de destination — contrairement au bucket `avatars` et aux règles UPDATE/DELETE du même bucket. N'importe quel utilisateur connecté pouvait uploader dans le dossier d'un autre proprio. Corrigé (`(storage.foldername(name))[1] = auth.uid()::text`) — `supabase/fix-listing-photos-upload-policy.sql`.
- **🟠 Injection JSON-LD non échappée** : `app/chalets/[slug]/RegionLanding.tsx` (page publique de région) utilisait encore `JSON.stringify()` brut pour 3 blocs JSON-LD au lieu de `safeJsonLd()` (`lib/jsonLd.ts`, déjà utilisé correctement ailleurs) — un titre d'annonce contenant `</script><script>...` aurait pu casser le bloc et exécuter du code sur la page.

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
- Sitemap XML automatique (`app/sitemap.ts`) — déjà dynamique, inclut automatiquement les fiches de chalets publiés (requête Supabase `is_published = true`) et les villes distinctes, pas seulement les pages statiques
- Métadonnées Open Graph + Twitter sur toutes les pages clés
- **Google Search Console** configuré pour `kabanalouer.ca` (vérification par enregistrement DNS TXT), sitemap soumis (2026-09-04)

### Analytics
- **Google Analytics 4** (`components/GoogleAnalytics.tsx`, nouveau, 2026-09-04) : script `gtag.js` via `next/script` (stratégie `afterInteractive`), rendu conditionnel sur `NEXT_PUBLIC_GA_MEASUREMENT_ID` — rien ne se charge si la variable n'est pas définie. ID de mesure : `G-SKLC68FPGV`. CSP (`next.config.ts`) mise à jour : `*.googletagmanager.com` ajouté à `script-src`, `*.google-analytics.com`/`*.googletagmanager.com` à `connect-src` (aucun domaine GA n'était autorisé avant). Vérifié en production : tag chargé, événement `page_view` envoyé, zéro erreur console.

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
- **Bug critique trouvé et corrigé le 2026-09-15** : la route `/api/listings/import` (Apify) n'était appelée par **aucune** UI — ni le formulaire dashboard (`/dashboard/listings/new`), ni la page publique (`/devenir-hote`). Les deux inséraient silencieusement dans `contact_messages` et affichaient un succès inconditionnel, sans jamais déclencher Apify ni créer de brouillon. Logique métier extraite dans `lib/listingImport.ts` (partagée entre la route et la Server Action du dashboard), avec ajout d'une garde anti-doublon (`normalizeListingUrl`, par `host_id` + URL normalisée). Le formulaire `/devenir-hote` reste volontairement un formulaire de capture de lead (email Resend à Simon) — un visiteur non connecté n'a pas de `host_id` pour créer un brouillon.
- **Case de consentement photos ajoutée** au formulaire dashboard (`photos_rights_confirmed`) — la route l'exigeait déjà (`photosRightsConfirmed !== true` → 400) mais aucun champ ne l'alimentait jusqu'ici.

**Révision et publication par l'admin** :
- **Accès admin au formulaire d'édition existant** (`app/dashboard/listings/[id]/edit`) : nouvelle politique RLS admin sur `listings` (voir encadré ci-dessous) — **la toute première du projet**. La page interroge sans filtre `host_id`, laisse RLS trancher (propriétaire OU admin), puis vérifie explicitement `isOwner || isAdmin` avant de rendre le formulaire (RLS autorise aussi la lecture de n'importe quelle annonce **publiée** pour l'affichage public — ça ne doit jamais suffire à ouvrir ce formulaire). `EditListingForm` reçoit toujours `userId = listing.host_id` (le vrai propriétaire, jamais l'admin qui consulte) pour que ses nombreuses écritures Supabase directes (`handleSaveSection`, photos, chambres, promotions, calendrier...) restent correctement filtrées.
- **Bouton "Publier au nom du propriétaire"** : visible uniquement si `isAdminReview && import_status === 'pending_review'` (jamais pour un proprio sur sa propre annonce), reste soumis à la même validation des champs obligatoires que la publication normale. Route `POST /api/admin/listings/[id]/publish` (vérifie `role === 'admin'` server-side) : passe `is_published: true`/`import_status: 'published'`, crée l'abonnement offre de lancement (`is_free_launch: true`, upsert `onConflict: listing_id`, marque `free_launch_claimed_at`) **seulement si ce proprio ne l'a jamais réclamée ailleurs** (sinon rien n'est créé, laissé à une révision manuelle plutôt que de contourner silencieusement la règle "une fois dans sa vie"), puis envoie le courriel de bienvenue (`lib/emails/importPublished.ts`, lien direct vers la fiche publique, mention de l'offre gratuite seulement si un abonnement a effectivement été créé).
- **File d'attente** : `/admin/imports` (ajouté à `AdminNav.tsx`) — liste simple des annonces `import_status = 'pending_review'`, triée par date, lien "Réviser" vers le formulaire d'édition.
- **Même compromis RLS nécessaire sur `rooms`** : `RoomsSection.tsx` sauvegarde aussi directement dans `rooms` (`handleSave`) — la même politique RLS admin devait donc exister sur cette table pour qu'un admin puisse réviser/enregistrer les chambres d'une annonce importée. Absente au départ (bug trouvé et corrigé : `handleSave` affichait "Enregistré" avec succès même quand Supabase renvoyait une erreur RLS, un faux succès jamais vérifié jusqu'ici). Corrigé en deux temps : `handleSave` vérifie maintenant `{ error }` avant d'afficher un succès, et la politique manquante a été ajoutée (`supabase/add-rooms-admin-rls-policy.sql`, même modèle que celle sur `listings` ci-dessous).
- **Sélecteur de photos existantes pour les chambres** (`RoomPhotoManager.tsx`, prop `listingPhotos`/`availablePhotos`) : en plus d'uploader de nouvelles photos, le proprio (ou l'admin en révision) peut réutiliser une photo déjà présente dans la galerie générale de l'annonce pour une chambre, sans avoir à la retélécharger — particulièrement utile pour les annonces importées d'Airbnb, qui arrivent déjà avec jusqu'à 80 photos.

> **Politique RLS admin sur `listings` (et `rooms`) — un cas à part.** Partout ailleurs dans ce projet (abonnements, proprios, panneau annonces), l'admin agit via le client service-role côté serveur, jamais via une session RLS élargie. Exception acceptée sciemment ici : `EditListingForm.tsx` fait de nombreuses écritures Supabase directes côté client (pas via une API centralisée) — router chacune vers une nouvelle API service-role aurait été un chantier disproportionné pour débloquer la révision des imports. Compromis de rapidité de développement accepté malgré le risque : une politique RLS élève les permissions au niveau de **la session admin entière** sur toute la table, pas d'une route précise et auditable. La politique vérifie `role = 'admin'` strictement via une jointure sur `users` (jamais juste "authenticated"). Migrations : `supabase/add-listings-admin-rls-policy.sql` et son équivalent `supabase/add-rooms-admin-rls-policy.sql`.

### Messagerie par courriel — notification (Phase 2a) et réponse (Phase 2b) (2026-09-03)

- **Messagerie en direct** : le fil ouvert **et** la liste des conversations (`MessagesClient.tsx`, abonnements Realtime filtrés sur `receiver_id` / `sender_id`) se mettent à jour sans recharger ; une nouvelle conversation apparaît en tête de liste.
- **Phase 2a — notification "nouveau message"** : cron `/api/cron/new-message-notifications` (`* * * * *`, chaque minute depuis le 2026-09-24) — regroupe les messages non lus depuis 2+ minutes (délai total 2 à 3 min) par `listing_id`+`sender_id`+`receiver_id`, re-vérifie `is_read` juste avant l'envoi (évite une notification si lu entre-temps), un seul courriel par groupe (compte, expéditeur, annonce, aperçu tronqué à 150 caractères). Colonne `messages.notification_sent_at` (anti-doublon, posée même si aucun envoi parce que lu entre-temps). `lib/emails/newMessageNotification.ts` — FR/EN, échappement HTML de tout contenu utilisateur (`lib/escapeHtml.ts`).
  - **Bug trouvé et corrigé le jour même en testant en conditions réelles** : le gabarit entoure déjà l'aperçu de guillemets — un message se terminant lui-même par un guillemet produisait deux guillemets collés. Corrigé en retirant tout guillemet (droit ou courbe) en début/fin du contenu brut avant le gabarit.
- **Phase 2b — réponse par courriel** : sous-domaine dédié `reply.kabanalouer.ca` (jamais la racine — le MX racine est déjà celui de Google Workspace), créé et vérifié dans Resend (réception activée). Table `email_reply_addresses` (une ligne par paire d'utilisateurs sur une annonce, `user_a_id`/`user_b_id` normalisés — le plus petit UUID en premier — pour toujours retomber sur la même ligne). Token court (16 octets/32 car. hex, `lib/emailReplyAddress.ts`) — volontairement plus court que `review_requests.token` (32 octets) : au-delà de ~59 caractères, `conv-{token}@reply.kabanalouer.ca` dépasserait la limite RFC 5321 de 64 caractères pour le local-part d'une adresse courriel.
  - Le courriel de notification (Phase 2a) porte maintenant un `Reply-To: conv-{token}@reply.kabanalouer.ca` — répondre depuis Gmail/Outlook insère directement le message dans la conversation, sans connexion à l'app.
  - **Route `POST /api/webhooks/resend-inbound`** : vérifie la signature (`resend.webhooks.verify()`, Svix), ne traite que `email.received`, extrait le token de l'adresse "to", retrouve la paire, appelle `resend.emails.receiving.get()` pour le contenu complet (le webhook ne transporte que les métadonnées), détecte les réponses automatiques (en-têtes `Auto-Submitted`/`X-Autoreply` ou motifs de sujet courants), vérifie que l'adresse "from" correspond à un des deux participants légitimes, nettoie le texte via `email-reply-parser` (retire les citations du fil), puis insère via `insertMessageAndTranslate` (`lib/sendMessage.ts`) — message indiscernable d'un envoi normal, traduction automatique incluse gratuitement. Chaque cas d'exclusion est ignoré silencieusement (log seulement).
  - **Bug trouvé et corrigé en testant en conditions réelles** : `RESEND_API_KEY` (utilisée partout ailleurs pour l'envoi) a la permission "Sending access" seulement — l'appel à l'API de réception échouait avec 401 `restricted_api_key`. Corrigé en créant une clé séparée `RESEND_RECEIVING_API_KEY` ("Full access"), utilisée uniquement dans cette route — moindre privilège, la clé d'envoi reste inchangée partout ailleurs.
  - **Limite connue, acceptée telle quelle par Simon** : `email-reply-parser` retire bien les citations du fil et les formules classiques ("Sent from my iPhone", etc.) mais pas une signature personnalisée sans séparateur standard (`--` sur sa propre ligne) — une signature Gmail avec mise en forme (nom en gras) peut donc se retrouver insérée avec le message.
  - **Testé et confirmé de bout en bout en conditions réelles** (message envoyé via l'app → notification reçue → réponse Gmail → insertion correcte, sender/receiver et listing corrects, citation du fil bien retirée).

**Notification "message de contact"** (2026-09-04) : `app/contact/actions.ts` n'envoyait auparavant aucune notification à l'admin quand un visiteur soumettait le formulaire — ajouté `lib/emails/contactMessageNotification.ts` (même gabarit partagé `renderEmail.ts` que les autres emails du projet, contenu du visiteur échappé via `lib/escapeHtml.ts`), envoie à `simon.authentik@gmail.com` après l'insertion réussie dans `contact_messages`, jamais bloquant (try/catch, le formulaire reste un succès même si Resend échoue).

### Notifications SMS via Twilio (2026-09-14)

En plus du courriel existant (Phase 2a ci-dessus), un SMS est envoyé au destinataire d'un nouveau message — proprio ou voyageur, une demande de devis étant un message comme un autre dans ce projet, donc automatiquement couverte sans code spécial. Envoyé par le même cron `/api/cron/new-message-notifications`, juste après le courriel, jamais à sa place.

- **`lib/sms.ts`** (nouveau) : `sendNewMessageSms()`, SDK Twilio (`TWILIO_ACCOUNT_SID`/`AUTH_TOKEN`/`PHONE_NUMBER`), message court bilingue FR/EN (« Nouveau message sur Kabanalouer de {prénom}. Réponds ici : {SITE_URL}/messages »). Retourne `{ error }`, ne lance jamais d'exception.
- **Conditions d'envoi** (`app/api/cron/new-message-notifications/route.ts`) : uniquement si `receiver.phone` n'est pas `NULL` **et** `receiver.notify_sms` est `true`. Un échec Twilio est logué (`console.error`) mais ne bloque jamais le message ni le courriel déjà envoyé — le SMS est un bonus, jamais une dépendance critique.
- **`notify_email`/`notify_sms`** (`public.users`, booléens, défaut `true` tous les deux) : deux préférences de CANAL indépendantes, distinctes de `notifications_prefs` (jsonb, préférences de CONTENU : messages, favoris, rapport mensuel). `notify_email` n'est lu par aucun code applicatif pour l'instant — le courriel de notification est toujours envoyé, indépendamment de ce flag ; seul `notify_sms` est actuellement branché.
- **Numéro de cellulaire** (`public.users.phone`, `TEXT` nullable — colonne déjà existante, réutilisée plutôt que d'en créer une nouvelle) : optionnel, demandé au signup (`app/(auth)/signup/SignupForm.tsx`, sous le champ courriel, validation format 10 chiffres nord-américain seulement si rempli, jamais obligatoire pour compléter l'inscription) et modifiable dans `/dashboard/profile` (`ProfileForm.tsx`, préexistant). Trigger `handle_new_user()` mis à jour pour le lire depuis les métadonnées d'inscription si fourni (`supabase/add-phone-notification-prefs-signup.sql`).
- **Bannière de rappel** (`components/PhoneReminderBanner.tsx`, nouveau) : affichée sur `/messages` (proprio et voyageur — dans ce projet, c'est aussi la seule page où un proprio voit ses demandes de devis reçues, il n'existe pas de liste dédiée séparée) tant que `phone IS NULL`, fermable (X) pour la session en cours seulement (`sessionStorage`, pas de mémorisation permanente — réapparaît à la prochaine visite tant qu'aucun numéro n'est ajouté). Lien "Ajouter" vers `/dashboard/profile#phone`.
- **Testé de bout en bout en conditions réelles** le 2026-09-14 : SMS reçu confirmé sur un vrai téléphone, courriel non affecté. Piège découvert pendant le test : le cron de production tourne sur la même base Supabase partagée (dev/prod, voir section 2) — un message de test inséré manuellement peut être traité par le vrai cron avant un test manuel local si on n'agit pas assez vite (fenêtre de 2 minutes depuis le 2026-09-24).
- **Déployé en production** le 2026-09-14, commit `af1cc79`. Variables Twilio déjà présentes dans l'environnement Production de Vercel au moment du déploiement (confirmé via `vercel env ls production` — noms et présence seulement, jamais les valeurs).

### Retrait de l'outil "Devis" structuré de la création d'annonce (2026-09-16)

L'ancien outil "Devis" (`QuoteSection.tsx`, section de `EditListingForm.tsx` où le proprio décrivait à l'avance ce qu'un devis inclut/exclut et ses conditions de réservation) a été retiré — jamais vraiment utilisé, remplacé par l'intention d'un devis simplifié, prix seulement, envoyé directement dans la messagerie (déjà construit, voir plus bas).

- **Retiré** : entrée `SECTIONS` de la section "Devis" dans `EditListingForm.tsx`, `QuoteSection.tsx` (fichier supprimé), toute référence à `quote_inclusions`/`quote_exclusions`/`quote_booking_instructions` dans `app/api/messages/quote/route.ts`, `lib/quoteMessage.ts`, `components/messages/QuoteCard.tsx`, et les clés i18n devenues orphelines.
- **Colonnes conservées mais non lues** : `listings.quote_inclusions`/`quote_exclusions`/`quote_booking_instructions` restent en base (aucune perte de données) — migration de suppression proposée mais **non exécutée**, voir `supabase/drop-quote-tool-columns.sql` (section 12).
- **Le devis "prix seulement" existe déjà et fonctionne**, indépendant des champs retirés : `components/messages/QuoteWidget.tsx` (bouton dans une conversation) → `POST /api/messages/quote` (le proprio n'entre que le prix total taxes incluses, le reste — dates/voyageurs/prénom — est assemblé automatiquement) → `lib/quoteMessage.ts` → message inséré normalement → affiché via `components/messages/QuoteCard.tsx` dans `MessagesClient.tsx`. **Architecture entièrement revue le 2026-09-23** — voir section 13, ce n'est plus juste "prix seulement" : deux types de réponse rapide (devis/indisponible), texte intégral éditable et sauvegardable comme modèle. Ce paragraphe garde la mécanique de base (bouton dans une conversation → route API → message normal), le détail à jour est dans la session du 2026-09-23.

### URL de fiche chalet — numéro d'annonce stable + lien personnalisé (2026-09-17)

Remplace le dernier segment d'URL des fiches chalet (`/chalets/région/ville/{dernier-segment}`), basé jusqu'ici sur `slug_fr`/`slug_en` (dérivés du titre) — cassait tout lien déjà partagé/indexé dès qu'un proprio renommait son annonce. Approche façon Airbnb, faite à la suite du 404 diagnostiqué et corrigé le même jour (voir la section routing "catch-all" plus bas dans ce fichier) :

- **`listings.listing_number`** (integer, index UNIQUE partiel) : identifiant aléatoire non séquentiel (10000-99999, jamais l'ordre de création), assigné **à la création** de chaque fiche — y compris un brouillon jamais publié — via `lib/generateListingNumber.ts` (`generateUniqueListingNumber()`, retry en cas de collision, même logique que l'ancien `ensureListingSlugs()`). Appelé aux 2 seuls points de création existants : `app/dashboard/listings/new/actions.ts` (création manuelle) et `lib/listingImport.ts` (import Airbnb). Ne change plus jamais après coup.
- **`listings.custom_slug`** (text nullable, index UNIQUE partiel) : lien personnalisé optionnel choisi par le proprio, **un seul lien partagé entre les versions FR et EN** d'une même fiche (jamais deux liens distincts par langue). Validation minuscules/chiffres/tirets seulement (`lib/customSlug.ts`, max 60 caractères, jamais purement numérique pour éviter toute ambiguïté avec un listing_number), vérification d'unicité au moment de sauvegarder via `POST /api/listings/[id]/custom-slug`.
- **Section dashboard dédiée "Lien personnalisé"** (`components/dashboard/CustomSlugField.tsx`), positionnée juste après "Infos générales" dans le menu latéral d'édition d'annonce — retirée de "Infos générales" le jour même après un premier essai là-bas, pour éviter la confusion avec les autres champs obligatoires de cette section. UI façon Airbnb : un seul input fusionné (préfixe d'URL fixe grisé non modifiable, ex. `kabanalouer.ca/chalets/laurentides/mille-isles/`, collé devant le slug éditable), une seule ligne de statut discrète ("Lien actif : {slug}" ou "Utilise actuellement le numéro d'annonce ({numéro}) comme lien."), un seul bouton "Enregistrer le lien" pour tous les cas (définir, changer, ou vider — un champ vidé puis sauvegardé remet `custom_slug` à `NULL` et retombe sur le numéro d'annonce, pas de bouton "Retirer" séparé). Indicateur de menu **toujours** au crochet vert, jamais le point rouge "incomplet" — un lien personnalisé est optionnel, l'absence de lien n'est jamais une erreur.
- **`listings.previous_custom_slug`** (text nullable) : garde le dernier lien personnalisé remplacé — quand un proprio change son lien, l'ancien continue de fonctionner (redirige vers le nouveau, ou vers le numéro d'annonce si le lien a été retiré) au lieu de 404.
- **`lib/listingUrl.ts`** (`buildListingPath()`) : dernier segment = `custom_slug ?? String(listing_number)`. Ne prend plus `slug_fr`/`slug_en` en entrée — la logique locale FR/EN a disparu de cette fonction puisque le dernier segment est désormais identique dans les deux langues.
- **Routing** (`app/chalets/[...segments]/page.tsx`, `findListingByChaletSlug()`) : cherche par `custom_slug` OU `listing_number` (comparé uniquement si le segment est purement numérique), puis par `previous_custom_slug` en repli — ce qui donne gratuitement les 3 comportements de redirection demandés : une URL par numéro reste toujours valide et redirige vers le lien personnalisé s'il existe (évite le contenu dupliqué en SEO) ; un ancien lien personnalisé redirige vers le chemin canonique actuel (nouveau lien, ou numéro si le lien a été retiré) au lieu de 404. Le repli historique à 1 segment (`slug_fr`/`slug_en`, anciens liens déjà indexés) et la redirection UUID restent en place, inchangés. **Faille corrigée le jour même** (revue de sécurité automatique) : le segment d'URL, contrôlé par le visiteur, était interpolé directement dans une chaîne de filtre PostgREST `.or()` — injection de filtre possible. Corrigé en rejetant tout segment hors du format `[a-z0-9-]{1,60}` avant de construire le filtre (`SAFE_SEGMENT_PATTERN`), au lieu d'essayer de l'échapper.
- **`slug_fr`/`slug_en` retirés de la génération** : confirmé par grep exhaustif qu'ils ne servaient jamais à autre chose (jamais dans un meta title, une description SEO, ou un texte affiché) que la construction de l'URL — `ensureListingSlugs()` et son fichier `lib/generateSlug.ts` supprimés, plus appelés depuis les 4 anciens points de publication (`/api/listings/[id]/publish`, `/api/subscriptions/activate-free`, `/api/admin/listings/[id]/publish`, webhook Stripe). Les colonnes elles-mêmes et les valeurs déjà en base restent en place (aucune perte de données, aucune migration de suppression) — uniquement comme filet de secours pour d'anciens liens à 1 segment déjà partagés/indexés avant ce changement.
- **Endroits corrigés** pour construire leurs liens avec `custom_slug ?? listing_number` au lieu de `slug_fr`/`slug_en` : `components/ListingCard.tsx`, `components/chalets/ChaletsMap.tsx`, `components/dashboard/ListingsClient.tsx`, `app/chalets/[...segments]/_components/RegionLanding.tsx` (JSON-LD `ItemList`), `app/page.tsx`, `app/favoris/page.tsx`, `app/dashboard/page.tsx`, `app/api/listings/geo/route.ts`, `app/api/admin/listings/[id]/publish/route.ts` (courriel de bienvenue), `app/sitemap.ts`, plus `app/chalets/[...segments]/_components/CityLanding.tsx` (voir "Page ville SEO" ci-dessous, qui remplace l'ancienne `app/chalets/ville/[slug]/page.tsx`).
- **Migration** : `supabase/add-listing-number-custom-slug.sql` — ajoute les 3 colonnes + 2 index UNIQUE partiels, et un backfill ponctuel pour la fiche déjà publiée au moment de cette migration (776cbb0b-f45f-4b0b-bea9-ebaf0ced7a72 → `listing_number = 48347`, URL finale `kabanalouer.ca/chalets/laurentides/mille-isles/48347`) — **exécutée et confirmée en prod le 2026-09-17**.

### Page ville SEO + fil d'Ariane complet sur la fiche chalet (2026-09-17)

Fait à la suite du changement d'URL ci-dessus, pour donner à chaque ville sa propre page SEO rattachée à sa région (plutôt qu'une page ville isolée) et compléter le fil d'Ariane en conséquence.

- **Nouvelle page ville** : `kabanalouer.ca/chalets/[région]/[ville]` (ex. `/chalets/laurentides/mille-isles`) et son équivalent EN `/en/cabins/[région]/[ville]`. Gérée par le même fichier catch-all que les pages région/fiche (`app/chalets/[...segments]/page.tsx`, `renderTwoSegments()`), rendue par le nouveau composant `app/chalets/[...segments]/_components/CityLanding.tsx` — même patron que `RegionLanding.tsx` (JSON-LD BreadcrumbList + ItemList, `SearchBar`, grille de `ListingCard`, même style visuel). H1 "Chalets à {ville}" / "Cabins in {city}", meta title/description ciblant "location chalet {ville}" / "cabin rental {city}". Liste uniquement les chalets publiés de cette ville, dans cette région précise. Une ville sans chalet publié dans cette région retourne un 404 propre (même approche que pour une fiche/région introuvable, pas de redirection).
- **`next.config.ts`** : la réécriture `/chalets/:a` / `/chalets/:a/:b/:c` (voir plus bas, contournement du bug de routage catch-all) a gagné une 3ᵉ entrée `/chalets/:a/:b` pour ces pages ville à 2 segments.
- **Ancienne route retirée** : `app/chalets/ville/[slug]/page.tsx` (FR) et `app/[locale]/cabins/city/[slug]/page.tsx` (EN), une page ville non rattachée à une région, existante depuis le 2026-07-10. Un ancien lien `/chalets/ville/{slug}` (ou `/en/cabins/city/{slug}`) redirige automatiquement (`permanentRedirect`) vers le nouveau chemin région-scopé, en retrouvant la région réelle de la ville en base — jamais de 404 sur un lien déjà partagé/indexé. La barre de recherche (`components/SearchBar.tsx`, `components/NavSearchBar.tsx`) et `app/sitemap.ts` construisent maintenant directement la nouvelle URL région-scopée.
- **Fil d'Ariane sur la fiche chalet** (`ListingDetail.tsx`) : devient `Chalets > Région > Ville > Titre du chalet`. Le segment région, qui pointait avant vers une recherche filtrée (`/chalets?region=...`, jamais vers la vraie page région), pointe maintenant vers `/chalets/[région]` (ou `/en/cabins/[région]`) — la page région déjà existante. Nouveau segment ville, cliquable, vers la page ville ci-dessus. Le titre reste le seul segment non cliquable. Tous les segments cliquables ont un soulignement au survol (`hover:underline`), jamais le titre.
- **Mention ville/région retirée sous le titre** de la fiche chalet (ligne "16 personnes · 5 chambres · ...") — devenue redondante avec le fil d'Ariane juste au-dessus, qui l'affiche déjà. Reste uniquement dans le fil d'Ariane et le JSON-LD (`addressLocality`/`addressRegion`, inchangés).

### Catalogue d'équipements (« Équipements ») — architecture actuelle (refondue le 2026-09-19)

Remplace complètement l'ancien système à plat (`lib/amenities.ts`, `AMENITIES`/`AMENITIES_EN`/`AMENITY_CONFIG`/`AMENITY_DESC_EN`/`AMENITY_EMOJI`/`AMENITY_GROUPS`, fichier supprimé) par un vrai catalogue structuré façon Airbnb.

- **`lib/amenities-catalog.ts`** — source unique de vérité :
  - `AMENITY_CATEGORIES` : 13 catégories (Essentiels, Salle de bain, Chambre et linge, Divertissement, Famille, Chauffage et climatisation, Sécurité, Internet et bureau, Cuisine et repas, Emplacement, Extérieur, Stationnement, Services).
  - `AMENITY_CATALOG` : 70 entrées (`AmenityCatalogEntry` — `id`/`label`/`labelEn`/`categoryId`/`icon`/`detailSchema?`). `listings.amenities` (jsonb) stocke un tableau de `AmenityValue` (`{id, details?}`), jamais l'ancien format `string[]`.
  - `detailSchema` (sous-détails par équipement, ex. Accès Privé/Partagé, horaires, capacité) — types : `single-select`, `multi-select`, `number`, `boolean`, `hours`. Deux propriétés génériques ajoutées le 2026-09-19 :
    - **`unit`** (champs `number` seulement) — unité affichée après la valeur dans le résumé et le panneau d'édition (ex. `unit: "pers."` sur la capacité du Spa → "6 pers." au lieu de "6").
    - **`showIf: { key, equals }`** — un champ conditionnel n'est affiché (et sauvegardé) que si un autre champ du même équipement vaut exactement `equals`. Utilisé pour : Foyer intérieur ("Bois inclus" si Type = "Bois"), Accès à un lac ("Gratuit ou payant" si Location d'embarcations = `true`), Terrain de tennis/pickleball ("Gratuite ou payante" si Location de raquette = "Oui"). La condition est revérifiée à la fois à l'affichage (`AmenityDetailsModal`) et au résumé (`summarizeAmenityDetails()`) — une valeur devenue obsolète (ex. type changé de Bois à Gaz) ne traîne jamais dans le résumé ni n'est sauvegardée.
  - `AMENITY_PRIORITY_ORDER` : tableau séparé des 70 ids déterminant l'ordre des "Points forts" sur la fiche publique (position = priorité, indépendant de l'ordre de sélection du proprio ou de `AMENITY_CATALOG`) — **entièrement remplacé et réordonné manuellement par Simon le 2026-09-19** (aucune logique de tri automatique). Pour un futur ajustement, une description en langage clair suffit ("monte le sauna en 2ᵉ position") si l'ordre reste une simple permutation des mêmes ids.
  - `summarizeAmenityDetails()` : génère le résumé court affiché sous le nom de l'équipement (ex. "Privé • 6 pers. • Disponible toute l'année"), utilisé à la fois côté humain (`AmenityRow.tsx`, dashboard) et dans le JSON-LD (voir plus bas) — une seule fonction, deux usages.
- **`components/AmenityIcon.tsx`** : une entrée SVG inline par nom d'icône référencé dans le catalogue (jamais de librairie externe). Piscine intérieure/extérieure et Spa ont chacun leur icône distincte (avant : une seule icône "vagues" partagée) ; Terrain de tennis (balle) et Terrain de pickleball (palette) aussi.
- **14 équipements retirés** le 2026-09-19 (doublons ou peu pertinents) : Salle de bain privée, Télévision par câble (fusionné dans "Télévision"), Balançoire et jeux extérieurs, Foyer au gaz (fusionné dans "Foyer intérieur"), Bureau avec chaise ergonomique, Vaisselle et ustensiles de base, Vue panoramique, Feu de camp autorisé, Accès direct à un lac ou une rivière, Cabane à sucre sur le terrain, Espace pour VR ou remorque, l'ancien "Arrivée autonome (boîte à clé ou serrure électronique)" (doublon de l'équipement `serrure-electronique` renommé), Location d'équipement sur place, Service de navette.
- **3 nouveaux équipements** : "Accès à un lac" (`acces-lac`), "Terrain de tennis" (`terrain-tennis`), "Terrain de pickleball" (`terrain-pickleball`) — tous trois catégorie Extérieur.
- **Renommages notables (id inchangé, seul le libellé change)** : Piscine → séparée en "Piscine intérieure"/"Piscine extérieure" (deux ids distincts, `emplacement` retiré) ; "Spa extérieur" → "Spa" (+ nouveau champ `emplacement` Intérieur/Extérieur) ; "Foyer intérieur au bois" → "Foyer intérieur" ; "Télévision intelligente" → "Télévision" ; "Espace de travail dédié (télétravail)" → "Espace de travail (télétravail)" ; "Serrure électronique / boîte à clé" → "Arrivée autonome" ; "Sentiers de randonnée à proximité" → "Sentier de randonnée sur le site".
- **`lib/listingImportMapping.ts`** (`AMENITY_KEYWORDS`) : gardé synchronisé à chaque renommage/suppression d'id du catalogue (ex. mot-clé "cable tv" fusionné sous `tv-intelligente` plutôt que laissé orphelin sous l'ancien id `tv-cable`).

#### Dashboard — section renommée "Équipements" (2026-09-19)

Anciennement "Caractéristiques" — renommé partout où le libellé désigne cette section précise : `messages/fr.json` → `listings.sections.amenities`, `listings.edit.aiContextWarning`, `listings.edit.amenitiesAtLeast`, `listings.analyse.criteria.amenities` (+ fallback codé en dur correspondant dans `lib/listingScore.ts`, gardé en synchro). **Laissé intact** : `filtersModal.amenities` ("Caractéristiques") sur les filtres de recherche publics — une fonctionnalité distincte, pas la section d'édition.

`components/dashboard/AmenitiesPicker.tsx` :
- **Icône crayon** (plus de chevron ">") sur les équipements ayant un `detailSchema`, aucune icône sur ceux qui n'en ont pas — communique "modifier les détails" plutôt que "naviguer".
- Les deux colonnes ("Équipements ajoutés" / "Ajouter des équipements") affichent la **liste complète sans scroll interne ni ombre de défilement** — seule la page défile. Un compteur discret ("81 équipements" ou "13 équipements disponibles dans {catégorie}") reste au-dessus de la colonne de droite, mis à jour selon le filtre actif.
- Champs `hours` (horaires piscine/gym) : menu déroulant façon Google Agenda (`TimeSelect`, pas de saisie libre à la minute), limité aux intervalles de 30 minutes — une valeur déjà enregistrée hors de ce pas (ex. 09:15, ancienne donnée) reste affichée et sélectionnable sans être écrasée.

#### Fiche publique — affichage des équipements (2026-09-19)

- **`components/chalets/ListingHighlights.tsx`** : "Points forts du chalet" en haut de fiche (top 3 selon `AMENITY_PRIORITY_ORDER`), plus de bouton "Voir caractéristiques".
- **`components/chalets/AmenitiesSection.tsx`** : section "Ce que propose ce chalet" (repositionnée après "Où vous dormirez"), affiche les 10 équipements prioritaires + bouton "Afficher {X} équipements" (masqué si ≤ 10 au total) ouvrant une modale groupée par catégorie via `groupAmenitiesByCategory()`.
- **`components/chalets/AmenityRow.tsx`** (partagé entre les deux composants ci-dessus) : icône + nom + résumé (`summarizeAmenityDetails()`), résumé toujours tronqué sur une seule ligne (`truncate` + `min-w-0` sur le parent flex) peu importe sa longueur.

#### JSON-LD / GEO (`lib/listing-schema.ts`) — description des équipements pour les agents IA (2026-09-19)

Chaque `amenityFeature` (`LocationFeatureSpecification`) inclut maintenant un champ `description` avec le résumé de `summarizeAmenityDetails()` (ex. `{"name": "Spa", "value": true, "description": "Extérieur • Privé • 6 pers. • Disponible toute l'année"}`) — omis entièrement (jamais une chaîne vide) si l'équipement n'a pas de détails renseignés. Objectif : un agent IA qui ne lit que le bloc JSON-LD (pas le texte visible de la page) a accès aux mêmes détails qu'un visiteur humain, pas seulement le nom brut de l'équipement.

**Audit GEO complet effectué le 2026-09-19** (nom, région/ville, capacité, chambres, salles de bain, politique fumeur, politique animaux) : tous déjà correctement exposés dans le JSON-LD `LodgingBusiness` — `name`, `address.addressLocality`/`addressRegion`, `occupancy`, `numberOfBedrooms`, `numberOfBathroomsTotal`, `petsAllowed` (propriété native), `additionalProperty` (« Fumeurs acceptés » — `smokingAllowed` n'existe pas nativement dans schema.org). Nuance notée mais non corrigée (pas demandé) : `numberOfBedrooms`/`numberOfBathroomsTotal`/`occupancy` appartiennent au vocabulaire `Accommodation` de schema.org, pas `LodgingBusiness` (le `@type` déclaré) — convention courante chez les plateformes de location (Google, la plupart des LLM la tolèrent), mais un validateur strict pourrait la signaler.

### "Aperçu de mon annonce" pour un brouillon — CSP et accès RLS corrigés (2026-09-16)

Le bouton "Aperçu de mon annonce" affichait une icône de fichier cassé pour toute annonce non publiée. Deux causes distinctes, trouvées et corrigées l'une après l'autre :

- **CSP** (`next.config.ts`) : la directive `frame-src` n'incluait pas `'self'`, bloquant l'iframe same-origin utilisée par `PreviewModal.tsx`. Corrigée (`frame-src 'self' js.stripe.com hooks.stripe.com challenges.cloudflare.com`).
- **Accès** : même une fois la CSP corrigée, une annonce non publiée retournait un vrai 404 sur `app/chalets/[slug]/page.tsx` — le filtre applicatif `.eq("is_published", true)` a été retiré, en s'appuyant sur les politiques RLS déjà en place (`"Tout le monde voit les listings publiés"` = publié OU `host_id = auth.uid()`, plus la politique admin inconditionnelle) — vérifié par simulation RLS directe en SQL avant d'être appliqué, pas seulement par lecture de code. Une bannière dérivée (`isDraftPreview`, clé i18n `draftPreviewBanner`) s'affiche maintenant sur un brouillon consulté par son propriétaire.
- **`?preview=1`** (`isPreviewFrame` dans `app/chalets/[slug]/page.tsx`) : `PreviewModal.tsx` ajoute ce paramètre pour que la fiche masque la Navbar/Footer partagés du site quand elle est chargée en iframe — purement cosmétique, isolé à deux conditionnels, vérifié qu'il ne contourne aucune autre logique de sécurité/affichage.

### Contenu bilingue FR/EN des annonces et du profil proprio (2026-09-16)

Distinct de la traduction automatique des messages (ci-dessus, Google Translate) : les champs de contenu libre d'une annonce et la bio du proprio ont maintenant une vraie structure bilingue FR/EN, traduite via Claude Sonnet. Livré en 8 tâches via subagent-driven-development, directement sur `main` — plan complet et décisions d'architecture dans `docs/superpowers/plans/2026-09-16-bilingual-listings-and-bio.md`.

- **Champs concernés** : `listings.title`/`title_en`, `listings.description`/`description_en`, `caption`/`caption_en` de chaque photo (dans le jsonb `photos`, type `PhotoItem`), `rooms.name`/`name_en`, `users.bio`/`bio_en` — les colonnes `_en` existaient déjà en base depuis une migration antérieure jamais exploitée, jamais écrites avant cette fonctionnalité.
- **`components/dashboard/TranslateButton.tsx`** + **`lib/translateField.ts`** : composant bouton réutilisable (variantes `pill`/`link`/`icon`) et logique de traduction partagée (construction du prompt système + appel Anthropic), utilisés à la fois par la route interactive `POST /api/ai/translate` et par le cron de traduction automatique (voir plus bas) — un seul endroit construit les prompts, pas de duplication.
- **Deux patrons d'UI distincts selon la densité du champ** :
  - Titre/description/bio (un seul champ, jamais répété) : les deux blocs FR et EN sont **toujours visibles**, réordonnés selon la langue — `useLocale()` (langue de navigation du dashboard) pour titre/description, `preferredLanguage` (la vraie préférence stockée du proprio, déjà disponible localement dans `ProfileForm.tsx`) pour la bio.
  - Légendes de photos/noms de chambre (potentiellement des dizaines par annonce) : le champ FR reste **toujours visible**, le champ EN est **replié par défaut** derrière un bouton, pour ne pas surcharger une grille de 80 photos ou une longue liste de chambres. Boutons Traduire **unidirectionnels FR→EN seulement** ici (contrairement à titre/description/bio, bidirectionnels) — le proprio rédige toujours en français d'abord pour ces champs répétés.
  - ⚠️ **Piège à éviter si ce patron est retouché un jour** : une première version du repli EN faisait dépendre la *visibilité* du champ FR de l'ordre réordonné par la locale, ce qui le faisait disparaître complètement quand le dashboard était en anglais. Le FR doit toujours être rendu inconditionnellement ; seule la position de l'EN (avant/après) doit dépendre de la locale, jamais sa présence.
- **Traduction automatique à la publication** (`app/api/cron/translate-listings/route.ts`, cron toutes les 10 min) : balaie les annonces publiées avec des champs `_en` manquants et les traduit en arrière-plan (max 30 champs traduits par exécution, sauvegarde immédiate après chaque légende traduite pour ne rien perdre si le temps d'exécution est dépassé sur une annonce à beaucoup de photos). **N'appelle jamais `checkAiRateLimit`** — action système, hors du quota interactif de 20/heure du proprio (décision explicite de Simon). Le bouton "Traduire" manuel reste soumis à ce quota comme les autres fonctionnalités IA.
- **Badge "Traduction en cours"** (`/dashboard/listings`, `ListingsClient.tsx`) : dérivé à la volée (aucune nouvelle colonne de suivi) — visible uniquement sur les annonces publiées avec au moins un champ `_en` encore manquant, disparaît de lui-même une fois le cron passé.
- **`amenities_en`/`nearby_activities_en`** (colonnes existantes elles aussi) sont volontairement **restées inutilisées** — ces champs sont des listes fermées déjà couvertes par une table de traduction statique (`lib/amenities.ts`, `lib/nearbyActivities.ts`), pas du texte libre nécessitant une vraie traduction IA.
- **Migration `bio_en` sur la vue publique** : `supabase/add-bio-en-to-public-profiles-view.sql` — **exécutée et confirmée en prod le 2026-09-16** (voir section 12). Le code gère explicitement l'absence de cette colonne via une requête de repli (`app/chalets/[slug]/page.tsx`) — utile à retenir si une future colonne doit être ajoutée à cette vue de la même façon : `CREATE OR REPLACE VIEW` n'accepte une nouvelle colonne qu'à la fin de la liste, jamais insérée au milieu (voir section 12).

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
RESEND_API_KEY                     # "Sending access" seulement — ne peut PAS appeler l'API de réception
RESEND_RECEIVING_API_KEY           # "Full access" — utilisée uniquement par /api/webhooks/resend-inbound
RESEND_WEBHOOK_SECRET              # whsec_... — vérifie la signature Svix du webhook Resend Inbound
CRON_SECRET                        # openssl rand -hex 32 — protège /api/sync-ical
TWILIO_ACCOUNT_SID                 # server-side uniquement — notifications SMS nouveau message (lib/sms.ts)
TWILIO_AUTH_TOKEN                  # server-side uniquement
TWILIO_PHONE_NUMBER                # numéro Twilio expéditeur, format +1XXXXXXXXXX
NEXT_PUBLIC_APP_URL                # https://kabanalouer.ca
NEXT_PUBLIC_GA_MEASUREMENT_ID       # Google Analytics 4 — ex. G-SKLC68FPGV
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
| `add-review-request-system.sql` | Crée la table `review_requests` (système d'avis automatique en deux volets, échange/séjour) | Exécuté et confirmé en prod |
| `add-message-notification-tracking.sql` | Ajoute `messages.notification_sent_at` (anti-doublon, cron de notification "nouveau message", Phase 2a) | Exécuté et confirmé en prod le 2026-09-03 |
| `add-email-reply-addresses.sql` | Crée la table `email_reply_addresses` (adresses `conv-{token}@reply.kabanalouer.ca`, Phase 2b) | Exécuté et confirmé en prod le 2026-09-03 |
| `fix-listing-photos-upload-policy.sql` | Corrige la politique storage INSERT du bucket `listing-photos` (upload hors-dossier, audit de sécurité) | Exécuté et confirmé en prod le 2026-09-04 |
| `create-public-profiles-view.sql` | Crée la vue `public.public_profiles` (id/name/bio/avatar_url/created_at, audit de sécurité) | Exécuté et confirmé en prod le 2026-09-04 |
| `fix-users-public-select-policy.sql` | Retire la politique RLS permissive "Lecture publique des profils" sur `public.users` (audit de sécurité) | Exécuté et confirmé en prod le 2026-09-04 |
| `add-phone-notification-prefs-signup.sql` | Ajoute `users.notify_email`/`notify_sms` (défaut `true`) et met à jour `handle_new_user()` pour lire `phone` depuis les métadonnées d'inscription (réutilise la colonne `phone` existante, pas de nouvelle colonne). Migration = schéma seulement — la logique d'envoi SMS elle-même a été ajoutée séparément le 2026-09-14, voir section 9 "Notifications SMS via Twilio" | Exécuté et confirmé en prod le 2026-09-14 |
| `add-rooms-admin-rls-policy.sql` | Ajoute la politique RLS admin sur `rooms` (même compromis que `listings`, voir section 9 Import Airbnb) — sans elle, un admin ne peut pas enregistrer les chambres d'une annonce importée en révision | Exécuté et confirmé en prod |
| `add-bio-en-to-public-profiles-view.sql` | Ajoute `bio_en` à la vue `public_profiles` (bio bilingue du proprio, voir section 9) — `bio_en` doit être en dernière position dans le `SELECT` (`CREATE OR REPLACE VIEW` ne permet d'ajouter des colonnes qu'à la fin, sinon Postgres croit à un renommage de colonne existante, erreur 42P16 rencontrée une première fois) | Exécuté et confirmé en prod le 2026-09-16 |
| `drop-quote-tool-columns.sql` | Supprime `listings.quote_inclusions`/`quote_exclusions`/`quote_booking_instructions`, plus lues nulle part depuis le retrait de l'outil "Devis" (voir section 9) | Proposée, non exécutée — aucune urgence, colonnes juste inertes |
| `slugs-migration.sql` | Ajoute un index UNIQUE partiel sur `listings.slug_fr`/`slug_en` — **plus prioritaire** depuis le 2026-09-17 (voir section 9, "URL de fiche chalet") : ces colonnes ne servent plus qu'au repli historique 1 segment pour d'anciens liens déjà indexés, `ensureListingSlugs()` qui l'appuyait a été retiré. Reste sans danger à exécuter si désiré, juste plus urgent. | Optionnel, à exécuter par Simon dans Supabase SQL Editor si désiré |
| `add-listing-number-custom-slug.sql` | Ajoute `listings.listing_number`/`custom_slug`/`previous_custom_slug` + 2 index UNIQUE partiels, et assigne `listing_number = 48347` à la fiche déjà publiée (776cbb0b-f45f-4b0b-bea9-ebaf0ced7a72) — voir section 9, "URL de fiche chalet" | Exécutée et confirmée en prod le 2026-09-17 |
| `add-no-availability-template-closing-column.sql` | Ajoute `users.no_availability_template_closing` (modèle réutilisable pour la réponse rapide "Indisponible", même principe que `quote_template_closing`) — voir section 13, session du 2026-09-23 | Exécutée et confirmée en prod le 2026-09-23 |
| `ai-usage-log.sql` | Crée la table `ai_usage_log` pour le rate limiting IA | À vérifier |
| `messages-constraints.sql` | Contrainte max 5000 chars sur `messages.content` | À vérifier |
| `avatar-bucket-mime.sql` | Restreint les MIME types du bucket `avatars` | À vérifier |

---

## 13. Historique des sessions — 2026-07-08 au 2026-09-01

### Fonctionnalités complétées

**Séquence email boost (3 emails)** — `lib/emails/featuredListing.ts`, webhook et cron étendus, voir section 9 (Module vedettes). Migration `add-featured-reminder-tracking.sql` fournie mais pas exécutée automatiquement. **Re-vérifié le 2026-09-03** (doute soulevé par une note périmée disant la confirmation d'achat "encore en attente") : les 3 courriels existent et sont branchés (webhook Stripe pour la confirmation, cron `expire-featured` pour J-3/expiration), les 2 migrations liées sont bien exécutées en prod (colonnes confirmées en base), et les 2 Price IDs Stripe (`price_1Tq8si...`/`price_1Tq8uz...`) sont réels et actifs. `featured_listings` est vide en ce moment (aucun boost actif/passé) — pas de preuve vivante d'un achat récent, mais rien de cassé trouvé ; un vrai test d'achat reste à faire si on veut une certitude complète.

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
- **Toute nouvelle route ajoutée à `app/` (nouveau dossier + `page.tsx`) retourne 404 sur `next dev`** sur cet environnement, peu importe le bundler (Turbopack et webpack testés, tous deux échouent) et même après `rm -rf .next` + redémarrage complet — cause non identifiée (aucun bug GitHub public correspondant trouvé), modifier un fichier de route déjà existant fonctionne normalement (hot-reload instantané). Contournement : pour tester une nouvelle page pendant que le serveur tourne, modifier temporairement un fichier de route déjà existant (ex. `app/not-found.tsx`), tester, puis restaurer à l'identique avant de committer.

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

### Session du 2026-09-03

1. **Phase 2 complète — messagerie par courriel** (voir section 9 pour le détail technique). Phase 2a (notification "nouveau message") et Phase 2b (réponse par courriel via `reply.kabanalouer.ca`) construites et **testées de bout en bout en conditions réelles dans les deux volets** (message envoyé → notification reçue → réponse Gmail → insertion correcte dans la conversation), chacune avec un vrai bug trouvé et corrigé pendant le test :
   - Guillemets doubles dans l'aperçu du message (Phase 2a).
   - `RESEND_API_KEY` restreinte à l'envoi seulement, bloquant l'appel à l'API de réception (Phase 2b) — corrigé par une clé séparée `RESEND_RECEIVING_API_KEY` (moindre privilège).
   - Ajustement supplémentaire après ces tests : adresse d'envoi passée de `no-reply@` à `messages@kabanalouer.ca`, texte de bas de page invitant explicitement à répondre au courriel.
   - Vérifié explicitement (lecture seule) : le mécanisme est symétrique proprio ↔ voyageur (basé sur la correspondance d'adresse courriel, aucune branche de code par rôle) — un test dans le sens proprio → voyageur ne devrait rien révéler de nouveau que le sens déjà testé n'ait pas couvert.
2. **3 points de l'audit de sécurité du 2026-07-02 réglés** — voir section 9 (Sécurité).
3. **Bug PKCE du lien de réinitialisation de mot de passe** trouvé et corrigé — voir section 9 (Send Email Hook). Touchait FR et EN depuis toujours (probablement depuis la mise en place du Send Email Hook le 2026-07-07).
4. **Confirmation d'achat boost et séquence win-back** : les deux re-vérifiées suite à des notes périmées qui les disaient encore en attente/à refaire — déjà fonctionnelles, aucun changement nécessaire (voir section 9, Module vedettes et win-back).
5. **Leçon retenue, voir la note en tête de section 14** : plusieurs items de la liste "à faire" se sont révélés déjà faits ou périmés cette session (3 fois) — toujours vérifier l'état réel du code avant de proposer un prompt basé sur cette liste.

### Session du 2026-09-04

1. **Stripe passé en mode Production** — voir section 9 (Stripe passé en mode Production). Compte activé, taxes TPS/TVQ, 5 nouveaux Price IDs, nouveau webhook, clés API, branding Checkout, bascule automatique via `VERCEL_ENV`.
2. **Correction majeure du modèle de tarification** — voir section 9 (Offre de lancement : éligibilité par annonce). L'offre "gratuit 1 an" s'applique maintenant par annonce, pas par proprio ; `users.free_launch_claimed_at` conservé en base mais plus lu nulle part.
3. **Audit de sécurité complet, 3 failles corrigées** — voir section 9 (Sécurité, audit du 2026-09-04) : RLS `public.users` (critique), upload storage hors-dossier, injection JSON-LD non échappée.
4. **QA complet** : bug responsive corrigé (recherche/filtres absents sur tablette 768-1023px dans `/chalets`, commit `5d6ee71`), traductions EN corrigées (8 fichiers de liens CTA vers `localePath()`, Turnstile suit `useLocale()`, 5 pages avec titres EN/FR via `generateMetadata()`, commit `3e87be6`), redirection `/dashboard/subscription` non-connecté maintenant consciente de la langue.
5. **Cartographie des séquences email** : document de référence créé (20 séquences automatisées — nom, déclencheur, destinataire, objet FR/EN, statut), disponible en `.docx` hors du repo.
6. **Google Search Console** configuré pour `kabanalouer.ca` (vérification DNS TXT), sitemap soumis — voir section 9 (SEO / public).
7. **Google Analytics 4** configuré et vérifié en production — voir section 9 (Analytics).
8. **2 corrections trouvées dans un audit des séquences email** (commit `3f4ea99`) : notification manquante sur `/contact` ajoutée (`lib/emails/contactMessageNotification.ts`, voir section 9, Messagerie par courriel), adresses admin incohérentes unifiées sur `simon.authentik@gmail.com` (notification import Airbnb vs formulaire "Import annonce externe" sur `/devenir-hote`, qui envoyait à `slemay@authentik.com`) — et un échappement HTML manquant corrigé au passage dans `app/devenir-hote/actions.ts` (`escapeHtml()` sur name/email/listingUrl, même pattern que le reste du projet).

### Prochaine étape immédiate

**Grand test complet en attente (Simon)** — rien de ce qui suit n'a encore été testé en conditions réelles par un vrai clic bout en bout, seulement par des appels directs :
- Flux de révision admin des imports Airbnb au complet : recevoir la notification, réviser via le formulaire, cliquer "Publier au nom du propriétaire", confirmer que le courriel de bienvenue part bien et que l'abonnement offre de lancement est bien créé.
- QA fonctionnel du site (recherche, formulaires, navigation, erreurs console) — toujours pas fait comme grand test humain complet depuis le 2026-07-10 ; QA automatisé partiel fait le 2026-09-04 (responsive tablette + traductions EN, voir section 13).
- Sélecteur de langue FR/EN dans le profil + redirection automatique (section 14) — toujours pas testé depuis le 2026-07-07.
- Version anglaise des emails Auth (signup + recovery) — toujours pas testée depuis le 2026-07-07 (bloqué à l'époque par une limite de débit Supabase, jamais repris).

**Décisions produits toujours en attente** (aucun changement depuis le 2026-07-10) : infolettre (Resend Broadcasts vs Mailchimp), blogue (Markdown vs table Supabase), cibles chiffrées du plan stratégique.

Voir section 14 pour les autres points en suspens (findings structurels de la revue visuelle non traités, avertissements console à vérifier).

### Session du 2026-09-19

Refonte complète du système d'équipements ("Caractéristiques" → "Équipements") et audit GEO — détail technique complet en section 9 ("Catalogue d'équipements"), résumé chronologique ici :

1. Refonte de l'affichage public : nouvelle section "Ce que propose ce chalet" (`AmenitiesSection.tsx`, top 10 + modale par catégorie), composant partagé `AmenityRow.tsx` (résumé toujours sur une ligne), retrait du bouton "Voir caractéristiques" des points forts (`ListingHighlights.tsx`).
2. Dashboard : section renommée "Équipements", icône crayon (au lieu du chevron) sur les équipements modifiables, colonnes sans scroll interne, sélecteur d'heure par pas de 30 min façon Google Agenda.
3. Refonte majeure du catalogue (`lib/amenities-catalog.ts`) : mécanisme générique `showIf` (champs conditionnels) et `unit` (ex. "pers.") ajoutés au modèle de `detailSchema`, 14 équipements retirés, 3 ajoutés (Accès à un lac, Terrain de tennis, Terrain de pickleball), plusieurs renommages, `AMENITY_PRIORITY_ORDER` entièrement réordonné par Simon.
4. JSON-LD (`lib/listing-schema.ts`) : chaque équipement avec détails expose maintenant un résumé (`description`) dans son `amenityFeature`, pour qu'un agent IA lisant seulement le JSON-LD ait la même information qu'un visiteur humain. Audit GEO complet confirmant que nom/adresse/capacité/chambres/salles de bain/politiques fumeur et animaux étaient déjà bien exposés.
5. Chaque étape testée en conditions réelles sur la fiche `chalet-authentik-50` (seule fiche en base) — migrations de données présentées et confirmées avant écriture à chaque fois, catalogue et ordre de priorité vérifiés par script (aucun id orphelin ou dupliqué).

### Session du 2026-09-21 — Audit statique version anglaise du dashboard + corrections

Audit de code (sans session live) de l'espace proprio et de l'édition d'annonce en anglais, suivi de 3 vagues de corrections, tout committé/pushé.

- **Audit** : script Node comparant `messages/fr.json`/`messages/en.json` (0 clé manquante dans les deux sens à ce moment), recherche du mot "host" (1 seule occurrence légitime, `privacy.s4D2`, contexte "web hosting"), 1 label EN notablement plus long que le FR flagué pour vérification visuelle (`listings.edit.continueForm`), grep ciblé du texte français codé en dur et des liens `/dashboard/...` non préfixés `/en/`.
- **Correction #1 — navigation non localisée** : `router.push`/`redirect`/`href` bruts vers `/dashboard/...` remplacés par `lib/localePath.ts` dans 8 fichiers (`EditListingForm.tsx`, `AnalyseSection.tsx`, `DashboardBottomNav.tsx` — présent sur tout le dashboard mobile —, `Sidebar.tsx`, `app/dashboard/page.tsx`, `app/dashboard/listings/page.tsx`, `app/dashboard/listings/new/actions.ts`, `app/dashboard/listings/[id]/availability/page.tsx`).
- **Correction #2 — texte français codé en dur** : `AvailabilityCalendar.tsx`, `DeleteListingModal.tsx`, `ICalSync.tsx`, `PreviewModal.tsx`, `NewListingStepZero.tsx` entièrement branchés sur next-intl (plusieurs de ces composants avaient déjà leurs clés de traduction FR/EN prêtes dans `messages/*.json` — jamais consommées, voir leçon ci-dessous), plus `PhotoUpload.tsx` (aria-labels, placeholders, erreurs de compression) et 3 lignes ciblées de `app/dashboard/subscription/SubscriptionClient.tsx` (page sensible facturation, périmètre volontairement limité au départ).
- **Correction #3 (suite au retour de Simon)** : reste de `SubscriptionClient.tsx` traduit intégralement (titre, description, statuts, prix via `formatPriceLabel()` existant, date de renouvellement locale-aware, bandeau offre de lancement) ; messages d'erreur de l'import Airbnb traduits dans `lib/listingImport.ts` et `lib/apify.ts` (fonctions non-composants, `t` passé en paramètre plutôt que hook `useTranslations`) — deux appelants mis à jour : `submitImportRequest` (vraie langue du proprio via `getTranslations`) et `app/api/listings/import/route.ts` (route API confirmée sans appelant UI actuel, hors du middleware next-intl donc fixée explicitement en `fr` pour préserver son comportement).
- **Leçon technique retenue** : plusieurs composants dashboard avaient déjà leurs clés de traduction FR/EN complètes dans `messages/fr.json`/`en.json` (calendrier, modale de suppression, sync iCal) sans jamais appeler `useTranslations()` — les clés existaient mais n'étaient pas branchées. Un audit de parité de clés seul (`fr.json` vs `en.json`) ne détecte pas ce cas ; il faut aussi vérifier que chaque composant appelle réellement `useTranslations`/`getTranslations`.
- **Code mort trouvé, non supprimé** : `components/dashboard/Sidebar.tsx` (`DashboardSidebar`) n'est importé nulle part dans le projet — navigation desktop dashboard gérée ailleurs (probablement `Navbar.tsx`), mobile via `DashboardBottomNav.tsx`. Simon a choisi de le garder pour un futur ménage de code mort plutôt que de le retirer maintenant.

### Session du 2026-09-23 — Refonte complète du système de devis/indisponibilité + diagnostic en direct + petites améliorations messagerie

Longue session centrée sur le système de réponse rapide dans la messagerie (devis + nouveau type "indisponible"), avec un vrai bug de fond trouvé après plusieurs fausses pistes en diagnostic live. Tout committé/pushé (10 commits, `293d0e5` → `1ca3108`).

**1. Ajout du 2ᵉ type de réponse rapide "Indisponible" + passage FR/EN complet (`293d0e5`)**
- `QuoteData.type: "quote" | "no_availability"` (`lib/quoteMessage.ts`), nouvelle colonne `users.no_availability_template_closing` (migration `add-no-availability-template-closing-column.sql`, exécutée), nouveau composant `NoAvailabilityWidget.tsx` calqué sur `QuoteWidget.tsx`.
- `app/api/messages/quote/route.ts` étendu (pas dupliqué) pour accepter `type` dans le body et écrire dans la bonne colonne de modèle selon le cas.
- `MessagesClient.tsx` : deux boutons sous chaque demande de devis ("Envoyer un devis rapide" / à l'origine "Plus de disponibilités", renommé plus tard).
- Tout le texte des deux widgets + `QuoteCard.tsx` (badge différencié "Devis"/"Non disponible") passé par `useTranslations("quote")`, ~34 nouvelles clés `messages/fr.json`/`en.json`.

**2. Diagnostic en direct : "le modèle ne s'enregistre pas" — deux causes réelles trouvées, une fausse piste écartée**

Simon a signalé que cocher "Enregistrer ce texte de fermeture comme modèle" ne fonctionnait pas. Diagnostic fait avec la même méthode déjà documentée dans ce fichier (sessions injectées via jetons Supabase Admin, isolatedContext chrome-devtools) — **trois hypothèses testées dans l'ordre, deux confirmées, une écartée** :
- *Hypothèse 1 (écartée)* : onglet resté ouvert sur l'ancien bundle JS avant déploiement — déjà arrivé plusieurs fois dans le projet, mais pas la cause cette fois (reconfirmé après rechargement forcé, toujours pas de sauvegarde).
- *Hypothèse 2 (bug réel, corrigé, `c8a2a68`)* : `postgrest-js` n'envoie jamais d'option `cache` sur ses `fetch()`, et Supabase ne renvoie aucun header `Cache-Control` sur ses réponses REST — un composant remonté **sans rechargement de page** pouvait donc recevoir une réponse GET mise en cache par le navigateur au lieu d'une vraie requête réseau, montrant une valeur périmée juste après une écriture confirmée en base. Corrigé en forçant `cache: "no-store"` sur le `fetch` du client Supabase navigateur (`lib/supabase/client.ts`, `global.fetch` custom) — correctif systémique, pas juste pour les widgets de devis. Reproduit et confirmé résolu en isolation (édition → sauvegarde confirmée en base → réouverture du widget sans recharger la page → donnée à jour).
- *Cause réelle du rapport initial de Simon (pas un bug — refonte, `fc51ad1`)* : Simon éditait la salutation/l'intro du message (juste après "Bonjour {voyageur},"), qui n'avait jamais été incluse dans la section sauvegardable par design (seule la partie à partir de "COMMENT RÉSERVER ?" était mémorisée). Confirmé en comparant le contenu réellement envoyé (`messages.content`) avec le texte censé être sauvegardé.

**Pendant ce diagnostic**, plusieurs tests en direct se sont déroulés **en même temps** que Simon testait de son côté sur le même compte partagé (`info@chaletauthentik.com`) — les deux séries d'écritures se sont mutuellement écrasées un moment, brouillant temporairement le signal. Leçon : demander explicitement à l'utilisateur de mettre son propre test en pause avant un diagnostic live sur un compte partagé, plutôt que de le découvrir après coup via des messages de test inattendus dans la base.

**3. Refonte : le message entier devient un seul modèle éditable et sauvegardable (`fc51ad1`)**

Suite à la vraie cause ci-dessus, Simon a demandé que **tout le texte** soit modifiable et mémorisé, salutation incluse — pas seulement la fermeture. Nouveau système de jetons dans `lib/quoteMessage.ts` (étend le principe déjà existant `{prenomProprio}`/`{nomProprio}`) :
- `{prenomVoyageur}` (prénom du voyageur), `{titreChalet}` (titre de l'annonce), `{datesEtVoyageurs}` (bloc dates + répartition voyageurs, QuoteWidget seulement — jamais figé, toujours recalculé).
- `detokenizeMessage()`/`tokenizeMessage()` remplacent les anciens `detokenizeClosing()`/`tokenizeClosing()` (supprimés) — un seul texte complet chargé/sauvegardé, plus de split "en-tête toujours régénéré" / "fermeture sauvegardée", donc plus de marqueur `CLOSING_MARKER` ni de recherche `indexOf()`.
- **Bug trouvé et corrigé pendant les tests** : si le prénom du voyageur est identique au prénom du proprio (cas réel testé : les deux comptes de test s'appellent "Simon"), un remplacement naïf substituait la mauvaise occurrence en premier et corrompait la signature sauvegardée (`{prenomVoyageur} {nomProprio}` au lieu de `{prenomProprio} {nomProprio}`). Corrigé en tokenisant d'abord le nom complet du proprio (prénom+nom accolés, tel qu'il apparaît dans la signature) comme un seul bloc, avant toute substitution individuelle de prénom.
- Migration de données : `quote_template_closing`/`no_availability_template_closing` remis à `NULL` pour `info@chaletauthentik.com` après le changement de format (l'ancien contenu, fermeture seulement, aurait été chargé à tort comme message complet). Prochaine sauvegarde repart proprement avec le nouveau format.
- Libellé de la case à cocher changé de "Enregistrer ce texte **de fermeture**..." à "Enregistrer ce texte..." (FR/EN) pour refléter que tout le message est maintenant couvert.

**4. Bouton Annuler (`4fab8bb`, repositionné dans `4fae931`)**

D'abord ajouté en haut à droite du widget ouvert, puis déplacé à la demande de Simon juste à droite du bouton "Envoyer" en bas (blanc/contour, `bg-white border border-[#ebebeb]`), plus rien en haut à droite — jugé plus clair. `onCancel` passé en prop à `QuoteWidget`/`NoAvailabilityWidget` plutôt que géré uniquement dans `MessagesClient.tsx`.

**5. CTA "Indisponible" + boutons agrandis (`c90ebca`)**

"Plus de disponibilités" → "Indisponible" (EN : "Unavailable", raccourci pour la même raison). Les deux CTA sous une demande de devis agrandis (`text-xs`→`text-sm`, padding augmenté) — `flex-nowrap`/`flex-shrink-0`/`whitespace-nowrap` ajoutés pour garantir qu'ils restent sur une seule ligne même en mobile 375px (vérifié par capture d'écran avant de pousser, comme l'exige la règle "aperçu visuel obligatoire" section 15).

**6. Messagerie — sidebar : date du dernier message + pastille rouge non lu (`a41039d`)**

`app/messages/page.tsx` fournissait déjà `last_message_at`/`unread_count`, juste jamais affichés dans la liste de conversations. Ajout d'une date (heure si aujourd'hui, sinon jour+mois abrégé — `formatConversationDate()`, locale-aware) et remplacement de l'ancien badge numéroté olive par une simple pastille coral `#f04e45` (cohérent avec la pastille déjà existante sur le lien "Messages" de la navbar).

**7. Lien vers la fiche du chalet dans l'en-tête de conversation (`ed2b5d4`, `20f525b`)**

Icône de lien externe + nom du chalet lui-même cliquable (souligné en rollover), tous deux vers la fiche publique dans un nouvel onglet. Nécessite `region`/`city`/`listing_number`/`custom_slug` du listing, pas sélectionnés avant dans `app/messages/page.tsx` — ajoutés à l'embed PostgREST et propagés jusqu'au `Conversation` type de `MessagesClient.tsx`. Construction du chemin via `buildListingPath()` (`lib/listingUrl.ts`), même helper que `ListingCard.tsx`.

**8. Courriel de notification "nouveau message" — message complet + CTA "Répondre" (`1ca3108`)**

`lib/emails/newMessageNotification.ts` : suppression de la troncature à 150 caractères (le message complet s'affiche maintenant, sauts de ligne préservés via `<br/>` — même pattern que `contactMessageNotification.ts`), bouton "Voir la conversation"/"View conversation" renommé "Répondre"/"Reply", nouveau texte de bas de page FR/EN expliquant qu'on peut répondre par reply-to email ou en cliquant le bouton. Aperçu visuel généré et vérifié (rendu HTML réel du gabarit) avant de pousser, puis republié comme Artifact partageable à la demande de Simon pour qu'il puisse le voir lui-même (un aperçu généré en session n'est pas visible côté utilisateur).

**Aussi fait, hors code** : question de Simon sur le fonctionnement du système d'avis — exploré en lecture seule (`reviews`/`review_requests`, cron quotidien, formulaires à jeton sans connexion, réponse proprio non modifiable, affichage public sans modération) et expliqué, rien modifié.

### Session du 2026-09-24 — Refonte de l'identité visuelle (typo, couleurs, logo), courriels, notifications, photos de profil, messagerie en direct

Très longue session, 30 commits (`d057358` → `6f33cf6`), tout en ligne et vérifié en production. Les **règles durables** qui en découlent sont dans les sections 3 (Design system), 4 (Vocabulaire / règles typographiques) et 9 — cette entrée ne fait que retracer le parcours.

**1. Petits correctifs de parcours**
- Envoi d'un message depuis une fiche : on reste sur la fiche avec une confirmation (« Fermer » / « Voir la conversation ») au lieu d'être redirigé (`d057358`).
- Avis « échange » : question « Comment s'est passée votre discussion avec {prénom} ? » au-dessus des étoiles, FR/EN (`a1e48e0`).
- Fiche vue par son propre proprio : encadré lisible « C'est votre chalet » + bouton « Modifier mon annonce » au lieu d'un bouton désactivé illisible (`28e77fa`).
- Carte du proprio : « N avis » sans gras, note en gras sans « / 5 », pluriel EN corrigé (« 1 review ») (`4cf4150`).

**2. Typographie**
- Espaces insécables françaises partout (U+202F avant ? ! ; — U+00A0 avant : et dans « ») : script AST sur tout le code + `fr.json` (`77ec978`), puis rattrapage des gabarits qui finissent par un accent grave (`bcad9a2`) et des prix `299 $` (`f2fec29`). SMS exclus (UCS-2).
- Échelle de tailles façon Airbnb : jetons `text-heading-2` (22px) / `text-heading-3` (18px), texte de lecture et champs de saisie à 16px (évite le zoom iOS), jamais sous 12px — fiche chalet d'abord (`061f155`), puis tout le site via 4 agents en parallèle (`becc165`, 76 fichiers, diff vérifié : seules les classes de taille ont changé).
- H1 : lettres non resserrées, gras 700, +0,08em entre les mots via règle globale `h1` (`3c065cb`, `8ef95ef`).
- Nombres décimaux selon la langue : `lib/formatNumber.ts` (`57d0e72`).

**3. Couleurs**
- Nouvel accent orange brûlé `#C2410C` (jeton `accent`), réservé aux signaux ; olive reste la couleur de marque et des actions. Choisi par Simon parmi 3 nuances sur une page de comparaison locale (`a76d282`).
- Ménage : jetons d'état `error`/`warning`/`success`/`star`, 381 classes migrées, `gray-*` → `charcoal-*`, palettes mortes (corail, sarcelle, sauge, alias CSS) retirées (`1492727`).
- Étoiles d'avis en gris foncé partout (`da0c7f0`) ; cercles sans photo en gris pâle neutre partout, 8 endroits (`2bb5820`).
- ⚠️ Remplace ce qui est dit plus haut dans la session du 2026-09-23 (point 6) sur la « pastille coral `#f04e45` » : le corail n'existe plus.

**4. Logo v2** (`a4c6369`, `abc1d47`) — le texte du SVG n'était pas vectorisé et s'affichait en San Francisco/Segoe/Roboto selon l'appareil. Converti en tracés (Plus Jakarta Sans 600, +0,01em, traits 3,3), choisi par Simon parmi 4 variantes ; favicon simplifié ; générateur `scripts/logo/` (voir section 3 § Logo) ; `logo-email.png` avec fond blanc pour le mode sombre.

**5. Courriels** (`8a9b73e`, `bcad9a2`, `abc1d47`) — gabarit commun et hook d'auth Supabase (déployé, `send-email-hook` v5) : vrai logo, gris du site, tailles de l'échelle, texte de secours stylisé si images bloquées. Courriel « le proprio a répondu à votre avis » reconstruit (`lib/emails/reviewReplied.ts`) : bilingue et **contenu utilisateur désormais échappé** (l'ancien HTML codé en dur insérait réponse/commentaire sans `escapeHtml`).

**6. Notifications et photos de profil**
- Pastilles `CountBadge` / `AvatarDot` unifiées, point sur la photo du voyageur, « (n) » dans le titre de l'onglet (`c40aba1`).
- Incitation à la photo **sans toucher à la demande de prix** (décision de Simon, peur de faire baisser la conversion) : astuce après envoi, bandeau messagerie, ligne du menu, pastille appareil photo dans le profil, section voyageur « À propos de vous » (`users.bio`, pas de migration) affichée au proprio dans une fiche en tête de conversation (`08e5edd`, `24104cb`, `ebb4c1e`, `aae21a3`).

**7. Messagerie**
- Accueil de la zone centrale (titre « Messagerie », icône, consigne), variante mobile, textes codés en dur traduits (`0ab69a8`).
- Liste des conversations en direct (Realtime sur `receiver_id`/`sender_id`) ; notifications courriel/SMS : cron chaque minute + délai de grâce 2 min → 2 à 3 min au lieu de 5 à 10, confirmé dans les journaux Vercel (`6f33cf6`).

**8. Divers** — vrai 404 pour les fichiers inexistants (le segment `[locale]` rendait l'accueil en 200) (`fa343f5`).

**Leçons de la session**
- **Les préversions Vercel échouent toutes** (variables d'environnement en production seulement) : 3 liens de préversion ont été donnés à Simon sans vérifier leur état, il a approuvé sans voir. Désormais : aperçu via `npx next dev -p 3123` (Simon est sur la même machine) et toujours vérifier `READY` avant de donner un lien Vercel. Voir section 14.
- Les écritures Supabase en production par Claude (UPDATE sur `messages`) sont bloquées par le classifieur de sécurité même avec l'accord de Simon → lui fournir la requête SQL à exécuter lui-même.
- Un script qui réécrit `fr.json` avec `JSON.stringify` change la mise en page du fichier : modifier le texte brut, pas re-sérialiser.
- Aperçu d'éléments visibles seulement connecté : page de test temporaire sous `app/[locale]/test-…/` (le middleware réécrit tout sous `[locale]`), supprimée avant commit, puis `rm .next/dev/types/validator.ts` si `tsc` se plaint d'une page disparue.

---

## 14. Points en suspens

> ⚠️ **À lire avant de proposer un prompt basé sur cette liste (note du 2026-09-03)** : cette session, 3 items différents de ce genre de liste se sont révélés faux — déjà faits, ou périmés — alors que les notes affirmaient le contraire (Send Email Hook, confirmation d'achat boost, séquence win-back — voir section 13). Toujours vérifier l'état réel du code/de la base avant de faire confiance à un point noté ici comme "en attente" ou "à faire".

### Préversions Vercel inutilisables (2026-09-24)

Toutes les variables d'environnement du projet Vercel sont ciblées **production seulement** : chaque déploiement de branche échoue au build (`new Resend(process.env.RESEND_API_KEY!)` → « Missing API key »). Pour les réactiver, il faudrait donner des clés à l'environnement Preview — mais elles pointeraient sur la vraie base Supabase et le vrai Stripe (base partagée dev/prod, section 2). Décision à prendre avec Simon ; en attendant, aperçus en local sur `localhost:3123`.

### Dossier « Design System » pas à jour (2026-09-24)

Les maquettes et la doc de marque de `Design System/` montrent encore l'ancien logo et l'ancienne palette (corail). Non utilisé par le site — à mettre à jour si Simon s'en sert pour du matériel externe.

### Pistes proposées, non faites (2026-09-24)

- **BIMI** (logo à côté du nom de l'expéditeur dans Gmail/Apple Mail) : exige DMARC en mode strict + certificat de marque payant (~1 000–1 500 $ US/an). Plus tard, quand le volume de courriels augmentera.
- **Mesurer l'effet de la photo de profil** : comparer le taux de réponse des proprios aux voyageurs avec et sans photo, pour afficher un vrai chiffre dans l'incitation (ne jamais inventer de statistique).

### Code mort à nettoyer un jour — `components/dashboard/Sidebar.tsx` (2026-09-21)

`DashboardSidebar` n'est importé nulle part dans le projet (recherche exhaustive faite, voir section 13). Simon a explicitement demandé de le laisser tel quel pour l'instant, à retirer lors d'un futur ménage de code mort plutôt que maintenant.

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

Seuls les 2 points "petits et sûrs" ont été corrigés (voir section 13). Le regroupement des équipements dans l'édition d'annonce est réglé depuis (voir section 9, refonte du catalogue du 2026-09-19). Restent en suspens, à discuter avant d'y toucher :
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
