# Iconography

## Système choisi : Lucide

Kabanalouer utilise **[Lucide](https://lucide.dev/)** comme système d'icônes principal. C'est une bibliothèque open-source, fork moderne de Feather Icons, avec un grand catalogue (>1400 icônes), un style cohérent (stroke uniforme, coins arrondis doux) et des intégrations propres (React, Vue, web components, SVG).

### Pourquoi Lucide

- **Stroke 1.5–2 px uniforme** — s'accorde avec notre type sans (Geist) et nos cartes douces sans crier
- **Coins arrondis** — cohérence avec notre système de radii (8–16 px)
- **Outline par défaut** — léger, ne sature pas l'UI photo-driven
- **Couverture complète** : `home`, `map-pin`, `calendar`, `users`, `bed`, `bath`, `flame` (foyer), `trees`, `waves` (lac), `mountain-snow`, `heart`, `star`, `wifi`, `car`, `dog`, etc.

> ⚠️ **Substitution flaggée** : aucun set d'icônes propre n'était fourni (projet from-scratch). Lucide est un substitut de qualité production. Si vous voulez un set custom (illustrations chalet dessinées main, pictos couleur, etc.), il faudra fournir les SVGs.

### Usage

**Via CDN (recommandé pour prototypes et UI kit) :**

```html
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
<i data-lucide="home"></i>
<script>lucide.createIcons();</script>
```

**Via React (production) :**

```bash
npm install lucide-react
```
```jsx
import { Home, MapPin, Star, Heart } from 'lucide-react';

<MapPin size={16} strokeWidth={1.75} />
```

### Règles d'usage

| Contexte | Taille | Stroke | Couleur |
|---|---|---|---|
| Inline meta (carte chalet) | 14 px | 1.75 | `--fg-2` |
| Boutons | 18 px | 1.75 | hérite du texte |
| Navigation | 20 px | 1.75 | `--fg-1` |
| Hero / vide | 32–48 px | 1.5 | `--fg-3` |
| Bouton favoris (cœur) | 24 px | 2 | blanc avec ombre, rempli rouge brique quand actif |

### Couleurs des icônes

- **Outline** par défaut, hérite de `currentColor`
- **Fill** rare : seulement pour `heart` (favori actif → `--danger`) et `star` (note → `--ember-400`)
- Jamais d'icônes en couleur vive (bleu marketing, jaune fluo) sauf cas de marque (logo).

### Logo et marque

Le **mark Kabanalouer** (silhouette de chalet + petite porte orange) est dans `assets/logo-mark.svg`. Le **wordmark complet** est dans `assets/logo-wordmark.svg` (foncé) et `assets/logo-wordmark-light.svg` (clair, sur fond sombre).

**Règle d'espacement clear-space :** marge minimale autour du logo = hauteur du « o » dans « kabanalouer » (~12 px à taille 80).

### Emoji et caractères Unicode

- **Pas d'emoji en UI** — voir README.md (Content Fundamentals)
- Caractères Unicode tolérés :
  - `★` (U+2605) pour les étoiles de notes — alternative à l'icône Lucide
  - `·` (U+00B7) puce médiane pour séparer méta-données
  - `→` (U+2192), `←` (U+2190) dans le texte conversationnel (rare)
  - `«` `»` (U+00AB, U+00BB) guillemets français
  - `—` (U+2014) tiret cadratin
