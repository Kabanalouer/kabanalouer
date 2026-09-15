# Branchement du pipeline d'import Airbnb Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire en sorte que le formulaire "J'ai déjà une annonce Airbnb" du dashboard (`/dashboard/listings/new`) déclenche réellement le pipeline Apify existant (`app/api/listings/import/route.ts`) au lieu d'insérer silencieusement une ligne dans `contact_messages`.

**Architecture:** Extraire la logique métier de `app/api/listings/import/route.ts` dans un module partagé `lib/listingImport.ts`, appelé directement (pas de HTTP self-call) par la route API existante ET par la Server Action du dashboard. Ajouter une garde anti-doublon dans ce module. Le formulaire public `/devenir-hote` reste volontairement un formulaire de capture de lead (voir "Décisions à valider" ci-dessous — il n'y a pas d'utilisateur authentifié à ce stade, donc pas de `host_id` pour créer un brouillon).

**Tech Stack:** Next.js 16 (App Router, Server Actions), Supabase (Postgres + service-role client), Apify (`tri_angle/airbnb-rooms-urls-scraper`), Anthropic SDK (réécriture IA de la description).

**Spec:** Ce document — issu de l'investigation du bug rapportée dans la conversation du 2026-09-15 (soumission `airbnb.fr` par `info@chaletauthentik.com`, 13:50:34 UTC, jamais traitée par le pipeline Apify).

## Global Constraints

- TypeScript strict, zéro erreur `npx tsc --noEmit` avant chaque commit.
- Pas de librairie de test unitaire dans ce projet (`package.json` : seul `@playwright/test` est présent, `"test": "playwright test"`) — ce plan n'introduit pas Vitest/Jest ; la vérification se fait via `tsc`, tests manuels (dev server, curl, requêtes Supabase directes) et Playwright si un scénario E2E existant touche cette page.
- Design system : olive `#636e40` uniquement, `rounded-full` pour les CTA, sentence case, pas d'emojis (voir CLAUDE.md).
- Toute écriture Supabase directe (hors code applicatif, ex. requêtes manuelles de vérification) requiert une approbation manuelle explicite (règle du projet, section 15 de CLAUDE.md).
- `git push` est en auto-allow pour ce projet, mais tout changement visuel doit être montré (capture/description) avant commit — ce plan ne touche l'UI que sur `NewListingStepZero.tsx` (Task 4), qui devra suivre cette règle au moment de l'exécution.

---

## Décisions à valider avant l'implémentation

Ces points changent la portée de la demande initiale ou introduisent un choix de conception non trivial — à confirmer avant que j'exécute le plan.

### Décision A — `/devenir-hote` NE sera PAS branché sur Apify (recommandation : garder tel quel)

Le formulaire public de `/devenir-hote` (`components/devenir-hote/CreationChoiceSection.tsx` → `app/devenir-hote/actions.ts`) est rempli par un **visiteur non connecté** (champs nom/courriel/lien — pas de session Supabase). Le vrai pipeline (`importAirbnbListing`, voir plus bas) exige un `userId` authentifié pour :
- attribuer `host_id` sur la ligne `listings` créée,
- appliquer le rate limit (`checkAiRateLimit` a besoin d'un `user_id`),
- vérifier le rôle (`host`/`admin`).

Brancher ce formulaire sur Apify demanderait donc de créer un compte automatiquement pour un visiteur anonyme — une fonctionnalité bien plus large que "brancher le pipeline", non demandée ici. **Recommandation : ne rien changer à `app/devenir-hote/actions.ts` ni à `CreationChoiceSection.tsx`.** Le formulaire reste une capture de lead (insertion `contact_messages` + email Resend à `simon.authentik@gmail.com`) — et cette notification par courriel n'est **pas redondante** : c'est le seul signal qui existe pour ce flux, puisqu'il n'y a jamais de ligne `listings` à voir apparaître dans `/admin/imports`. **Aucune tâche de code pour ce point dans ce plan.**

Si tu préfères plutôt rediriger ce visiteur vers `/signup?role=host` (comme le fait déjà la Carte 1 "Créer moi-même") avec le lien Airbnb pré-rempli en query param, pour qu'il complète l'import une fois son compte créé — dis-le-moi, c'est une piste raisonnable mais qui sort du périmètre de ce plan (nouveau flux de redirection + persistance du lien à travers l'inscription).

### Décision B — Consentement "droits sur les photos" : nouvelle case à cocher sur le formulaire dashboard (recommandation : l'ajouter)

`app/api/listings/import/route.ts` refuse toute requête où `photosRightsConfirmed !== true` (ligne 90-95 du fichier actuel). Le formulaire dashboard actuel (`NewListingStepZero.tsx`) n'a **aucune case à cocher** pour ça. Deux options :
1. **(Recommandé)** Ajouter une vraie case à cocher obligatoire au formulaire, avec le même texte de consentement que prévu à l'origine pour ce champ — cohérent avec le fait que la colonne existe précisément pour cette raison légale/éthique (réutilisation de photos qui ne t'appartiennent pas).
2. Passer `true` en dur sans case à cocher — plus rapide à livrer, mais supprime silencieusement une étape de consentement qui existe pour une bonne raison.

Ce plan implémente l'option 1 (Task 4). Dis-moi si tu préfères l'option 2.

### Décision C — Doublons : garde anti-doublon ajoutée au pipeline partagé (recommandation : l'ajouter, périmètre par propriétaire)

Le pipeline actuel (`route.ts`) ne vérifie **jamais** si une annonce a déjà été importée avant de relancer Apify et de créer une nouvelle ligne `listings`. Comme il n'était appelé par aucune UI, ce risque ne s'était jamais matérialisé. Une fois branché à un vrai formulaire, un double-clic ou une nouvelle soumission du même lien (le formulaire n'empêchait déjà rien côté serveur) créerait deux brouillons distincts dans `/admin/imports`.

**Recommandation :** avant d'appeler Apify, vérifier si une ligne `listings` existe déjà pour ce `host_id` avec la même URL normalisée (domaine + chemin, sans les paramètres de requête — un lien avec des dates de séjour différentes reste la même annonce). Si trouvée, ne pas relancer Apify (économie de crédits) et renvoyer directement l'annonce existante avec un état "déjà importée" distinct du succès normal.

**Hors périmètre volontaire :** détecter qu'un même lien Airbnb est importé par **deux comptes différents** (usurpation d'annonce) — problème différent (vérification de propriété), pas traité ici.

### Décision D — Message de succès et temps d'attente (recommandation : nouveau texte ci-dessous)

Le pipeline réel prend jusqu'à ~60-90 secondes (appel Apify synchrone + polling). Le texte actuel du bouton ("Envoi en cours…") et le message de succès ("On s'occupe de tout — vous recevrez votre annonce par email dans 24h") datent du flux `contact_messages` (traitement manuel différé). Nouveau texte proposé (Task 4) :
- Bouton en attente : *"Import en cours (jusqu'à une minute)…"*
- Succès : *"Annonce importée ! Elle est en révision — comptez généralement 24h avant sa publication."* + lien direct *"Voir le brouillon →"* vers `/dashboard/listings/{id}/edit` (au lieu du lien générique vers `/dashboard/listings`).
- Doublon : *"Vous avez déjà importé cette annonce."* + même lien vers le brouillon existant.

Le "24h" reste vrai, mais change de sens : ce n'est plus un délai technique, c'est le délai de révision manuelle par toi (`/admin/imports` → "Publier au nom du propriétaire"). Dis-moi si cette formulation te convient ou si tu préfères une autre.

---

## Réponses aux 6 points demandés (résumé)

1. **`submitImportRequest` (dashboard)** → appelle directement `importAirbnbListing()` (fonction partagée, pas de fetch HTTP vers sa propre route — voir Fichiers ci-dessous), garde `detectImportPlatform` intact dans `lib/apify.ts` (aucun changement, il est déjà correct — accepte `airbnb.fr` et toute variante régionale à 2 lettres).
2. **`app/devenir-hote/actions.ts`** → aucun changement de code (Décision A). L'email Resend existant reste, car il n'est pas redondant pour ce flux.
3. **Rate limiting** → `checkAiRateLimit` (`lib/aiRateLimit.ts`) compte **toutes** les lignes de `ai_usage_log` pour un utilisateur sur 1h, **sans filtrer par `endpoint`** (le paramètre `endpoint` n'est utilisé que pour le log, jamais dans la requête `WHERE`). C'est donc déjà un bucket global partagé par tous les appels IA (suggestions de titre, description, bio, conseils, ET l'import). Le formulaire dashboard, une fois branché, hérite automatiquement de cette même limite partagée — aucun code à ajouter pour ce point. Le formulaire `/devenir-hote` n'appelle jamais cette fonction (pas d'utilisateur authentifié), donc pas de partage à gérer là.
4. **Message de succès** → voir Décision D.
5. **Ligne de test existante dans `contact_messages`** (2026-09-15 13:50:34 UTC) → **aucune migration automatique**. C'est une donnée de test historique (comme celles déjà notées section 11 de CLAUDE.md) — la laisser telle quelle. Une fois ce plan déployé, le test naturel est de ressoumettre le même lien `airbnb.fr` via le nouveau formulaire pour valider le pipeline de bout en bout.
6. **Doublons** → voir Décision C.

---

## File Structure

```
lib/
  listingImport.ts          [NOUVEAU] logique métier partagée (Task 1, 2)
  apify.ts                   [inchangé] détection de plateforme déjà correcte
app/
  api/listings/import/route.ts        [MODIFIÉ] devient un mince wrapper HTTP (Task 1)
  dashboard/listings/new/
    actions.ts                        [MODIFIÉ] submitImportRequest appelle le pipeline réel (Task 3)
    page.tsx                          [MODIFIÉ] ajoute maxDuration = 90 (Task 5)
components/dashboard/
  NewListingStepZero.tsx     [MODIFIÉ] case à cocher, textes, lien vers le brouillon (Task 4)
CLAUDE.md                    [MODIFIÉ] documentation section 9 (Task 6)
```

---

## Task 1: Extraire la logique d'import dans `lib/listingImport.ts` (refactor pur, aucun changement de comportement)

**Files:**
- Create: `lib/listingImport.ts`
- Modify: `app/api/listings/import/route.ts`

**Interfaces:**
- Produces: `importAirbnbListing(supabase, userId, rawUrl): Promise<ImportOutcome>` où
  ```ts
  export type ImportOutcome =
    | { ok: true; status: "created"; listingId: string; aiRewriteApplied: boolean }
    | { ok: false; status: number; error: string };
  ```
  (le statut `"duplicate"` est ajouté à la Task 2, pas ici — ce refactor ne change aucun comportement observable)

- [ ] **Step 1 : Créer `lib/listingImport.ts` avec la logique copiée telle quelle depuis `route.ts`**

```ts
import Anthropic from "@anthropic-ai/sdk";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { checkAiRateLimit } from "@/lib/aiRateLimit";
import { cleanDescription, truncateToLastSentence } from "@/lib/aiText";
import { detectImportPlatform, runApifyActor, ApifyImportError } from "@/lib/apify";
import { mapAirbnbItem, type ImportedListingData } from "@/lib/listingImportMapping";
import { sendImportReviewNotification } from "@/lib/emails/importNotification";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const AIRBNB_ACTOR = "tri_angle/airbnb-rooms-urls-scraper";
const APIFY_TIMEOUT_MS = 60000;

export type ImportOutcome =
  | { ok: true; status: "created"; listingId: string; aiRewriteApplied: boolean }
  | { ok: false; status: number; error: string };

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const REWRITE_SYSTEM_PROMPT =
  "Tu es une experte en rédaction d'annonces de location touristique au Québec ET spécialiste en référencement (SEO). " +
  "On te donne les données brutes d'une annonce importée depuis Airbnb — ta tâche est d'écrire une description " +
  "originale pour Kabanalouer, pas de recopier le texte source. " +
  "Mets en valeur tous les équipements distinctifs mentionnés (piscine, spa, cuisine extérieure, table de billard, foyer, etc.). " +
  "Intègre naturellement le nom du chalet, la ville et la région dans le texte, pour le référencement. " +
  "Tu rédiges en français québécois, avec un ton chaleureux et professionnel. Pas d'emojis. Sentence case. " +
  "N'utilise jamais le mot \"hôte\" — dis \"propriétaire\". Ne tutoie jamais le voyageur, utilise \"vous\". " +
  "La description est utilisée comme meta description sur Google — les 160 premiers caractères doivent contenir " +
  "les mots-clés principaux (type de chalet, région, équipements phares) de façon naturelle.";

function buildRewriteUserMessage(data: ImportedListingData): string {
  const lines = [
    data.title ? `Titre original : ${data.title}` : null,
    data.region ? `Région : ${data.region}` : null,
    data.city ? `Ville : ${data.city}` : null,
    data.capacity ? `Capacité : ${data.capacity} personnes` : null,
    data.bedrooms ? `Chambres : ${data.bedrooms}` : null,
    data.bathrooms ? `Salles de bain : ${data.bathrooms}` : null,
    data.amenities.length > 0 ? `Équipements reconnus : ${data.amenities.join(", ")}` : null,
    data.rawAmenities.length > 0 ? `Autres équipements mentionnés : ${data.rawAmenities.join(", ")}` : null,
    data.priceLow ? `Prix : à partir de ${data.priceLow} $/nuit` : null,
    data.description ? `Description originale (source, ne pas copier) :\n${data.description}` : null,
  ].filter(Boolean);

  return (
    "Génère une description complète pour cette annonce de chalet importée. Retourne UNIQUEMENT le texte de la " +
    "description, sans titre, sans en-tête, sans label, sans section, sans markdown, sans astérisques, sans dièse (#). " +
    "Commence directement par la première phrase. CONTRAINTE ABSOLUE : la description doit faire STRICTEMENT moins de " +
    "2500 caractères, espaces compris. Arrête-toi à une phrase complète avant la limite. Commence par une phrase " +
    "d'accroche forte.\n\nContexte :\n" + lines.join("\n")
  );
}

async function rewriteDescription(data: ImportedListingData): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: [{ type: "text", text: REWRITE_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: buildRewriteUserMessage(data) }],
    });
    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    if (!raw) return null;
    return truncateToLastSentence(cleanDescription(raw), 2500);
  } catch (err) {
    console.error("listingImport: échec réécriture IA", err);
    return null;
  }
}

export async function importAirbnbListing(
  supabase: SupabaseServerClient,
  userId: string,
  rawUrl: string
): Promise<ImportOutcome> {
  const platform = detectImportPlatform(rawUrl);
  if (!platform) {
    return { ok: false, status: 400, error: "Lien non reconnu — seules les annonces Airbnb peuvent être importées pour l'instant" };
  }
  if (platform === "vrbo") {
    return { ok: false, status: 400, error: "L'import depuis VRBO n'est pas encore disponible, seul Airbnb est supporté pour l'instant." };
  }

  const { data: profile } = await supabase.from("users").select("role").eq("id", userId).single();
  if (profile?.role !== "host" && profile?.role !== "admin") {
    return { ok: false, status: 403, error: "Accès réservé aux propriétaires" };
  }

  if (!(await checkAiRateLimit(supabase, userId, "listings-import-apify"))) {
    return { ok: false, status: 429, error: "Vous avez atteint la limite de 20 imports par heure. Réessayez plus tard." };
  }

  const admin = adminSupabase();

  let items: unknown[];
  try {
    const checkIn = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const checkOut = new Date(checkIn.getTime() + 2 * 24 * 60 * 60 * 1000);
    items = await runApifyActor(
      AIRBNB_ACTOR,
      {
        startUrls: [{ url: rawUrl }],
        locale: "fr-CA",
        currency: "CAD",
        checkIn: checkIn.toISOString().slice(0, 10),
        checkOut: checkOut.toISOString().slice(0, 10),
      },
      APIFY_TIMEOUT_MS
    );
  } catch (err) {
    const message = err instanceof ApifyImportError ? err.message : "Échec de l'extraction des données de l'annonce";
    console.error("listingImport: échec Apify", err);
    return { ok: false, status: 502, error: message };
  }

  const firstItem = items?.[0];
  if (!firstItem || typeof firstItem !== "object") {
    return { ok: false, status: 502, error: "Aucune donnée n'a pu être extraite de ce lien. Vérifiez qu'il s'agit bien d'une annonce publique." };
  }

  const mapped = mapAirbnbItem(firstItem as Record<string, unknown>);

  const { data: listing, error: insertError } = await admin
    .from("listings")
    .insert({
      host_id: userId,
      title: mapped.title,
      description: mapped.description,
      photos: mapped.photos,
      capacity: mapped.capacity ?? undefined,
      bedrooms: mapped.bedrooms ?? undefined,
      bathrooms: mapped.bathrooms ?? undefined,
      amenities: mapped.amenities,
      city: mapped.city,
      region: mapped.region,
      latitude: mapped.latitude,
      longitude: mapped.longitude,
      price_low: mapped.priceLow,
      is_published: false,
      import_source: platform,
      import_source_url: rawUrl,
      import_status: "pending_review",
      photos_rights_confirmed: true,
      import_raw_data: {
        rawAmenities: mapped.rawAmenities,
        rawRegionCandidate: mapped.rawRegionCandidate,
        scrapedItem: firstItem,
      },
    })
    .select("id")
    .single();

  if (insertError || !listing) {
    console.error("listingImport: échec insert listings", insertError);
    return { ok: false, status: 500, error: "Échec de la création de l'annonce importée" };
  }

  try {
    const { data: hostProfile } = await admin.from("users").select("name").eq("id", userId).single();
    const { error: notifError } = await sendImportReviewNotification({
      listingId: listing.id,
      listingTitle: mapped.title || "Annonce sans titre",
      platform,
      hostName: hostProfile?.name?.trim() || "un propriétaire",
    });
    if (notifError) {
      console.error("listingImport: échec envoi notification admin", notifError);
    }
  } catch (err) {
    console.error("listingImport: échec envoi notification admin", err);
  }

  let aiRewriteApplied = false;
  if (await checkAiRateLimit(supabase, userId, "listings-import")) {
    const rewritten = await rewriteDescription(mapped);
    if (rewritten) {
      const { error: updateError } = await admin
        .from("listings")
        .update({ description: rewritten })
        .eq("id", listing.id);
      if (updateError) {
        console.error("listingImport: échec update description IA", updateError);
      } else {
        aiRewriteApplied = true;
      }
    }
  }

  return { ok: true, status: "created", listingId: listing.id, aiRewriteApplied };
}
```

- [ ] **Step 2 : Réécrire `app/api/listings/import/route.ts` comme un mince wrapper**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { importAirbnbListing } from "@/lib/listingImport";

// L'attente Apify seule peut prendre jusqu'à ~60s (voir lib/apify.ts) — laisse
// de la marge pour l'appel IA et les écritures qui suivent.
export const maxDuration = 90;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { url, photosRightsConfirmed } = await request.json().catch(() => ({}));

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Lien d'annonce requis" }, { status: 400 });
  }
  if (photosRightsConfirmed !== true) {
    return NextResponse.json(
      { error: "Vous devez confirmer détenir les droits sur les photos avant d'importer une annonce" },
      { status: 400 }
    );
  }

  const outcome = await importAirbnbListing(supabase, user.id, url);
  if (!outcome.ok) {
    return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  }

  return NextResponse.json(
    { listingId: outcome.listingId, aiRewriteApplied: outcome.aiRewriteApplied },
    { status: 201 }
  );
}
```

- [ ] **Step 3 : Vérifier TypeScript**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 4 : Vérification manuelle que le comportement de la route n'a pas changé**

Cette route n'a aucun appelant en production actuellement (confirmé par grep exhaustif pendant l'investigation), donc ce test peut se faire librement sans risque pour un vrai utilisateur. Démarrer le serveur de dev, se connecter avec le compte de test proprio (`info@chaletauthentik.com`), puis :

```bash
curl -X POST http://localhost:3000/api/listings/import \
  -H "Content-Type: application/json" \
  -H "Cookie: <cookies de session récupérés du navigateur>" \
  -d '{"url": "https://www.chaletsauquebec.com/", "photosRightsConfirmed": true}'
```

Expected: `400` avec `{"error":"Lien non reconnu — seules les annonces Airbnb peuvent être importées pour l'instant"}` (comportement identique à avant le refactor — ce test ne coûte aucun crédit Apify puisqu'il échoue avant l'appel Apify).

- [ ] **Step 5 : Commit**

```bash
git add lib/listingImport.ts app/api/listings/import/route.ts
git commit -m "refactor: extraire la logique d'import Airbnb dans lib/listingImport.ts"
```

---

## Task 2: Ajouter la garde anti-doublon (Décision C)

**Files:**
- Modify: `lib/listingImport.ts`

**Interfaces:**
- Consumes: rien de nouveau (même fichier que Task 1)
- Produces: `ImportOutcome` gagne une troisième variante :
  ```ts
  export type ImportOutcome =
    | { ok: true; status: "created"; listingId: string; aiRewriteApplied: boolean }
    | { ok: true; status: "duplicate"; listingId: string }
    | { ok: false; status: number; error: string };
  ```
  et une nouvelle fonction exportée `normalizeListingUrl(url: string): string`

- [ ] **Step 1 : Ajouter `normalizeListingUrl` et la variante `duplicate` au type `ImportOutcome`**

```ts
export type ImportOutcome =
  | { ok: true; status: "created"; listingId: string; aiRewriteApplied: boolean }
  | { ok: true; status: "duplicate"; listingId: string }
  | { ok: false; status: number; error: string };

// Ignore la casse et les paramètres de requête (dates de séjour, nombre
// d'adultes, etc. — voir le lien airbnb.fr testé le 2026-09-15, qui en
// portait plusieurs) : seul le domaine + le chemin identifient l'annonce.
export function normalizeListingUrl(url: string): string {
  const u = new URL(url);
  return `${u.hostname.toLowerCase()}${u.pathname.replace(/\/+$/, "")}`;
}
```

- [ ] **Step 2 : Insérer la vérification de doublon juste après le contrôle de rôle, avant le rate limit**

Dans `importAirbnbListing`, entre le bloc `if (profile?.role !== "host" ...)` et le bloc `if (!(await checkAiRateLimit(...` :

```ts
  const admin = adminSupabase();
  const normalizedUrl = normalizeListingUrl(rawUrl);

  // Défense contre les doubles soumissions (double-clic, nouvelle tentative
  // après un délai perçu comme un échec) — évite un deuxième brouillon et un
  // appel Apify gaspillé pour une annonce déjà importée par ce propriétaire.
  const { data: existingRows } = await admin
    .from("listings")
    .select("id, import_source_url")
    .eq("host_id", userId)
    .eq("import_source", platform);
  const duplicate = (existingRows ?? []).find(
    (row) => row.import_source_url && normalizeListingUrl(row.import_source_url) === normalizedUrl
  );
  if (duplicate) {
    return { ok: true, status: "duplicate", listingId: duplicate.id };
  }
```

(Retirer la ligne `const admin = adminSupabase();` qui existait plus bas juste avant le bloc Apify — elle est maintenant déclarée ici, plus haut dans la fonction.)

- [ ] **Step 3 : Vérifier TypeScript**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 4 : Vérifier la garde anti-doublon sans dépenser de crédit Apify**

Insérer une ligne `listings` de test directement en SQL (via le MCP Supabase, avec confirmation manuelle explicite puisque c'est une écriture directe) :

```sql
insert into listings (host_id, title, is_published, import_source, import_source_url, import_status)
values ('<user_id du compte de test proprio>', 'Test doublon', false, 'airbnb',
        'https://www.airbnb.fr/rooms/951978619930862907?adults=15', 'pending_review')
returning id;
```

Puis appeler `POST /api/listings/import` avec la même URL mais des paramètres de requête différents (ex. `?adults=2&check_in=2027-01-01`) et vérifier que la réponse est `200` avec `{"listingId": "<id de la ligne insérée ci-dessus>"}`, **sans** nouvel appel Apify (vérifiable via l'absence de nouvelle entrée Apify dans le tableau de bord Apify, ou simplement par le temps de réponse quasi instantané au lieu de ~10-60s).

Nettoyer la ligne de test après vérification (`DELETE FROM listings WHERE id = '<id>'`, avec confirmation manuelle).

- [ ] **Step 5 : Commit**

```bash
git add lib/listingImport.ts
git commit -m "feat: ajoute une garde anti-doublon au pipeline d'import Airbnb"
```

---

## Task 3: Brancher `submitImportRequest` (dashboard) sur le pipeline réel

**Files:**
- Modify: `app/dashboard/listings/new/actions.ts`

**Interfaces:**
- Consumes: `importAirbnbListing(supabase, userId, url): Promise<ImportOutcome>` (Task 1+2)
- Produces:
  ```ts
  export type ImportState =
    | { status: "idle" }
    | { status: "success"; listingId: string }
    | { status: "duplicate"; listingId: string }
    | { status: "error"; message: string };
  ```
  (consommé par `NewListingStepZero.tsx`, Task 4 — les noms `success`/`duplicate`/`error`/`listingId`/`message` doivent rester identiques)

- [ ] **Step 1 : Réécrire `submitImportRequest` et retirer l'import de `contact_messages`**

```ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { importAirbnbListing } from "@/lib/listingImport";

export async function createBlankListing() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("listings")
    .insert({
      host_id: user.id,
      title: "",
      description: "",
      is_published: false,
      capacity: 4,
      bedrooms: 2,
      bathrooms: 1,
      price_low: 0,
      price_high: 0,
      price_peak: 0,
      amenities: [],
      photos: [],
      checkin_time: "16:00",
      checkout_time: "11:00",
      pets_allowed: false,
      smoking_allowed: false,
      checkin_type: "autonomous",
      nearby_activities: [],
      price_on_request: false,
    })
    .select("id")
    .single();

  if (error || !data) redirect("/dashboard/listings");

  redirect(`/dashboard/listings/${data.id}/edit`);
}

export type ImportState =
  | { status: "idle" }
  | { status: "success"; listingId: string }
  | { status: "duplicate"; listingId: string }
  | { status: "error"; message: string };

export async function submitImportRequest(
  _prev: ImportState,
  formData: FormData
): Promise<ImportState> {
  const listingUrl = (formData.get("listing_url") as string | null)?.trim() ?? "";
  const photosRightsConfirmed = formData.get("photos_rights_confirmed") === "on";

  if (!listingUrl) {
    return { status: "error", message: "Veuillez coller le lien de votre annonce." };
  }
  try {
    new URL(listingUrl);
  } catch {
    return { status: "error", message: "Le lien n'est pas valide." };
  }
  if (!photosRightsConfirmed) {
    return { status: "error", message: "Vous devez confirmer détenir les droits sur les photos de cette annonce." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Session expirée, veuillez vous reconnecter." };

  const outcome = await importAirbnbListing(supabase, user.id, listingUrl);

  if (!outcome.ok) {
    return { status: "error", message: outcome.error };
  }
  if (outcome.status === "duplicate") {
    return { status: "duplicate", listingId: outcome.listingId };
  }
  return { status: "success", listingId: outcome.listingId };
}
```

- [ ] **Step 2 : Vérifier TypeScript**

Run: `npx tsc --noEmit`
Expected: erreurs attendues dans `components/dashboard/NewListingStepZero.tsx` (le type `ImportState` a changé de forme) — normal, corrigé à la Task 4. Confirmer que `app/dashboard/listings/new/actions.ts` lui-même compile sans erreur.

- [ ] **Step 3 : Commit**

```bash
git add app/dashboard/listings/new/actions.ts
git commit -m "feat: submitImportRequest appelle le vrai pipeline d'import Airbnb"
```

(Ce commit laisse `tsc` en échec sur `NewListingStepZero.tsx` — attendu, corrigé à la Task 4 dans la foulée avant tout push.)

---

## Task 4: Mettre à jour `NewListingStepZero.tsx` (case à cocher, textes, lien vers le brouillon)

**Files:**
- Modify: `components/dashboard/NewListingStepZero.tsx`

**Interfaces:**
- Consumes: `ImportState` avec `status: "idle" | "success" | "duplicate" | "error"`, `listingId` sur les branches `success`/`duplicate`, `message` sur `error` (Task 3)

- [ ] **Step 1 : Remplacer le bloc de succès pour gérer aussi le cas "duplicate", avec lien vers le brouillon**

```tsx
  if (state.status === "success" || state.status === "duplicate") {
    const isDuplicate = state.status === "duplicate";
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-charcoal-800 mb-3">
          {isDuplicate ? "Déjà importée" : "Annonce importée"}
        </h2>
        <p className="text-charcoal-500 leading-relaxed mb-8">
          {isDuplicate
            ? "Vous avez déjà importé cette annonce."
            : "Elle est en révision — comptez généralement 24h avant sa publication."}
        </p>
        <Link
          href={`/dashboard/listings/${state.listingId}/edit`}
          className="inline-flex items-center gap-2 bg-primary text-white font-bold px-7 py-3.5 rounded-full hover:bg-primary/90 transition-colors text-sm"
        >
          Voir le brouillon →
        </Link>
      </div>
    );
  }
```

- [ ] **Step 2 : Ajouter la case à cocher de consentement dans le formulaire d'import, avant le bouton d'envoi**

Remplacer le bloc du formulaire de la Carte 2 :

```tsx
          <form action={importAction} className="space-y-3 mt-auto">
            <div>
              <label htmlFor="listing-url" className="block text-sm font-medium text-charcoal-700 mb-1.5">
                Lien de votre annonce
              </label>
              <input
                id="listing-url"
                name="listing_url"
                type="url"
                required
                placeholder="https://www.airbnb.ca/rooms/..."
                className={inputCls}
              />
            </div>
            <label className="flex items-start gap-2.5 text-sm text-charcoal-600 cursor-pointer">
              <input
                type="checkbox"
                name="photos_rights_confirmed"
                required
                className="mt-0.5 w-4 h-4 rounded border-[#ebebeb] text-primary focus:ring-primary/30 shrink-0"
              />
              <span>Je confirme détenir les droits sur les photos de cette annonce.</span>
            </label>
            {state.status === "error" && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                {state.message}
              </p>
            )}
            <button
              type="submit"
              disabled={isPending}
              className="w-full inline-flex items-center justify-center gap-2 border border-primary text-primary font-bold px-6 py-3.5 rounded-full hover:bg-primary/5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
            >
              {isPending ? "Import en cours (jusqu'à une minute)…" : "Envoyer →"}
            </button>
          </form>
```

(`required` sur une case à cocher HTML bloque nativement la soumission tant qu'elle n'est pas cochée — aucun état React supplémentaire nécessaire.)

- [ ] **Step 3 : Vérifier TypeScript**

Run: `npx tsc --noEmit`
Expected: aucune erreur (les deux fichiers Task 3 + Task 4 sont maintenant cohérents).

- [ ] **Step 4 : Aperçu visuel avant commit (règle du projet — tout changement UI)**

Démarrer le serveur de dev, visiter `/dashboard/listings/new` connecté avec `info@chaletauthentik.com`, vérifier visuellement : la case à cocher apparaît sous le champ URL, le bouton reste désactivé tant qu'elle n'est pas cochée, le texte du bouton en attente est correct. Montrer une capture avant de committer (comme pour les changements précédents de ce fichier).

- [ ] **Step 5 : Commit**

```bash
git add components/dashboard/NewListingStepZero.tsx
git commit -m "feat: case de consentement photos + nouveaux messages d'import Airbnb"
```

---

## Task 5: `maxDuration` sur la page (Server Actions héritent du segment, pas du fichier actions.ts)

**Files:**
- Modify: `app/dashboard/listings/new/page.tsx`

**Interfaces:** aucune (config de route uniquement)

- [ ] **Step 1 : Ajouter l'export `maxDuration`**

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NewListingStepZero from "@/components/dashboard/NewListingStepZero";

export const metadata = { title: "Nouveau chalet" };

// Une Server Action hérite de la config de timeout de la route qui l'a
// invoquée, pas de son propre fichier — même contrainte que
// app/api/listings/import/route.ts (l'appel Apify seul peut prendre ~60s).
export const maxDuration = 90;

export default async function NewListingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="max-w-3xl">
      <NewListingStepZero />
    </div>
  );
}
```

- [ ] **Step 2 : Vérifier TypeScript**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 3 : Test de bout en bout réel (coûte un vrai crédit Apify — à faire une seule fois, coordonné avec Simon)**

Soumettre le lien `airbnb.fr` déjà testé le 2026-09-15 (`https://www.airbnb.fr/rooms/951978619930862907`) via le formulaire réel sur `/dashboard/listings/new`, case cochée. Vérifier :
- la ligne apparaît dans `/admin/imports`,
- le courriel de notification admin part bien (`sendImportReviewNotification`),
- le brouillon est accessible et cohérent via le lien "Voir le brouillon →".

- [ ] **Step 4 : Commit**

```bash
git add app/dashboard/listings/new/page.tsx
git commit -m "fix: maxDuration=90 sur la page pour laisser le temps au pipeline Apify"
```

---

## Task 6: Documenter dans CLAUDE.md

**Files:**
- Modify: `CLAUDE.md` (section 9, sous-section "Import d'annonces depuis Airbnb")

- [ ] **Step 1 : Ajouter une note factuelle après la description existante de la route `/api/listings/import`**

```markdown
- **Bug critique trouvé et corrigé le 2026-09-15** : la route `/api/listings/import` (Apify) n'était appelée par **aucune** UI — ni le formulaire dashboard (`/dashboard/listings/new`), ni la page publique (`/devenir-hote`). Les deux inséraient silencieusement dans `contact_messages` et affichaient un succès inconditionnel, sans jamais déclencher Apify ni créer de brouillon. Logique métier extraite dans `lib/listingImport.ts` (partagée entre la route et la Server Action du dashboard), avec ajout d'une garde anti-doublon (`normalizeListingUrl`, par `host_id` + URL normalisée). Le formulaire `/devenir-hote` reste volontairement un formulaire de capture de lead (email Resend à Simon) — un visiteur non connecté n'a pas de `host_id` pour créer un brouillon.
- **Case de consentement photos ajoutée** au formulaire dashboard (`photos_rights_confirmed`) — la route l'exigeait déjà (`photosRightsConfirmed !== true` → 400) mais aucun champ ne l'alimentait jusqu'ici.
```

- [ ] **Step 2 : Commit**

```bash
git add CLAUDE.md
git commit -m "docs: documente le branchement du pipeline d'import Airbnb"
```

---

## Self-Review

**1. Couverture des 6 points demandés :**
1. Dashboard branché sur le vrai pipeline ✓ (Task 1, 3), `detectImportPlatform` intact ✓ (aucune modification à `lib/apify.ts`).
2. `/devenir-hote` : décision explicite de ne pas le brancher, argumentée (Décision A), notification Resend conservée.
3. Rate limiting : comportement du bucket partagé documenté (Réponse au point 3), aucun code nécessaire.
4. Message de succès : nouveau texte conditionnel proposé (Décision D, Task 4).
5. Ligne de test existante : aucune migration, re-test manuel recommandé (Task 5, Step 3).
6. Doublons : garde ajoutée (Task 2), portée limitée au même `host_id` documentée comme choix assumé.

**2. Scan de placeholders :** aucun "TBD"/"à implémenter plus tard" — chaque step contient le code exact ou la commande exacte à exécuter.

**3. Cohérence des types :** `ImportOutcome` (Task 1 → 2), `ImportState` (Task 3 → 4) — noms de champs (`listingId`, `message`, `status`) vérifiés identiques entre le producteur (`actions.ts`) et le consommateur (`NewListingStepZero.tsx`).
