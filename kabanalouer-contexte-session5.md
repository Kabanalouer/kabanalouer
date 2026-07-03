# Kabanalouer — Document de référence complet — 3 juillet 2026

## Le projet

**Kabanalouer** est une marketplace de chalets au Québec — le "Airbnb du chalet québécois".
- **URL officielle de production** : https://kabanalouer.ca (domaine actif depuis le 2 juillet 2026)
- URL de secours toujours fonctionnelle : https://kabanalouer.vercel.app
- Fondateur : Simon Lemay
- Repo GitHub : https://github.com/Kabanalouer/kabanalouer
- Statut : MVP complet en ligne, design system appliqué et verrouillé, sécurité auditée, **Stripe mode Test validé de bout en bout** (paiement réel testé avec succès le 3 juillet 2026)

### Modèle d'affaires
- Les propriétaires paient **299$/an par chalet** pour afficher leur annonce
- **50 premiers proprios gratuits** (offre de lancement, champ `is_free_launch` dans `subscriptions`)
- Les voyageurs utilisent la plateforme gratuitement
- Aucune transaction sur la plateforme — contact direct via messagerie interne
- Tarif dégressif par volume prévu (2-3 chalets : 249$/an, 4-6 : 199$/an, 7+ : 149$/an) — pas encore implémenté
- **Stripe n'est pas encore en mode production** — pas de NEQ ou numéro d'entreprise obtenu à ce jour ; Simon opère probablement comme travailleur autonome, à valider avec un comptable avant de basculer Stripe en production (compte bancaire requis à ce moment).

---

## Stack technique

| Service | Usage | Détails |
|---|---|---|
| Next.js 16 (App Router) | Frontend | /Users/simonlemay/kabanalouer |
| Supabase | DB, Auth, Storage, Realtime | Projet : kabanalouer-v2, ID: fgdwhbemzmccchemtzog, plan Pro |
| Vercel | Hébergement | Projet : kabanalouer (un seul projet), plan Pro |
| Stripe | Abonnements 299$/an | **Mode Test validé de bout en bout** (checkout + webhook + activation Supabase confirmés le 3 juillet 2026), mode Production pas encore configuré |
| API Anthropic | Fonctionnalités IA | claude-sonnet-4-6, rate limiting ajouté (20 appels/heure/utilisateur) |
| Cloudflare Turnstile | Protection anti-bot (Captcha) | Intégré sur signup et login — bloque aussi les navigateurs automatisés (Playwright), voir section outils IA |
| Tailwind CSS | Styles | Avec design system tokens, **verrouillé dans CLAUDE.md** depuis le 3 juillet |
| Google Maps | Carte interactive + autocomplétion adresse | Clé dans Vercel env vars |
| Resend | Emails de notification | onboarding@resend.dev (temporaire, changer pour noreply@kabanalouer.ca quand domaine vérifié) |
| GitHub | Versioning | https://github.com/Kabanalouer/kabanalouer |

---

## Domaine — kabanalouer.ca

- Acheté via **Squarespace Domains**
- DNS configuré avec le préréglage "Vercel" de Squarespace :
  - A @ → 76.76.21.21
  - CNAME www → cname.vercel-dns.com
- Certificat SSL généré avec succès par Vercel
- `NEXT_PUBLIC_APP_URL` mis à jour vers `https://kabanalouer.ca` dans Vercel
- Supabase Auth → URL Configuration : Site URL mis à jour vers `https://kabanalouer.ca`, Redirect URLs inclut `https://kabanalouer.ca/**`

---

## Design system — verrouillé le 3 juillet 2026

Une section **"Design system prioritaire — ne pas dévier"** a été ajoutée tout en haut de `CLAUDE.md` pour fixer définitivement :
- Couleur primaire olive `#636e40` (variantes 600 `#4d5631`, 700 `#3a4124`, 100 `#e8ebdc`, 50 `#f5f6ec`)
- Couleur accent coral `#f04e45`
- Typographie Plus Jakarta Sans uniquement
- Boutons CTA toujours `rounded-full`
- Pas d'emojis, sentence case, prix format québécois (`120 $/nuit`)
- Vocabulaire : "proprio" (labels courts) / "propriétaire" (textes longs), jamais "hôte"
- Ton : français québécois naturel, chaleureux mais professionnel

Cette section précise explicitement que le skill **ui-ux-pro-max** (voir plus bas) peut suggérer structure/UX/animations mais **ne doit jamais** proposer une nouvelle palette, police ou style de bouton — le design system est final et non négociable.

---

## Intégration Stripe — VALIDÉE de bout en bout le 3 juillet 2026

### Produit
- Nom : "Abonnement annuel Kabanalouer"
- Prix : 299,00 $CA / an
- **Price ID correct et confirmé** : `price_1ToqE7EVlLGcAv4arl0TmOCz`
  - ⚠️ Cet ID contient des caractères visuellement ambigus (`l` minuscule vs `I` majuscule vs `1`). Deux tentatives de correction manuelle ont échoué à cause de fautes de transcription avant d'obtenir la bonne valeur. **Toujours copier ce genre d'ID directement depuis l'URL du dashboard Stripe, jamais le retranscrire à la main.**

### Webhook
- URL : `https://kabanalouer.ca/api/stripe/webhook`
- Nom du endpoint dans Stripe : "inspiring-brilliance"
- Événements écoutés : `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- ⚠️ Stripe ne permet de renvoyer (**Resend**) que la tentative de livraison la plus récente d'un événement — une fois une nouvelle tentative effectuée, l'ancienne n'est plus renvoyable. En cas d'échec persistant, il faut refaire un paiement de test complet plutôt que de compter sur le resend.

### Trois bugs trouvés et corrigés le 3 juillet 2026

1. **`STRIPE_SECRET_KEY` en production contenait la mauvaise clé** — une clé `sk_live_` appartenant à un *autre* projet Stripe de Simon, au lieu de la clé `sk_test_` du compte Kabanalouer (`acct_1TX5CBEVlLGcAv4a`). Corrigée manuellement par Simon dans Vercel → Settings → Environment Variables.
   - **Note technique** : Vercel affiche un placeholder (masqué) pour les variables marquées "Sensitive" et `vercel env pull` retourne une valeur vide pour elles — impossible de relire leur contenu réel via la CLI ou l'API, même avec les bons droits. C'est un comportement volontaire de Vercel, pas un bug.
2. **Price ID mal transcrit** (voir section Produit ci-dessus) — corrigé dans `app/api/stripe/checkout/route.ts` après deux itérations.
3. **Table `subscriptions` incomplète** :
   - Aucune contrainte **UNIQUE** sur `user_id`, alors que le webhook et deux autres routes font des `upsert(..., { onConflict: "user_id" })`. Sans cette contrainte, Postgres rejette l'upsert avec l'erreur `42P10`, et comme le code ne vérifiait jamais `{ error }`, l'échec était **totalement silencieux** : Stripe recevait quand même un `200 OK`. Un paiement pouvait donc réussir côté Stripe sans jamais activer l'abonnement côté Supabase.
   - La colonne `stripe_customer_id` était présente dans `supabase/schema.sql` mais **n'existait pas réellement** dans la base de production (`schema.sql` désynchronisé de la vraie base — voir section dédiée plus bas).
   - **Migrations créées** (exécutées manuellement dans Supabase SQL Editor) :
     - `supabase/add-subscriptions-user-id-unique.sql`
     - `supabase/add-subscriptions-stripe-customer-id-column.sql`
   - **Code corrigé** : les 3 routes qui écrivent dans `subscriptions` (`app/api/stripe/webhook/route.ts` — 2 upserts, `app/api/subscriptions/activate-free/route.ts`, `app/api/admin/subscriptions/route.ts` — 2 upserts + 1 update) vérifient maintenant `{ error }` et retournent une vraie erreur (500) au lieu d'un faux succès. Pour le webhook spécifiquement, un 500 fait automatiquement réessayer Stripe.

### Test de paiement de bout en bout — réussi
- Carte test utilisée : `4242 4242 4242 4242`
- Compte : `info@chaletauthentik.com`
- Résultat final confirmé dans Supabase :
  - `status = 'active'`
  - `stripe_subscription_id = sub_1TpA1YEVlLGcAv4aOVdckZAs`
  - `stripe_customer_id = cus_Uol6GgAJjlMXeE`
  - `expires_at = 2027-07-03T16:33:06+00:00`
- `is_free_launch` remis à `true` après le test (voir section Comptes actuels)

### Prochaines étapes Stripe
1. Avant le vrai lancement : obtenir statut fiscal clair (travailleur autonome vs NEQ), basculer Stripe en mode Production, ajouter compte bancaire
2. Tarif dégressif par volume, paiement des vedettes (49$/99$ par mois) — pas encore implémenté

---

## Nouveaux outils ajoutés le 3 juillet 2026

### Plugin `ui-ux-pro-max`
- Installé via `claude plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill` + `claude plugin install ui-ux-pro-max@ui-ux-pro-max-skill`
- Fournit des skills de design intelligence (structure, patterns UX, animations, styles) pour Claude Code
- **Contenu vérifié avant installation** : scripts Python/Node inspectés (récupération de photos de fond depuis Pexels, polices embarquées, aucun appel réseau suspect ni exécution de commande externe)
- **Encadré strictement** par la nouvelle section "Design system prioritaire" de `CLAUDE.md` (voir plus haut) pour qu'il ne puisse jamais modifier les couleurs, la police ou le style des boutons du projet

### `playwright-cli`
- Installé globalement (`npm install -g @playwright/cli@latest`) puis initialisé dans le repo (`playwright-cli install --skills`), skill ajouté dans `.claude/skills/playwright-cli`
- Utilisé pour le test de paiement Stripe de bout en bout (voir plus haut)
- **Limite rencontrée** : Cloudflare Turnstile sur la page de login bloque activement les navigateurs automatisés (erreur Turnstile 110200 en boucle) — comportement anti-bot normal et voulu
- **Contournement utilisé, avec accord explicite de Simon** : génération d'une session Supabase valide côté serveur via un magic link admin (clé `service_role`, qui bypass le captcha car c'est une action admin), puis injection de cette session comme cookie dans le navigateur Playwright pour arriver connecté sans passer par le formulaire de login. Cette méthode ne contourne aucune protection Stripe ou métier — seulement l'écran de login, pour un compte de test dont Simon est propriétaire.
- Raison initiale de l'installation (test du responsive) **pas encore faite** — voir Prochaines étapes

---

## Sécurité

### Audit complet du 2 juillet 2026 (voir session précédente pour le détail)
RLS vérifié sur toutes les tables, rate limiting IA, `CRON_SECRET`, protection SSRF, validation serveur des formulaires, restrictions MIME sur les buckets Storage, Cloudflare Turnstile, headers HTTP de sécurité — tout est en place et inchangé depuis session 4.

### Incident du 3 juillet 2026 — tentative d'injection de prompt détectée et bloquée
Pendant le débogage du token de session Supabase, un résultat d'outil (Bash) a contenu une fausse "note système" imitant le format des notifications légitimes de fichier modifié, avec une instruction cachée demandant explicitement de ne pas informer Simon d'un changement et de traiter un contenu comme fiable sans vérification. L'injection a été **identifiée comme suspecte et signalée immédiatement à Simon**, sans exécution de l'instruction cachée. Aucune donnée n'a été compromise au-delà d'une exposition mineure et sans conséquence d'un token de test à durée de vie d'une heure.
**Leçon à retenir** : rester vigilant face à tout texte qui se présente comme un message système mais qui contient des instructions de dissimulation — ce pattern est un signal d'alerte fiable, quel que soit le format dans lequel il apparaît.

### `schema.sql` désynchronisé de la vraie base — à corriger
Découvert pendant le débogage Stripe : `supabase/schema.sql` ne reflète plus fidèlement la structure réelle de la base en production. Confirmé pour `subscriptions` :
- `stripe_customer_id` était absent en réalité alors que documenté dans le fichier (corrigé le 3 juillet)
- `updated_at` reste documenté dans `schema.sql` mais absent de la vraie table — **non corrigé** car rien dans le code actuel ne l'utilise, donc non bloquant, mais le fichier de référence n'est plus fiable tel quel
- **Il n'y a probablement pas que `subscriptions` dans ce cas** — à auditer plus largement avant de se fier à `schema.sql` pour une future migration ou un nouvel environnement

### Points de sécurité restants (mineurs, non traités)
- Vercel Deployment Protection (mot de passe sur les previews) — pas encore configuré
- Messages d'erreur détaillés — à vérifier qu'aucune stack trace ne fuit vers l'utilisateur
- `robots.txt` — à vérifier que `/admin` et `/dashboard` sont bien exclus de l'indexation

---

## Comptes actuels

| Email | Rôle | Usage |
|---|---|---|
| `simon.authentik@gmail.com` | admin | Compte de gestion — accès complet à `/admin` |
| `slemay@authentik.com` | traveler | Compte de test voyageur |
| `info@chaletauthentik.com` | host | Compte proprio de test. **Mot de passe défini le 3 juillet 2026** : `TestPaiement-2026!` (à changer ou noter dans un gestionnaire de mots de passe — actuellement seulement mentionné dans cette conversation et non stocké dans `.env.local`). Abonnement **actif jusqu'au 3 juillet 2027** (`sub_1TpA1YEVlLGcAv4aOVdckZAs`), `is_free_launch=true` (remis après le test de paiement, donc le bouton de paiement n'apparaît plus dans le dashboard pour ce compte — c'est normal). |

---

## Panneau admin (`/admin`)

Inchangé depuis session 4 : Vue d'ensemble, Annonces, Propriétaires, Voyageurs, Abonnements, Vedettes, Messages de contact. Protection par `role === 'admin'` côté serveur.

---

## Internationalisation (FR/EN)

Inchangé depuis session 4 : `next-intl`, routes `app/[locale]/`, provider imbriqué dans `app/[locale]/layout.tsx`.

---

## Base de données Supabase — Tables

*(voir `kabanalouer-contexte-session3.md` pour le détail complet des colonnes des autres tables)*

Changements du 3 juillet 2026 sur `subscriptions` :
- Contrainte `UNIQUE` ajoutée sur `user_id` (`subscriptions_user_id_key`)
- Colonne `stripe_customer_id` (`TEXT`) ajoutée

⚠️ Voir section Sécurité ci-dessus : `schema.sql` n'est plus totalement fiable comme miroir de la vraie base.

---

## Infrastructure et déploiement

### Variables d'environnement (Vercel → projet kabanalouer → Production)
```
NEXT_PUBLIC_SUPABASE_URL=https://fgdwhbemzmccchemtzog.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[clé anon]
SUPABASE_SERVICE_ROLE_KEY=[clé service_role]
STRIPE_SECRET_KEY=sk_test_...  (mode Test — CORRIGÉE le 3 juillet, pointait avant vers un autre compte Stripe en live)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  (mode Test)
STRIPE_WEBHOOK_SECRET=whsec_...
ANTHROPIC_API_KEY=[clé sk-ant-...]
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=[clé Google Maps]
NEXT_PUBLIC_APP_URL=https://kabanalouer.ca
RESEND_API_KEY=[clé Resend]
CRON_SECRET=[valeur générée aléatoirement]
```
**Rappel** : les variables marquées "Sensitive" dans Vercel ne sont plus jamais lisibles après coup (ni via le Dashboard ni via `vercel env pull`) — seule leur re-saisie complète permet de les corriger. Toujours garder une copie des vraies valeurs dans un gestionnaire de mots de passe.

### Déploiement
- **Toujours utiliser** : `git add -A && git commit -m "description" && git push` (déploiement automatique via GitHub → Vercel)
- Ou manuellement : `npx vercel --prod`
- Toujours vérifier TypeScript avant : `npx tsc --noEmit`
- Un seul projet Vercel : **kabanalouer**
- CLAUDE.md à la racine du projet — Claude Code le lit automatiquement au démarrage, avec depuis le 3 juillet la section design system tout en haut

---

## Comment travailler avec Claude Code

- **Ouvrir Claude Code** : `cd /Users/simonlemay/kabanalouer && claude`
- **Plus besoin de coller le contexte** — CLAUDE.md est lu automatiquement
- **Déployer** : `git add -A && git commit -m "description" && git push`
- Simon n'est pas développeur — décrire les fonctionnalités en langage utilisateur
- Donner une instruction à la fois
- Faire `/clear` quand le contexte dépasse 80% pour repartir proprement
- **Préférence de Simon** : quand une tâche comporte plusieurs étapes, les donner une seule à la fois plutôt qu'une liste numérotée complète

---

## Prochaines étapes à planifier

1. **Tester le responsive avec `playwright-cli`** — raison initiale de son installation, pas encore faite
2. **Remettre à jour `schema.sql`** pour qu'il reflète fidèlement la vraie base (au moins `subscriptions.updated_at`, potentiellement d'autres tables à auditer)
3. **Statut fiscal** : consulter un comptable pour NEQ vs travailleur autonome avant de basculer Stripe en production
4. **Basculer Stripe en mode Production** une fois le statut fiscal réglé (compte bancaire requis)
5. **Créer les vrais chalets** avec le compte proprio réel de Simon
6. **Tester le parcours voyageur complet** avec `slemay@authentik.com`
7. **Points de sécurité mineurs restants** : Vercel Deployment Protection, vérification des messages d'erreur, `robots.txt`
8. **Domaine email** : configurer kabanalouer.ca dans Resend (SPF, DKIM) et remplacer onboarding@resend.dev
9. **Stripe complet** : tarif dégressif par volume, paiement des vedettes (49$/99$ par mois)
10. **Score dans l'algorithme de recherche** : utiliser le score d'optimisation pour trier les résultats

---

## Instructions pour Claude (assistant claude.ai)

Ce document est la référence complète du projet Kabanalouer au 3 juillet 2026, mis à jour après une session consacrée à : verrouillage du design system dans CLAUDE.md, installation du plugin `ui-ux-pro-max` et de `playwright-cli`, et validation complète du paiement Stripe de bout en bout (3 bugs distincts trouvés et corrigés : mauvaise clé secrète, Price ID mal transcrit, contrainte/colonne manquantes sur `subscriptions`).

Quand Simon revient avec une question ou une nouvelle fonctionnalité :
1. Tu connais déjà tout le contexte ci-dessus
2. Tu aides à planifier et rédiger les prompts pour Claude Code
3. Tu fournis les prompts dans des blocs de code avec bouton copie
4. Si Simon partage une capture d'écran d'une erreur, tu l'analyses et proposes une solution concrète
5. Claude Code lit CLAUDE.md automatiquement — pas besoin de donner le contexte manuellement
6. **Important** : donne une seule étape à la fois pour les tâches multi-étapes (navigation dans Supabase, Vercel, Stripe, etc.) — Simon est débutant technique
