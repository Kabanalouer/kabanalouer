# CLAUDE.md — Kabanalouer

Contexte complet du projet pour Claude Code. À lire en entier au démarrage.

---

## 1. Le projet

**Kabanalouer** est une marketplace de location de chalets au Québec — le Airbnb du chalet québécois. Les propriétaires publient leurs chalets, les voyageurs les contactent directement. Pas de frais de service pour les voyageurs.

- **Production :** https://kabanalouer.vercel.app
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
| Stripe | 22.x | Abonnements propriétaires (actif) |
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
| `users` | Profils (bio, avatar_url, name, email) |
| `listings` | Annonces chalets |
| `rooms` | Chambres/salons liés à une annonce |
| `availability` | Dates bloquées (manual + ical) |
| `messages` | Messagerie voyageur ↔ proprio |
| `reviews` | Avis voyageurs sur les chalets |
| `favorites` | Favoris voyageurs |
| `subscriptions` | Abonnements propriétaires |
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
  (auth)/               Login, signup
  api/                  Routes API (auth check obligatoire)
    ai/                 Génération IA (suggest-titles, generate-description, generate-bio, listing-advice)
  dashboard/            Espace proprio
  chalets/              Pages publiques annonces
components/
  dashboard/            Composants espace proprio
  chalets/              Composants pages publiques
lib/
  supabase/             client.ts + server.ts
  photo.ts              Compression WebP + normalisation URLs
  amenities.ts          Liste des caractéristiques
  listingScore.ts       Score optimisation 0-100 (buildCriteria, computeScore, getScoreLevel)
public/                 Assets statiques (logos, hero image)
design-system/          Fichiers de référence branding
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
- **Module vedettes** : région (49 $/mois) et accueil (99 $/mois) — Stripe à intégrer
- **iCal sync** bidirectionnel (`/api/sync-ical`)
- **Photos chambres** : drag & drop, compression WebP, upload bucket `listing-photos`

### Côté voyageur
- **Recherche** : filtres, Google Maps split-view sur `/chalets`
- **Messagerie** directe proprio ↔ voyageur
- **Avis** avec réponse proprio + notification email Resend
- **Favoris**

### SEO / public
- 14 pages région statiques + pages villes dynamiques
- Sitemap XML automatique
- Métadonnées Open Graph + Twitter sur toutes les pages clés

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
NEXT_PUBLIC_APP_URL                # https://kabanalouer.vercel.app
NEXT_PUBLIC_VERCEL_URL             # https://kabanalouer.vercel.app
```

---

## 11. Dernière session — 2026-06-05

### Fonctionnalités complétées

**Internationalisation (i18n) — pages et composants traduits en anglais**

- **`CreationChoiceSection`** (`components/devenir-hote/CreationChoiceSection.tsx`) — section "Comment voulez-vous créer votre annonce ?" traduite avec `useTranslations("creationChoice")`. Namespace `creationChoice` ajouté dans `fr.json` et `en.json` (37 clés : titres, descriptions, formulaire d'import complet).
- **Footer** (`components/Footer.tsx`) — lien "Pourquoi nous choisir ?" retiré de la colonne Proprios/Owners (FR et EN). Clé `owners.whyChooseUs` supprimée des deux fichiers JSON.
- **Page contact** (`app/contact/page.tsx`, `app/contact/ContactForm.tsx`) — entièrement traduite. `metadata` statique remplacé par `generateMetadata()` avec `getLocale()`. `ContactForm` passe de textes hardcodés à `useTranslations("contact")` (sujets du select, labels, messages). Namespace `contact` ajouté (37 clés). `app/[locale]/contact/page.tsx` mis à jour pour re-exporter `generateMetadata` au lieu de `metadata`.

**Contenu page d'accueil**

- **H1** (`messages/fr.json`, `messages/en.json`, clé `home.heroTitle`) — nouveau texte SEO : "Payez moins cher pour votre location de chalet au Québec." / "Pay less for your Quebec cabin rental."
- **Taille responsive H1** (`app/page.tsx`) — passage de `text-[2.6rem] md:text-5xl lg:text-[3.75rem]` (4 lignes sur mobile !) à `text-2xl sm:text-4xl lg:text-[3.25rem]` (2 lignes garanties sur tous les écrans, testé par Playwright sur 375–1440px).
- **Sous-titre** (`home.heroSubtitle`) — simplifié : "Contactez les propriétaires directement." / "Contact owners directly."

**Bugs UI corrigés**

- **Alignement vertical labels dropdown voyageurs** (`SearchBar.tsx`, `NavSearchBar.tsx`) — `self-start` ajouté sur le bloc label+sous-titre pour ancrer le texte en haut de la ligne (au lieu de le centrer verticalement avec les boutons +/−).
- **Alignement horizontal labels dropdown voyageurs** (`SearchBar.tsx`, `NavSearchBar.tsx`) — `text-left` ajouté sur le même bloc. Cause racine : `text-align: center` hérité du parent `.text-center` du hero de `page.tsx`, qui cascadait dans le dropdown. Les labels (plus courts que leurs sous-titres) se retrouvaient centrés dans la largeur du sous-titre → décalage visible de 9 à 23px selon la ligne.

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `app/page.tsx` | H1 : nouvelle classe responsive `text-2xl sm:text-4xl lg:text-[3.25rem]` |
| `app/contact/page.tsx` | `metadata` → `generateMetadata()`, tous les textes via `getTranslations("contact")` |
| `app/contact/ContactForm.tsx` | `useTranslations("contact")`, sujets et labels traduits |
| `app/[locale]/contact/page.tsx` | Re-export `generateMetadata` (au lieu de `metadata`) |
| `components/Footer.tsx` | Lien `owners.whyChooseUs` retiré |
| `components/devenir-hote/CreationChoiceSection.tsx` | `useTranslations("creationChoice")`, tous textes traduits |
| `components/SearchBar.tsx` | `self-start text-left` sur le leftDiv du dropdown voyageurs |
| `components/NavSearchBar.tsx` | `self-start text-left` sur le leftDiv du dropdown voyageurs |
| `messages/fr.json` | Namespaces `creationChoice` et `contact` ajoutés ; `home.heroTitle`, `home.heroSubtitle` mis à jour ; `owners.whyChooseUs` retiré |
| `messages/en.json` | Idem |

### Leçons techniques retenues

- **`text-align` est une propriété CSS héritée.** Un `text-center` sur un ancêtre cascade dans tous les descendants, y compris les dropdowns absolument positionnés qui sont des enfants DOM du composant. Toujours ajouter `text-left` explicitement sur les dropdowns ou leurs cellules de texte.
- **Tailwind v4 : classes dynamiques non compilées.** Appliquer des classes Tailwind via `className` en JavaScript ne fonctionne que si la classe est déjà présente dans le CSS compilé. Pour tester dynamiquement, utiliser des `inline styles`.
- **next-intl + composants client :** utiliser `useTranslations()` (hook). Pour les server components : `getTranslations()` (async). `getLocale()` lit le locale depuis les headers de requête définis par le middleware — fonctionne même dans des fichiers re-exportés via `[locale]/page.tsx`.
- **Re-exports `[locale]/page.tsx` :** quand une page passe de `export const metadata` à `export async function generateMetadata`, le fichier de re-export dans `app/[locale]/` doit être mis à jour en conséquence.

### Prochaines étapes immédiates

- Vérifier visuellement en production que le dropdown voyageurs est correct sur `/en` et `/` (les fixes `self-start` + `text-left` sont déployés mais non confirmés côté Vercel).
- Continuer la traduction des pages restantes non encore traduites sous `/en` (vérifier avec un audit des pages `app/[locale]/*/page.tsx`).
- Tester le formulaire de contact (`/en/contact`) end-to-end : soumission, email Resend reçu, message de succès en anglais.
