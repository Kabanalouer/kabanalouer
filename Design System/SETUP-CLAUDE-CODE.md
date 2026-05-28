# Hand-off à Claude Code

Guide pour intégrer le design system Kabanalouer (palette **Mousse** `#636e40`) dans votre repo Vercel.

---

## Étape 1 — Téléchargez les 2 dossiers

| Fichier à télécharger | Contient |
|---|---|
| **`design-system.zip`** | Le système complet : tokens CSS, README, SKILL.md, UI kits, preview cards |
| **`assets.zip`** | Logo en SVG + PNG, favicons, apple-touch-icon |

Vous trouvez les deux cartes de téléchargement dans le chat. Décompressez-les.

## Étape 2 — Mettez-les dans votre repo

Dans votre repo `kabanalouer` :

```
votre-repo-kabanalouer/
├── design-system/        ← contenu de design-system.zip
│   ├── README.md
│   ├── SKILL.md
│   ├── colors_and_type.css
│   ├── ui_kits/
│   └── preview/
├── public/
│   └── (copiez le contenu de assets.zip ici)
│       ├── logo-mark.png
│       ├── logo-wordmark.svg
│       ├── logo-wordmark-light.svg
│       ├── favicon.png
│       ├── favicon-32.png
│       └── apple-touch-icon.png
├── src/
├── package.json
└── ...
```

Pourquoi mettre les assets dans `public/` plutôt que dans `design-system/assets/` ? Parce que Next.js sert les fichiers de `public/` directement à la racine (ex. `/logo-mark.png` au lieu de `/design-system/assets/logo-mark.png`).

## Étape 3 — Commitez

```bash
git checkout -b refactor/design-system-mousse
git add design-system/ public/logo-mark.png public/logo-wordmark.svg public/logo-wordmark-light.svg public/favicon.png public/favicon-32.png public/apple-touch-icon.png
git commit -m "Add Kabanalouer design system + new assets (moss palette)"
```

## Étape 4 — Lancez Claude Code dans le repo

Ouvrez Claude Code, naviguez dans le repo, et lancez le prompt suivant. **Copiez-collez tel quel** :

---

````
Refactor le site Kabanalouer pour utiliser le nouveau design system situé dans `design-system/`.

LIRE D'ABORD (dans cet ordre) :
1. `design-system/SKILL.md` — vue d'ensemble
2. `design-system/README.md` — fondamentaux de marque (voix, palette, typo)
3. `design-system/colors_and_type.css` — TOUS les tokens. Copie ce fichier dans mon CSS global (ou importe-le).

CHANGEMENTS DE MARQUE (important) :
- La couleur primaire est maintenant **Mousse** `#636e40` (CSS variable `--moss-500`).
- Remplace TOUT le coral `#f04e45` par moss `#636e40` partout dans le code.
- Le hover est `--moss-600` (`#4d5631`).
- La typo est **Plus Jakarta Sans** (Google Fonts), poids 400/500/600/700/800.
- Le logo est dans `public/` : `/logo-wordmark.svg` (sur fond clair), `/logo-wordmark-light.svg` (sur fond foncé), `/logo-mark.png` (cabin seul), `/favicon.png`.

À FAIRE :
1. Mets à jour mon `src/app/layout.tsx` (ou équivalent) pour :
   - Charger Plus Jakarta Sans depuis Google Fonts
   - Pointer le favicon vers `/favicon.png` (et apple-touch-icon vers `/apple-touch-icon.png`)
2. Importe `design-system/colors_and_type.css` dans mon CSS global.
3. Refactore mon header pour utiliser `/logo-wordmark.svg` et remplace toutes les couleurs coral/rouge par moss.
4. Refactore ma fiche chalet (`/chalets/[id]` ou équivalent) en t'inspirant de `design-system/ui_kits/web/ChaletDetail.jsx` et `BookingPanel.jsx`. Garde mes données et ma logique — change juste le visuel.
5. Vérifie que les non-negotiables du SKILL.md sont respectés (fond blanc, pas d'emoji UI, etc.).

CE QU'IL FAUT GARDER :
- Mon positionnement « contact direct, zéro frais de service ».
- Ma structure de données et mes routes.
- Mes vraies photos d'hôtes (ne change pas pour Unsplash).

PRÉSENTE LES CHANGEMENTS PAGE PAR PAGE. Commence par la page d'accueil, puis attends ma validation avant de passer aux autres pages.
````

---

## Étape 5 — Itérez

Une fois la home faite, demandez la même chose pour :

- La fiche chalet (`/chalets/[id]`)
- La page « Devenir hôte »
- Le footer
- La page de connexion

À chaque fois, dites simplement à Claude Code :
> Maintenant refactore [nom de la page] avec le même design system. Suis le SKILL.md.

## Conseils

- **Branche dédiée** : `git checkout -b refactor/design-system-mousse` pour pouvoir revenir en arrière facilement.
- **Refactor une page à la fois** : plus facile à reviewer, à tester, à push en preview Vercel.
- **Comparez visuellement** : votre Vercel preview montre la branche refactor en parallèle de prod. Utilisez la pour valider.
- **Si Claude Code dévie** : pointez-le vers `design-system/Kabanalouer Homepage.html` (l'aperçu HTML statique) et dites « match this look and feel ».

## Référence rapide

| Élément | Valeur |
|---|---|
| Couleur primaire (Mousse) | `#636e40` — utilisez `var(--moss-500)` |
| Hover | `#4d5631` — `var(--moss-600)` |
| Texte principal | `#222222` — `var(--char-800)` |
| Texte secondaire | `#717171` — `var(--char-400)` |
| Bordures | `#ebebeb` — `var(--char-100)` |
| Fond page | `#ffffff` blanc pur |
| Fond alt | `#f7f7f7` — `var(--char-50)` |
| Border-radius boutons | 8 px |
| Border-radius cartes/photos | 12 px |
| Display weight | 800 (extrabold) |
| Body weight | 400 |
| Font | Plus Jakarta Sans |

Bonne chance ! Revenez ici si vous voulez itérer sur une page particulière du design system avant de la pousser en prod.
