# Kabanalouer — Session 6 — 4 juillet 2026

## Résumé de la session

Session consacrée à trois chantiers distincts : correction de bugs responsive restants, finalisation du branding Stripe sur les documents clients, et un premier audit SEO/GEO complet du site (technique, contenu, traductions FR/EN) avec correction immédiate des bugs critiques trouvés.

---

## 1. Bugs responsive corrigés et déployés

Deux bugs visuels corrigés et poussés en production :

- **Logo masqué par la barre de recherche entre 768px et 1279px** (tablette) — commit `1c44d86` : "fix: résout le chevauchement du logo par la barre de recherche entre 768px et 1279px"
- **Hero mobile mal centré** (badge, H1, moteur de recherche) — commit `8052bd8` : "fix: centre verticalement le hero mobile (badge, H1, moteur de recherche)"

Ces deux corrections précèdent le reste de la session (faites en tout début de journée).

---

## 2. Branding Stripe complet — appliqué, mais reçus bloqués

Le branding (logo, couleurs olive `#636e40` / coral `#f04e45`) a été appliqué avec succès dans le Dashboard Stripe et vérifié fonctionnel sur :
- **Checkout** (page de paiement)
- **Facture**
- **Reçus**
- **Portail client** (gestion d'abonnement)

Le webhook et le réglage "Paiements réussis" (Paramètres → Entreprise → E-mails client) sont également correctement configurés. Tout ceci a été **testé et confirmé via un paiement complet de bout en bout** avec la carte de test `4242 4242 4242 4242` sur le compte `info@chaletauthentik.com`.

### Point en suspens — reçus bloqués tant que le compte n'est pas activé

Stripe refuse d'envoyer un reçu à une **vraie** adresse cliente tant que le compte n'est pas **"activé"** (informations d'entreprise soumises et vérifiées par Stripe) — même en mode Test, l'envoi est limité à l'adresse du propriétaire du compte (`simon.authentik@gmail.com`).

**À reprendre une fois le statut fiscal de Simon confirmé** (NEQ vs travailleur autonome — voir aussi session 5) et le compte Stripe activé en conséquence.

---

## 3. Installation du plugin `claude-seo` et premier audit complet

### Installation
Plugin `claude-seo` installé (skills `/seo`, `/seo audit`, etc.) pour l'audit SEO, technique, contenu, schema, performance, et GEO (visibilité IA/ChatGPT/Perplexity).

### Premier audit — `/seo audit https://kabanalouer.ca`

Audit complet livré dans `/Users/simonlemay/kabanalouer.ca-audit/` (rapport, plan d'action, PDF, captures d'écran). Score de santé SEO initial : **66/100**.

**Bug critique découvert** : le `canonical`, le `sitemap.xml`, les balises `hreflang`, `og:url`, le schema JSON-LD (WebSite/Organization) **et** le fichier `llms.txt` pointaient **tous** vers `kabanalouer.vercel.app` au lieu du domaine de production `kabanalouer.ca` — sur la quasi-totalité du site (accueil, pages régions, pages villes, fiches chalets, pages statiques, emails transactionnels d'avis).

**Cause identifiée** : la chaîne `"https://kabanalouer.vercel.app"` était codée en dur dans plus de 20 endroits du code (pas une variable d'environnement mal réglée — `NEXT_PUBLIC_APP_URL` était pourtant correctement configurée à `https://kabanalouer.ca` dans Vercel, mais presque personne ne la lisait).

**Correctif appliqué** (commit `b8693f6`) :
- Création de `lib/siteUrl.ts` — constante centralisée `SITE_URL` qui lit `process.env.NEXT_PUBLIC_APP_URL`, avec repli sur `https://kabanalouer.ca` (jamais vercel.app) si la variable est absente
- Remplacement des 20+ occurrences codées en dur dans : `app/layout.tsx`, `app/sitemap.ts`, `app/page.tsx`, `app/regions/page.tsx`, `app/chalets/page.tsx`, `app/devenir-hote/page.tsx`, `app/chalets/ville/[slug]/page.tsx`, `app/chalets/[slug]/page.tsx`, `app/chalets/[slug]/RegionLanding.tsx`, `app/tarifs/page.tsx`, `app/a-propos/page.tsx`, `app/comment-ca-marche/page.tsx`, `app/faq-hotes/page.tsx`, `app/api/reviews/route.ts`, `app/api/reviews/[id]/reply/route.ts`
- Texte statique corrigé dans `public/llms.txt`, `messages/fr.json`, `messages/en.json` (CGU et politique de confidentialité mentionnaient littéralement `kabanalouer.vercel.app`)
- `playwright.config.ts` volontairement laissé tel quel (config de tests, aucun impact SEO)

**Vérifié en production après déploiement** : canonical, sitemap, hreflang, og:url, JSON-LD et llms.txt affichent tous correctement `kabanalouer.ca`.

---

## 4. Doublon de titre corrigé partout

**Bug trouvé pendant l'audit** : toutes les balises `<title>` affichaient un doublon du type `"... | Kabanalouer | Kabanalouer"` — le template racine (`app/layout.tsx`, `template: "%s | Kabanalouer"`) ajoutait le suffixe de marque, alors que les titres de pages le codaient déjà en dur individuellement.

**Correctif appliqué** (commit `d70b130`) — suffixe retiré des titres source, le template racine reste l'unique responsable de l'ajout du `"| Kabanalouer"` :
- `messages/fr.json` / `messages/en.json` : 5 clés `metaTitle` chacun
- `lib/regionsContent.ts` : 28 titres (`meta_title_fr`/`meta_title_en` × 14 régions)
- 7 pages publiques avec titre codé en dur (`contact`, `faq-hotes`, `regions`, `devenir-hote`, `tarifs`, `a-propos`, `comment-ca-marche`)
- 8 pages privées dashboard/admin (`app/admin/layout.tsx` + 7 pages `app/dashboard/*`)

Aucune perte de branding sur les partages sociaux : `openGraph.siteName: "Kabanalouer"` du layout racine s'hérite automatiquement sur toutes les pages qui ne le redéfinissent pas.

---

## 5. Cloudflare Turnstile — domaine kabanalouer.ca ajouté

Pendant l'audit, on a identifié que le code du widget Turnstile (`components/TurnstileWidget.tsx`, pages login/signup) ne contient aucune référence de domaine codée en dur — seulement la site key publique. Le souci potentiel venait donc forcément de la configuration du widget côté **Cloudflare Dashboard**, où chaque site key a une liste de domaines autorisés.

**Vérifié et corrigé manuellement par Simon** : le domaine `kabanalouer.ca` a été ajouté aux hostnames autorisés du widget (`0x4AAAAAADun6nA4SV0GHTM6`) — auparavant, seul `kabanalouer.vercel.app` y figurait.

---

## 6. Audit complet des traductions FR/EN

### Comparaison `messages/fr.json` / `messages/en.json`
- **0 clé manquante** dans les deux sens (1174 clés communes, structure parfaitement symétrique)
- 163 candidats "suspects" (identiques ou très similaires) détectés automatiquement puis passés en revue manuellement — **aucune vraie traduction copiée-collée** trouvée (tous des faux positifs légitimes : cognats, marques, mois, formats ICU pluriels, placeholders)
- 2 guillemets français oubliés dans le texte anglais corrigés (`«...»` → `"..."`) dans `commentCaMarche.s1a1` et `faqHotes.faq2A`

### `lib/regionsContent.ts`
Aucun champ manquant, aucun décalage de nombre d'éléments entre highlights/FAQ FR et EN pour les 14 régions.

### Vérification visuelle Playwright (7 pages `/en/*`)
Accueil, `/en/chalets`, `/en/become-a-host`, `/en/about`, `/en/how-it-works`, `/en/owner-faq` : entièrement propres.

**Bug trouvé et corrigé sur `/en/pricing`** (commit `d9c3834`) : le prix s'affichait littéralement en français — `"299 $/an"` — à 3 endroits de `app/tarifs/page.tsx` (prix barré, tableau comparatif Kabanalouer vs Airbnb, suffixe affiché une fois l'offre de lancement épuisée). Ajout des clés `tarifs.annualPrice` et `tarifs.perYearSuffix` dans `messages/fr.json`/`en.json`. **Vérifié en production après déploiement** : "299 $/year" s'affiche correctement.

---

## Commits de la session (déployés en production)

| Commit | Description |
|---|---|
| `1c44d86` | fix: résout le chevauchement du logo par la barre de recherche entre 768px et 1279px |
| `8052bd8` | fix: centre verticalement le hero mobile (badge, H1, moteur de recherche) |
| `b8693f6` | fix: centralise l'URL du site dans lib/siteUrl.ts, corrige 20+ occurrences codées en dur pointant vers kabanalouer.vercel.app |
| `d70b130` | fix: retire le doublon "\| Kabanalouer \| Kabanalouer" dans les balises title |
| `d9c3834` | fix: corrige le prix codé en dur en français sur la page pricing anglaise |

Tous poussés vers `main` et déployés automatiquement via Vercel.

---

## Prochaines étapes en suspens

1. **Google Search Console** à configurer — prévu en même temps que **GA4**, plus tard
2. **Activation du compte Stripe** une fois le statut fiscal de Simon réglé (NEQ vs travailleur autonome — voir session 5), ce qui débloquera l'envoi des vrais reçus aux clients
3. **Adresse d'entreprise à ajouter sur les factures Stripe**
4. Reste de l'`ACTION-PLAN.md` de l'audit SEO (`/Users/simonlemay/kabanalouer.ca-audit/`) non encore traité : signaux E-EAT sur `/a-propos` (fondateur nommé, NEQ), stratégie d'indexation des pages régionales vides tant qu'il n'y a pas d'annonces, `sameAs` du schema Organization à remplir une fois les réseaux sociaux créés

---

## Instructions pour Claude (assistant claude.ai)

Ce document résume la **session 6** du 4 juillet 2026 — il complète (ne remplace pas) `kabanalouer-contexte-session5.md` pour le contexte complet du projet (stack, Stripe, sécurité, domaine, design system, etc.).

Quand Simon revient avec une question ou une nouvelle fonctionnalité :
1. Le contexte complet du projet est dans session 5 ; cette session 6 couvre uniquement les correctifs SEO/i18n/responsive et le point Stripe du 4 juillet 2026
2. Tu aides à planifier et rédiger les prompts pour Claude Code
3. Tu fournis les prompts dans des blocs de code avec bouton copie
4. Si Simon partage une capture d'écran d'une erreur, tu l'analyses et proposes une solution concrète
5. Claude Code lit `CLAUDE.md` automatiquement — pas besoin de donner le contexte manuellement
6. **Important** : donne une seule étape à la fois pour les tâches multi-étapes — Simon est débutant technique
