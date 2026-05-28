# Kabanalouer — Design System

> **La Marketplace de la location de chalets au Québec.**
> Plateforme moderne et chaleureuse qui connecte voyageurs et propriétaires de chalets.

---

## Contexte produit

**Kabanalouer** est une marketplace de location de chalets au Québec. Le produit se positionne au croisement de trois univers :

- **Marketplace bilatérale** — voyageurs (côté demande) et hôtes/propriétaires (côté offre)
- **Hospitalité chaleureuse** — l'imaginaire du chalet québécois (bois, lac, feu, forêt, neige)
- **Marketplace moderne** — recherche photo-driven, fiches détaillées, paiement intégré, messagerie hôte-voyageur

L'inspiration visuelle est celle d'Airbnb : photographie au premier plan, espace généreux, typographie expressive, cartes douces, navigation claire. Le système adopte le même langage moderne marketplace — **coral en accent + charcoal sur blanc + Plus Jakarta Sans** — tout en gardant une identité québécoise par la photographie et le ton conversationnel francophone.

**Audience primaire :** voyageurs francophones du Québec (Montréal, Québec, Ottawa-Gatineau) cherchant un chalet pour fin de semaine, semaine de relâche, vacances d'été.
**Audience secondaire :** propriétaires de chalets souhaitant rentabiliser leur propriété.
**Langue :** français-Québec en premier ; anglais en seconde langue (toggle FR/EN).

### Surfaces produit

1. **Site web (kabanalouer.ca)** — marketplace publique : accueil, recherche, fiche chalet, parcours de réservation, profil hôte
2. **Application mobile (iOS / Android)** — recherche, réservations, messagerie, voyages à venir
3. **Espace hôte** — tableau de bord, calendrier, gestion des annonces (touché brièvement dans le UI kit)

### Sources fournies

- **Aucune source externe** — le projet part de zéro. Pas de codebase, pas de Figma, pas de slide deck.
- L'instruction utilisateur demande un système au **style d'Airbnb** comme référence d'esprit (photo-forward, marketplace, chaleureux), pas une copie 1:1.

---

## Fondamentaux de contenu (Content Fundamentals)

### Voix de marque

**Chaleureuse, conversationnelle, ancrée dans le lieu.** Kabanalouer parle comme un hôte accueillant : direct, simple, jamais distant. On évoque le lieu et la sensation avant la transaction.

| Trait | On fait | On évite |
|---|---|---|
| **Chaleur** | « Préparez votre prochaine escapade » | « Réservez maintenant — offre limitée » |
| **Concret** | « 4 chambres, vue sur le lac, foyer au bois » | « Hébergement premium tout confort » |
| **Local** | « En Estrie, à 1h30 de Montréal » | « Destination de rêve » |
| **Humain** | « Marie-Pier, hôtesse depuis 2021 » | « Vérifié par notre algorithme » |

### Casse et ponctuation

- **Titres** : capitale initiale seulement (`Sentence case`), jamais TOUT EN MAJUSCULES sauf eyebrow/label
  - ✅ « Trouvez votre chalet au bord du lac »
  - ❌ « TROUVEZ VOTRE CHALET AU BORD DU LAC »
- **Eyebrows / labels** : peuvent être en `UPPERCASE` avec letter-spacing élargi (`--tracking-caps`)
- **Boutons** : impératif, court — `Réserver`, `Voir le chalet`, `Continuer`, `Ajouter aux favoris`
- **Apostrophe typographique** : `'` (U+2019), pas `'` droite — « l'Estrie », pas « l'Estrie »
- **Espaces insécables** : avant `:`, `;`, `?`, `!`, `»`, après `«`, devant unités (`120 $/nuit`) — règle française
- **Devise** : `120 $` ou `120 $/nuit`, jamais `$120` (convention québécoise)

### Personne grammaticale

- **« Vous » par défaut** — voix respectueuse, marketplace adulte. Jamais « tu » dans l'interface (sauf messagerie hôte↔voyageur où la personne suit l'usage de l'utilisateur).
- **« Nous »** pour Kabanalouer en tant qu'entreprise (CGU, à propos), rarement dans le produit lui-même.
- **« Je »** uniquement quand l'utilisateur parle de lui-même (« Mes voyages », « Mon compte »).

### Bilinguisme

- FR-CA en source ; EN-CA en traduction. Toggle visible en footer + menu utilisateur.
- Anglicismes : éviter sauf si vraiment ancré (« week-end » ✅, « checkout » ❌ → « paiement » ou « finalisation »).

### Émojis et caractères spéciaux

- **Pas d'émojis dans l'UI produit.** Le produit traite d'argent et de réservations — émojis cassent la confiance.
- **Émojis tolérés** : messagerie hôte↔voyageur uniquement (saisie utilisateur), ou newsletters/réseaux sociaux (hors design system).
- **Étoiles** : caractère `★` (U+2605) ou icône SVG Lucide `star-fill` — pas d'émoji ⭐.
- **Symboles utiles** : `·` (puce médiane) pour séparer méta-données (`4 chambres · 2 sdb · 8 voyageurs`), pas `|` ou `,`.

### Exemples concrets

> **Hero accueil**
> _« Le Québec, un chalet à la fois. »_
> _Sous-titre :_ Trouvez votre prochaine escapade en bord de lac, en forêt ou en montagne. Plus de 2 400 chalets vérifiés au Québec.

> **Card chalet**
> _Titre :_ Chalet au bord du lac Memphrémagog
> _Méta :_ Magog, Estrie · 8 voyageurs · 4 chambres
> _Prix :_ **240 $** /nuit · ★ 4,92 (87 avis)

> **Empty state — favoris**
> _« Aucun chalet enregistré pour l'instant. »_
> _« Tapez sur le ♡ d'un chalet pour le retrouver ici. »_

> **Confirmation de réservation**
> _« C'est confirmé. Bon séjour, Marie ! »_
> _« Votre chalet à Magog vous attend du 18 au 21 juillet. Marie-Pier, votre hôtesse, vous écrira d'ici quelques heures. »_

---

## Fondamentaux visuels (Visual Foundations)

### Identité globale

Une **marketplace moderne, photo-first.** Fond blanc, coral pour les actions, typographie sans-serif bold pour l'énergie. Beaucoup d'espace, beaucoup de photos. La couleur travaille en accent — coral pour signaler l'action, teal pour les états secondaires.

### Couleurs

- **Primaire — Coral** (`#f04e45`) : marque, logo, CTA principal (Réserver, Contact direct), éléments d'emphase. Plus rouge-orange qu'un coral d'Airbnb pur, pour se différencier légèrement.
- **Secondaire — Teal** (`#008489`) : accent semantique discret, badges « vérifié », hover liens secondaires.
- **Texte — Charcoal** : `#222222` pour les headings, `#717171` pour le corps (mêmes neutres qu'Airbnb).
- **Surfaces** : Blanc pur `#ffffff` pour le fond + cartes, `#f7f7f7` pour les sections alternées, `#ebebeb` pour les bordures fines.
- **Sémantique** : success = teal, warning = ambre miel, danger = brick rouge.

**Règles :**
- Pas de gradient marketing aggressif. Gradients **uniquement** comme overlay de protection sur image (`linear-gradient(to top, rgba(0,0,0,.55), transparent 60%)`).
- Pas de duos bleu-violet (anti-pattern AI).
- Fond de page **toujours** blanc pur `#fff`. Pas de crème, pas de chaud subtil.

### Typographie

- **Plus Jakarta Sans** — fonte unique pour tout : display, UI, body. Geometric sans moderne (proche du Cereal d'Airbnb).
- **Geist Mono** — codes confirmation, dates ISO, valeurs techniques (rare en UI).
- **Hiérarchie par poids** :
  - Display / h1 : 800 (extrabold)
  - h2 : 700 (bold)
  - h3 / h4 : 600–7 (semibold/bold)
  - Body : 400 (regular)
  - Eyebrow / labels : 600 + UPPERCASE + tracking 0.08em
- **Tracking** : `-0.035em` sur display, `-0.03em` sur h1–h2, `-0.02em` sur h3, `0` sur body, `0.08em` sur eyebrows.
- **Emphase** dans les titres : changement de couleur (coral) plutôt qu'italique.

> ⚠️ **Substitution de fonte** — Plus Jakarta Sans + Geist Mono proviennent de Google Fonts (chargés via `@import`). Pour la prod, merci de confirmer : self-host en `.woff2` ou rester sur le CDN Google Fonts.

### Espacement

Grille de **4 px**. Tokens `--space-0` à `--space-32` (0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128). Marges de section généreuses (80–128 px desktop). Sur mobile, on resserre à 16–24 px sur les côtés.

### Coins (border-radius)

- `--radius-sm: 8px` — chips, inputs, boutons (par défaut, style Airbnb)
- `--radius-md: 8px` — même valeur, alias par compat
- `--radius-lg: 12px` — photos, cartes chalet (signature)
- `--radius-xl: 16px` — hero cards, modales
- `--radius-pill: 999px` — search bar, pills, badges
- **Photos** : presque toujours `--radius-lg` (12 px).

### Ombres

Quatre niveaux papier-comme, **chaud** (base brune `rgba(35, 30, 22, X)` plutôt que noir pur) :

- `--shadow-xs` : champs hover
- `--shadow-sm` : cartes au repos
- `--shadow-md` : cartes au hover, dropdowns
- `--shadow-lg` : modales, popovers
- `--shadow-xl` : modales plein écran, sheets
- `--shadow-focus` : anneau focus vert forêt 22 % opacité

**Pas d'ombre intérieure agressive.** L'inset n'est utilisé que sur les champs au focus (subtil).

### Bordures

- `--border-1` (`char-100`) — séparateurs fins (listings, lignes de tableau)
- `--border-2` (`char-200`) — bordures par défaut (inputs, cartes alternatives sans ombre)
- `--border-strong` (`char-300`) — focus inactif sur input
- **Pas de bordures colorées gauche-only sur cartes** (anti-pattern AI).

### Backgrounds & imagerie

- **Photographie au premier plan** — chalets en lumière naturelle, dorée (golden hour), tons chauds. Pas de filtre noir-et-blanc, pas de saturation excessive.
- **Source actuelle** : Unsplash (photos réelles via URL directe) pour les prototypes. Pour la prod, remplacer par les vraies photos des hôtes (drag-and-drop sur leur tableau de bord).
- **Vibe imagerie** : warm, doré, naturel, parfois un peu de grain léger. Saison varie : été (vert + lac bleu), automne (orange + or), hiver (neige + lumière froide compensée par bois chaud).
- **Pas d'illustrations dessinées à la main** — la marque est photographique. Quelques pictogrammes Lucide pour la navigation, c'est tout.
- **Pas de textures répétées de fond.** Le fond blanc suffit.
- **Hero accueil** : image plein-bleed avec léger overlay sombre en bas pour le texte (protection gradient, pas capsule).

### Animations & motion

- **Easing par défaut** : `--ease-out` (`cubic-bezier(0.22, 1, 0.36, 1)`) — décélération douce
- **Spring discret** : `--ease-spring` pour micro-interactions (like, toggle favori) — petit overshoot
- **Durées** : 140 ms (micro), 220 ms (standard), 360 ms (transitions de page)
- **Fade + translate Y de 4–8 px** pour apparitions de modales/dropdowns
- **Pas de bounce excessif**, pas de rotations gratuites
- **Image hover** : carousel arrows fade-in + scale subtil 1.02

### États interactifs

- **Hover** sur cartes : ombre passe de `sm` → `md`, **pas** de translation, **pas** de scale (la photo prime, on ne la fait pas bouger). Sauf les boutons photo de favoris (légère scale 1.05).
- **Hover** sur boutons : darken de la couleur (`--brand-primary-hover`)
- **Press** sur boutons : color encore plus foncée + scale **0.97** (feedback tactile, court — 100 ms)
- **Focus** : anneau `--shadow-focus` (vert forêt 22 %), pas d'outline système
- **Disabled** : opacity 0.45, cursor not-allowed, pas de hover

### Cartes (cards)

Trois variantes :

1. **Listing card** (chalet) : photo `radius-lg` + texte sous photo, **pas de bordure**, **pas d'ombre** au repos, ombre `sm` au hover. Photo est la star.
2. **Surface card** (modale, panneau réservation, sticky sidebar) : `bg-surface` + `radius-lg` + `shadow-md` + padding `24–32px`.
3. **Inset card** (récap, info hôte) : `bg-surface-alt` (birch-100) + `radius-md`, pas d'ombre, padding `20px`.

### Layout & rythme

- **Container max-width** : 1280 px sur desktop, padding latéral 24–80 px selon viewport
- **Grille cartes** : 4 colonnes desktop large (≥1280), 3 (≥1024), 2 (≥640), 1 (mobile)
- **Header sticky** : `bg-surface` + bordure basse `border-1`, hauteur 80 px
- **Footer** : généreux (96 px padding vertical), `bg-surface-alt`, liens en colonne
- **Pas d'éléments fixes flottants** sauf : bouton « Réserver » sticky sur mobile fiche chalet ; barre de recherche sticky desktop quand on scrolle

### Transparence et blur

- **Backdrop blur** uniquement sur header au scroll (`backdrop-filter: blur(12px)` + `bg-surface` à 80 % opacité)
- **Modales** : overlay `rgba(35, 30, 22, 0.45)`, pas de blur (perf)
- **Image overlays** : gradient noir → transparent en bas (protection texte hero), 0 → 55 % opacité

---

## Itinéraire des fichiers

```
.
├── README.md                  ← ce fichier · brand brief, content + visual foundations
├── SKILL.md                   ← prompt cross-compatible Claude Code (skill bundle)
├── ICONOGRAPHY.md             ← règles d'iconographie · Lucide via CDN
├── colors_and_type.css        ← TOKENS · couleurs, type, espacement, radii, ombres, motion
├── assets/
│   ├── logo-mark.png          ← cabin coral plein avec détails coral pâle + blanc (raster, 1689×1920)
│   ├── logo-mark.svg          ← wrapper SVG autour de logo-mark.png (back-compat)
│   ├── logo-wordmark.svg      ← cabin + « kabanalouer » (Plus Jakarta 700) pour fond clair
│   ├── logo-wordmark-light.svg ← version texte blanc pour fond foncé
│   ├── favicon.png            ← 64×64 raster pour usage web
│   ├── favicon-32.png         ← 32×32 pour tiny rendering
│   └── favicon.svg            ← wrapper SVG du favicon
├── fonts/
│   └── README.md              ← stratégie fontes (Google Fonts CDN pour l'instant)
├── preview/                   ← 25 cards du Design System tab
│   ├── colors-*.html          ← 6 cards palette
│   ├── type-*.html            ← 5 cards typo
│   ├── spacing-*.html, motion.html  ← 4 cards tokens
│   ├── comp-*.html            ← 7 cards composants
│   └── brand-*.html           ← 3 cards (logos, icons, photo)
└── ui_kits/
    ├── web/                   ← marketplace web (React JSX, Babel inline)
    │   ├── README.md
    │   ├── index.html         ← prototype cliquable home → fiche → confirmation
    │   ├── data.js            ← données fictives (chalets, hôtes, avis)
    │   ├── Header.jsx, SearchHero.jsx, CategoryStrip.jsx,
    │   ├── ListingCard.jsx, ChaletDetail.jsx, BookingPanel.jsx,
    │   ├── ReviewBlock.jsx, App.jsx (Footer + Homepage + routeur)
    └── mobile/                ← app iOS (React JSX, ios-frame starter)
        ├── README.md
        ├── index.html         ← 3 téléphones côte-à-côte
        ├── ios-frame.jsx
        └── MobileScreens.jsx  ← Explorer · Fiche chalet · Mes voyages
```

Voir `SKILL.md` pour utiliser ce design system dans un autre projet (skill bundle compatible Claude Code).
