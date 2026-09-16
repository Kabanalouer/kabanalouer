# Support bilingue complet des fiches d'annonce et de la bio proprio — Plan d'implémentation

> **Pour les exécutants agentiques :** SOUS-SKILL REQUIS : utilise superpowers:subagent-driven-development (recommandé) ou superpowers:executing-plans pour implémenter ce plan tâche par tâche. Les étapes utilisent la syntaxe case à cocher (`- [ ]`) pour le suivi.

**Objectif :** rendre les fiches d'annonce et la bio proprio réellement bilingues FR/EN — traduction assistée par IA (Claude Sonnet) pour les champs de texte libre, complétude bilingue confirmée ou corrigée pour les sections structurées, et traduction automatique de secours à la publication d'une annonce.

**Architecture :** réutilisation quasi intégrale d'un schéma de données déjà présent en production (colonnes `_en` déjà migrées mais jamais lues/écrites), un unique endpoint IA générique de traduction partagé par tous les champs de texte libre, et une décision à trancher par Simon entre traduction bloquante ou en arrière-plan au moment de la publication.

**Tech Stack :** Next.js 16 / React 19, Supabase (Postgres), Anthropic Claude Sonnet (`claude-sonnet-4-6`), next-intl.

**Spec :** ce document (aucune spec séparée — les décisions produit ont été données directement par Simon dans la demande initiale, reproduites section par section ci-dessous).

## Exécution

Mode subagent-driven-development, directement sur `main` (accord explicite de Simon, comme pour le chantier d'import Airbnb). Revue après chaque tâche. **Pour toute tâche qui touche l'interface, un aperçu visuel doit être montré à Simon et validé avant le `git push` de cette tâche** — validation incrémentale tâche par tâche, pas seulement à la toute fin.

## Contraintes globales

- Design system : olive/coral uniquement, Plus Jakarta Sans, sentence case, pas d'emoji (voir CLAUDE.md).
- Toute nouvelle écriture Supabase (colonnes déjà existantes ou non) reste soumise à l'approbation manuelle stricte de Simon avant exécution — aucune migration SQL n'est exécutée automatiquement.
- Le rate limiting IA existant (`lib/aiRateLimit.ts`, 20 appels/heure/utilisateur, un seul bucket partagé) doit être respecté ou explicitement ajusté avec l'accord de Simon — jamais contourné silencieusement.
- `npx tsc --noEmit` doit rester propre après chaque tâche.
- Aucune tâche ne doit casser le comportement déjà en place (ex. la traduction automatique des messages, le score d'optimisation, la validation de publication).

---

## Partie 1 — Investigation (déjà faite, résumée ici)

### 1.1 Classification de chaque section de la fiche

| Section | Champ(s) | Type | Verdict |
|---|---|---|---|
| Titre | `title` | Texte libre | Traduction IA requise |
| Description | `description` | Texte libre | Traduction IA requise |
| Photos | `caption` par photo (dans `listings.photos` jsonb) | Texte libre | Traduction IA requise |
| Chambres | `rooms.name` | **Texte libre** — champ éditable par le proprio (pré-rempli avec un libellé par défaut i18n type "Chambre 1", mais retapable librement) | Traduction IA requise — **gap non identifié avant l'investigation** |
| Chambres | Types de lit (`simple/double/queen/king/sofa_bed`) | Enum, libellés i18n (`BED_LABELS`) | Déjà bilingue, rien à faire |
| Caractéristiques | `amenities` (liste fermée) | Enum | Déjà bilingue **pour l'affichage public** (`lib/amenities.ts`, `getAmenityLabel(amenity, locale)` avec tableau parallèle `AMENITIES_EN`) — **mais le picker du dashboard (`AmenitiesPicker.tsx`) affiche toujours le libellé français au proprio**, même si son profil est en anglais. Petit gap UI, aucune traduction IA nécessaire (juste appeler `getAmenityLabel` dans le picker). |
| À proximité | `nearby_activities` (liste fermée) | Enum | **Gap réel, mais pas de texte libre** — contrairement aux caractéristiques, il n'existe **aucun tableau anglais parallèle** pour les activités individuelles ; seuls les en-têtes de catégorie (été/hiver/quatre saisons) sont traduits. Un visiteur EN voit les activités individuelles en français. Correctif = ajouter une table de traduction statique (`NEARBY_EN`, même pattern que `AMENITIES_EN`) — **aucun appel IA, aucune saisie proprio requise**, puisque la liste est fermée et connue à l'avance. |
| Tarifs | `price_low`, `price_on_request` | Numérique/booléen | Déjà bilingue (aucun texte libre) |
| Calendrier | Dates, URL iCal | Aucun texte | Déjà bilingue |
| Localisation | `region`, `city` (normalement structuré) | Structuré | Déjà bilingue — `address` est du texte libre mais **jamais affiché publiquement** (vérifié), donc hors scope. `city` a un rare mode de saisie manuelle libre ("Je ne trouve pas ma localité") pour les endroits non listés — cas marginal, laissé hors scope v1, à mentionner à Simon. |
| Infos générales | CITQ, heures, type d'arrivée, animaux, fumeur, âge min | Numérique/enum/booléen | Déjà bilingue |
| Promotions | Type, valeur, dates | Numérique/enum | Déjà bilingue (aucun texte libre) |

**Conclusion : 5 champs de texte libre nécessitent une vraie traduction IA** — titre, description, légende de photo, nom de chambre/salon, et (hors annonce) la bio proprio. Un seul autre gap bilingue existe (activités à proximité), mais il se résout par une table de traduction statique, pas par de l'IA.

### 1.2 Structure de données actuelle et changements de schéma nécessaires

**Découverte majeure : le schéma bilingue existe déjà en production, entièrement inutilisé.** La migration `supabase/i18n-migration.sql` a déjà été exécutée (confirmé en base, pas seulement dans le fichier SQL) et a ajouté :

- `listings.title_en TEXT`
- `listings.description_en TEXT`
- `listings.amenities_en JSONB`
- `listings.nearby_activities_en JSONB`
- `rooms.name_en TEXT`
- `users.bio_en TEXT`

**Aucune de ces colonnes n'est lue ou écrite nulle part dans le code**, à deux exceptions près (lecture seule) : `title_en`/`description_en` sont lus comme fallback d'affichage dans `app/chalets/[slug]/page.tsx`, et `title_en` est lu pour générer le slug anglais dans `app/api/listings/[id]/publish/route.ts`.

**Conséquence pour le plan : aucune nouvelle migration SQL n'est requise pour titre, description, nom de chambre et bio.** Il suffit de commencer à les remplir et les lire.

**Décision de Simon** : `amenities_en` et `nearby_activities_en` (colonnes par annonce) restent inutilisées — les caractéristiques sont déjà traduites via une table statique globale (`AMENITIES_EN`), pas par annonce ; les activités à proximité suivent la même logique (table statique globale `NEARBY_EN`) plutôt qu'une colonne jsonb à remplir par annonce. Ces deux colonnes restent en base sans être lues ni écrites (ce n'est pas un problème — elles ne gênent rien).

**Seul vrai changement de structure nécessaire : les légendes de photos.** `PhotoItem` (`lib/photo.ts`) est aujourd'hui :
```ts
export type PhotoItem = { url: string; caption: string; sizeMb?: number };
```
Il faut ajouter une clé `caption_en?: string` à l'intérieur de chaque objet du tableau JSON `listings.photos` (colonne déjà `jsonb`, donc **aucune migration SQL requise** — juste une évolution du type TypeScript et du code qui lit/écrit ces objets, en particulier `normalizePhotos()`).

### 1.3 Patterns existants à réutiliser

- **Rate limiting** (`lib/aiRateLimit.ts`) : 20 appels/heure/utilisateur, **un seul bucket partagé** entre 9 usages actuels (`generate-bio`, `generate-caption`, `generate-description`, `suggest-titles`, `listing-advice`, plus 2 routes mortes `generate-listing`/`improve-title`, plus 2 étapes internes de l'import Airbnb). Le paramètre `endpoint` sert uniquement à l'étiquetage/logging, pas à des buckets séparés.
- **Bouton IA "Générer" existant** : deux styles cohabitent déjà dans le projet — un bouton pilule (`border-primary/30 bg-primary/5 rounded-full`, utilisé pour Titre/Description dans `EditListingForm.tsx`) et un lien texte discret (`TEXT_LINK_CLASSNAME`, utilisé pour la bio dans `ProfileForm.tsx`). Un bouton "Traduire" doit suivre le même style que le bouton "Générer" déjà présent dans chaque contexte, pour rester cohérent.
- **Pattern d'attente longue** (import Airbnb) : pas un écran plein bloquant — juste le bouton de soumission qui se désactive, affiche un spinner, et fait défiler des messages de réassurance ("Récupération de l'annonce…", etc.) toutes les 22 secondes, avec une barre de progression animée sous le bouton. C'est la référence du projet pour "action longue déclenchée par un clic".

### 1.4 Points d'entrée de publication

Cinq emplacements indépendants peuvent mettre `listings.is_published = true`, **sans fonction partagée** aujourd'hui :
1. `app/api/listings/[id]/publish/route.ts` (publication par le proprio)
2. `app/api/admin/listings/[id]/publish/route.ts` (publication admin, imports Airbnb)
3. `app/api/subscriptions/activate-free/route.ts` (activation de l'offre de lancement)
4. `app/api/stripe/webhook/route.ts` (paiement Stripe réussi)
5. `app/dashboard/listings/[id]/publish/page.tsx` (page de redirection post-paiement, filet de sécurité redondant avec #4)

---

## Partie 2 — Décisions d'architecture

### 2.1 Endpoint IA générique de traduction (partagé entre annonce et profil)

Un seul nouvel endpoint, plutôt que de dupliquer la logique 5 fois :

**`POST /api/ai/translate`**
```ts
// Requête
{ text: string; sourceLang: "fr" | "en"; targetLang: "fr" | "en"; fieldType: "title" | "description" | "caption" | "roomName" | "bio" }
// Réponse succès
{ translation: string }
// Réponse erreur (429 si rate limit atteint, 400 si texte vide/trop long, 500 sinon)
{ error: string }
```
- Authentifié (comme tous les endpoints `/api/ai/*`), passe par `checkAiRateLimit(supabase, userId, "translate-listing")` (un seul tag, partagé avec les autres appels IA — voir décision 2.3 pour la nuance publication automatique).
- `fieldType` ajuste uniquement le prompt système envoyé à Sonnet (ex. garder le ton marketing pour titre/description, rester factuel et court pour un nom de chambre, garder le ton personnel à la première personne pour la bio) — un seul endpoint, prompts différenciés en interne.
- Limite de longueur d'entrée par `fieldType` (ex. 50 car. pour un titre, 2500 pour une description, 200 pour une légende, 300 pour la bio) — cohérent avec les limites déjà en place côté formulaire.

**Composant réutilisable côté client** : `components/dashboard/TranslateButton.tsx` (ou un hook `useTranslateField`), pris par chaque section (titre, description, légende, nom de chambre, bio) avec les mêmes props (texte source, langue source déduite de `preferred_language` du proprio, callback `onTranslated`). Suit le style bouton déjà en place dans chaque contexte (pilule pour titre/description, lien texte pour la bio, bouton icône pour les légendes — cohérent avec les boutons "Générer" déjà présents à ces mêmes endroits).

**Affichage FR/EN** : champ EN affiché sous le champ FR (ou l'inverse si `preferred_language` du proprio est `en`), jamais dans un onglet séparé caché — le proprio doit voir les deux d'un coup d'œil.

### 2.2 Traduction automatique à la publication — deux options, à trancher par Simon

**Option A — Bloquante (synchrone, avant la mise en ligne)**

Avant de faire passer `is_published` à `true`, vérifier les champs `_en` manquants (titre, description, chaque légende de photo, chaque nom de chambre) et les traduire un par un via Sonnet dans la même requête, puis publier seulement une fois tout traduit.

- ✅ Garantit qu'aucune annonce n'est jamais mise en ligne à moitié traduite — correspond littéralement à la demande ("traduire automatiquement avant la mise en ligne").
- ✅ Réutilise le pattern déjà en place (appels IA synchrones dans une requête, comme l'import Airbnb).
- ❌ Une annonce avec beaucoup de photos (ex. 20+ légendes) peut multiplier les appels Sonnet dans une seule requête — risque de dépasser la limite de 90 secondes déjà en place sur les routes similaires (import Airbnb).
- ❌ Consomme d'un coup plusieurs appels du quota de 20/heure partagé — un proprio qui publie une grosse annonce peut épuiser tout son quota IA de l'heure (voir 2.3), y compris pour ses autres annonces.
- ❌ Doit être branché individuellement sur les 5 points d'entrée de publication (aucune fonction partagée n'existe aujourd'hui) — risque d'oubli si un des 5 est manqué. **Implique de facto une tâche préalable de consolidation** (créer une fonction partagée `publishListing()` appelée par les 5 endroits, plutôt que de coller la même logique 5 fois).

**Option B — En arrière-plan (asynchrone, après la mise en ligne)**

Publier immédiatement comme aujourd'hui (rapide, comportement inchangé), puis traduire en tâche de fond (ex. un nouveau cron, sur le modèle des crons existants comme `subscription-reminders`/`expire-featured`, qui balaie les annonces publiées récemment avec des champs `_en` manquants et les traduit).

- ✅ Aucun changement au ressenti actuel du clic "Publier" — reste instantané.
- ✅ Aucun risque de timeout, même pour une grosse annonce.
- ✅ Peut avoir son propre plafond d'appels IA, complètement séparé du quota interactif de 20/heure du proprio (voir 2.3) — pas de conflit avec ses autres usages IA.
- ❌ Fenêtre courte (probablement quelques minutes) où un visiteur anglophone voit l'annonce fraîchement publiée encore en français — **mais c'est exactement le comportement actuel en permanence** (le fallback FR existe déjà et fonctionne), donc ce n'est pas une régression, juste une version temporaire du statu quo.
- ❌ Ajoute une nouvelle pièce d'infrastructure (le cron) à maintenir.

**Décision de Simon : Option B**, avec un ajout — un signal discret dans le dashboard (badge ou message) doit indiquer qu'une annonce publiée est en attente de traduction, pour que ce ne soit pas confus pour le proprio. Ce signal est **dérivé**, pas une nouvelle colonne de suivi : `is_published === true` ET au moins un des champs `_en` requis (titre, description, chaque légende, chaque nom de chambre) encore vide/manquant ⇒ badge "Traduction en cours" (ou équivalent EN). Dès que le cron a rempli tous les champs, le badge disparaît de lui-même, sans état à synchroniser.

### 2.3 Impact sur le rate limiting IA existant

Le bucket de 20 appels/heure/utilisateur est **déjà partagé entre 9 usages** avant même ce projet. Ajouter la traduction dessus a deux effets concrets :

1. **Bouton "Traduire" manuel** (interactif, déclenché par le proprio) : consomme le même quota que "Générer un titre"/"Générer une description"/"Générer une légende"/"Générer ma bio". Une seule annonce avec 10 photos à traduire manuellement (titre + description + 10 légendes + noms de chambres) peut à elle seule approcher ou dépasser 20 appels. **Décision de Simon : reste dans le bucket partagé existant** (cohérent avec le reste) — à surveiller, avec la possibilité de remonter le plafond global plus tard si ça devient gênant en pratique.
2. **Traduction automatique à la publication** (système, pas interactive) : **décision de Simon : exemptée du plafond interactif de 20/heure par utilisateur** — ce n'est pas un risque d'abus, c'est une action système déclenchée une fois par annonce. Le cron n'appelle pas `checkAiRateLimit` pour ces traductions (aucun `user_id` interactif à imputer de toute façon côté cron) ; un plafond global séparé au niveau du cron (ex. nombre max de champs traduits par exécution) reste une garde-fou raisonnable à discuter au moment de l'implémentation, mais aucun changement n'est fait à `lib/aiRateLimit.ts` lui-même.

---

## Partie 3 — Découpage en tâches

Tâches liées à **l'annonce** (1 à 6), puis tâches liées au **profil/bio** (7), indépendantes l'une de l'autre — la tâche 7 peut être faite avant, après, ou en parallèle des tâches 1-6.

### Task 1 — Infrastructure de traduction partagée
Créer `POST /api/ai/translate` (endpoint générique décrit en 2.1), le composant `TranslateButton.tsx`, et les clés de traduction nécessaires (labels de bouton, messages d'erreur) en FR/EN. Aucune section de la fiche n'est encore branchée dessus — tâche purement fondation, testable isolément (ex. via un appel direct à l'endpoint).

### Task 2 — Activités à proximité : table de traduction statique (sans IA)
Ajouter `NEARBY_EN` (tableau parallèle, même pattern que `AMENITIES_EN` dans `lib/amenities.ts`) et une fonction `getNearbyLabel(activity, locale)`, branchée sur l'affichage public (`app/chalets/[slug]/page.tsx`). Corriger au passage `AmenitiesPicker.tsx` pour utiliser `getAmenityLabel` côté dashboard (petit gap identifié en 1.1). Tâche indépendante, aucun appel IA, aucun changement de schéma.

### Task 3 — Titre bilingue
Champ EN sous le champ FR dans la section "Titre" de `EditListingForm.tsx`, bouton "Traduire" (via Tâche 1), écriture dans `title_en` (colonne déjà existante). L'affichage public utilise déjà le fallback `title_en`/`title` — vérifier qu'il fonctionne une fois la donnée réellement présente.

### Task 4 — Description bilingue
Même pattern que la tâche 3, pour `description`/`description_en`.

### Task 5 — Légendes de photos bilingues
Étendre `PhotoItem` (`lib/photo.ts`) avec `caption_en?: string`, mettre à jour `normalizePhotos()`. UI dans `PhotoUpload.tsx` : champ EN + bouton "Traduire" par photo — probablement replié/dépliable par photo pour ne pas surcharger la grille (5+ photos × 2 champs de légende serait dense). Vérifier et corriger l'affichage public des légendes (fichier non confirmé pendant l'investigation — probablement `components/chalets/PhotoGallery.tsx`, à vérifier en début de tâche) pour lire `caption_en` en anglais.

### Task 6 — Nom de chambre/salon bilingue
Champ `name_en` (colonne déjà existante sur `rooms`) + bouton "Traduire" dans `RoomsSection.tsx`. Vérifier et corriger l'affichage public du nom de chambre (probablement `components/chalets/RoomsCarousel.tsx`, à confirmer en début de tâche) pour lire `name_en` en anglais.

### Task 7 — Bio proprio bilingue (Profil, indépendant de l'annonce)
Champ `bio_en` (colonne déjà existante sur `users`) + bouton "Traduire" dans `ProfileForm.tsx`, à côté du bouton "Générer avec l'IA" déjà présent. Pas de mécanisme de publication à gérer (la bio n'est jamais "publiée" au sens d'une annonce). Vérifier et corriger l'affichage public de la bio (probablement `components/chalets/HostCard.tsx`, à confirmer en début de tâche) pour lire `bio_en` en anglais.

### Task 8 — Traduction automatique à la publication (cron, hors quota interactif) + badge dashboard
Dépend des tâches 3, 4, 5, 6 (les champs `_en` doivent déjà exister et être exploitables). Option B (arrière-plan) confirmée :
- Nouveau cron (ex. `app/api/cron/translate-listings/route.ts`, même convention que les crons existants — `CRON_SECRET`, entrée dans `vercel.json`) qui balaie les annonces `is_published = true` avec au moins un champ `_en` manquant (titre, description, légendes, noms de chambre) et les traduit via l'endpoint/la logique de la Tâche 1. N'appelle pas `checkAiRateLimit` (action système, pas interactive) — plafond propre au cron (ex. nombre max de champs traduits par exécution) à définir en implémentation.
- Badge/message discret dans le dashboard proprio (liste des annonces et/ou `EditListingForm.tsx`) affiché quand `is_published && (champ(s) _en requis manquant(s))` — dérivé à la volée, aucune nouvelle colonne de suivi. Disparaît automatiquement une fois le cron passé.

---

## Auto-révision

- **Couverture de la demande** : les 6 points de l'investigation demandée sont couverts (Partie 1), les 4 points d'architecture demandés sont couverts (Partie 2), le découpage en tâches distingue bien annonce (1-6, 8-9) et profil (7).
- **Aucun placeholder** : chaque tâche nomme les fichiers concernés et le changement exact ; les deux tâches encore conditionnelles (8 et 9) le sont explicitement parce qu'elles dépendent d'une décision produit de Simon, pas d'un oubli.
- **Cohérence des types** : `PhotoItem.caption_en`, `rooms.name_en`, `users.bio_en`, `listings.title_en`/`description_en` sont les mêmes noms partout où ils sont mentionnés.
