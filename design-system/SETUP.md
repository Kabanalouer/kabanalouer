# Installer Kabanalouer Design System dans votre repo

Guide pas-à-pas pour intégrer ce design system dans votre projet Vercel.

---

## 1. Téléchargez le projet

Cliquez sur la carte de téléchargement (en bas du chat). Vous obtenez un fichier `.zip`.

## 2. Décompressez et déplacez

1. Décompressez le `.zip` sur votre ordinateur
2. Vous obtenez un dossier `Kabanalouer Design System/` (ou similaire)
3. Renommez-le simplement en `design-system/`
4. **Déplacez-le à la racine de votre repo Kabanalouer** (au même niveau que votre `package.json`, `src/`, etc.)

Votre structure devrait ressembler à :

```
votre-repo-kabanalouer/
├── design-system/      ← le dossier que vous venez d'ajouter
│   ├── README.md
│   ├── SKILL.md
│   ├── colors_and_type.css
│   ├── assets/
│   ├── ui_kits/
│   └── ...
├── src/                ← votre code Next.js
├── package.json
└── ...
```

## 3. Commitez le dossier

```bash
git add design-system/
git commit -m "Add Kabanalouer design system"
```

## 4. Demandez à Claude Code d'appliquer le système

Ouvrez Claude Code dans votre repo et tapez quelque chose comme :

> Refactor my homepage to use the new design system located in `design-system/`.
>
> Start by reading these files in order :
> 1. `design-system/SKILL.md` — overall guide
> 2. `design-system/README.md` — brand & content fundamentals
> 3. `design-system/colors_and_type.css` — design tokens (copy these into my global CSS)
> 4. `design-system/ui_kits/web/` — JSX components to reference for the new visual style
>
> Then refactor `src/app/page.tsx` (or wherever the homepage lives) :
> - Replace existing colors with the coral primary / teal secondary / charcoal / white system
> - Replace fonts with Plus Jakarta Sans (load from Google Fonts)
> - Use the listing card, search bar, hero, host CTA patterns from the UI kit
> - Keep the « contact direct, zéro frais de service » positioning

Claude Code va lire les fichiers, comprendre le système, et faire le refactor. Vous pourrez ensuite reviewer les changements page par page.

## 5. Itérations possibles

Une fois la home faite, demandez la même chose pour :
- La page fiche chalet (`/chalets/[id]`)
- La page « Devenir hôte » (`/devenir-hote`)
- La page de connexion (`/login`)
- Le header et le footer (composants partagés)

## Conseils

- **Faites une branche** avant de commencer (`git checkout -b refactor/design-system`)
- **Refactorez page par page** plutôt que tout d'un coup — c'est plus facile à reviewer
- **Gardez l'ancien code en référence** dans un commit séparé au cas où
- **Demandez à Claude Code de vérifier** que le résultat respecte les non-negotiables listés dans `SKILL.md`

## En cas de blocage

Si Claude Code ne comprend pas ou produit quelque chose qui ne correspond pas au design system :
1. Pointez-le vers la version d'aperçu : `design-system/Kabanalouer Homepage.html`
2. Dites-lui « match this look and feel »
3. Soyez précis sur ce qui cloche : couleur, typo, espacement, etc.

---

Bonne chance ! Revenez ici si vous voulez explorer d'autres écrans du design system avant de faire le refactor.
