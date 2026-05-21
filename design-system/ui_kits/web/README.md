# Kabanalouer — Web UI Kit

Prototype haute-fidélité du site web Kabanalouer. Marketplace de chalets en bois rond au Québec.

## Écrans inclus (click-thru)

1. **Accueil** — hero + barre de recherche + filtres + grille de chalets
2. **Recherche** — résultats + filtres latéraux + carte (placeholder)
3. **Fiche chalet** — galerie, infos, hôte, équipements, avis, panneau de réservation sticky
4. **Réservation** — récap + paiement (placeholder)

Naviguer en cliquant sur un chalet (vers la fiche), puis « Réserver » (vers le récap).

## Architecture

- React 18.3.1 + Babel standalone (prototype, pas production)
- Lucide via CDN pour les icônes
- Tokens chargés depuis `../../colors_and_type.css`
- Un fichier JSX par composant (max ~200 lignes), exporté vers `window` pour partage de scope

## Composants

| Fichier | Rôle |
|---|---|
| `Header.jsx` | Logo + nav + search bar compacte sticky |
| `SearchHero.jsx` | Bloc hero accueil avec gros search |
| `CategoryStrip.jsx` | Pills de filtres horizontaux |
| `ListingCard.jsx` | Carte chalet (photo + meta + prix) |
| `ListingGrid.jsx` | Grille responsive de ListingCard |
| `Footer.jsx` | Footer marketplace |
| `Homepage.jsx` | Assemblage de l'accueil |
| `ChaletDetail.jsx` | Fiche chalet complète |
| `BookingPanel.jsx` | Panneau de réservation sticky |
| `ReviewBlock.jsx` | Section avis + note |
| `App.jsx` | Routeur simple (home ↔ détail ↔ réservation) |
| `data.js` | Données fictives (chalets, hôtes, avis) |

## Notes

- Les photos sont des placeholders dégradés (chaud + cool) — à remplacer par les vraies photos chalets.
- Pas de carte réelle (le bloc « carte » est un placeholder visuel).
- Le calendrier et le paiement sont mockés (clic → écran de confirmation).
