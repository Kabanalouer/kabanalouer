# Kabanalouer — Mobile UI Kit

Trois écrans représentatifs de l'application mobile iOS Kabanalouer, montés côte-à-côte dans un frame iPhone (status bar Liquid Glass).

## Écrans

1. **Explorer** — recherche compacte, pills de catégories, feed de chalets, tab bar
2. **Fiche chalet** — hero photo, header avec retour, infos, hôte, équipements, CTA réserver sticky
3. **Mes voyages** — voyage à venir + voyages passés

## Composants

- `MobileScreens.jsx` — les trois écrans + tab bar partagée + MIcon (wrapper Lucide)
- `ios-frame.jsx` — composant `<IOSDevice>` (starter, frame iOS 26)
- `index.html` — montage des trois téléphones

## Notes

- Les données viennent de `../web/data.js`.
- Pas de navigation entre écrans (les trois sont montrés en parallèle pour vue d'ensemble).
- Le bouton « Réserver » est un placeholder visuel.
