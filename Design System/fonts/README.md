# Fonts

Les fontes du design system sont chargées depuis **Google Fonts** via `@import` dans `colors_and_type.css` :

- **Instrument Serif** — display (regular + italic)
- **Geist** — sans (300, 400, 500, 600, 700)
- **Geist Mono** — mono (400, 500)

## Pourquoi pas de fichiers locaux ?

Le projet part de zéro sans assets fournis. Pour une simplicité immédiate, on charge depuis Google Fonts CDN, qui est performant, mis en cache, et licencié pour usage commercial.

## Pour la production

Si vous voulez héberger les fontes localement (recommandé pour perf, GDPR, offline) :

1. Téléchargez les familles depuis [Google Fonts](https://fonts.google.com/) ou [google-webfonts-helper](https://gwfh.mranftl.com/)
2. Placez les `.woff2` dans ce dossier
3. Remplacez le `@import` en haut de `colors_and_type.css` par des `@font-face` pointant ici

> ⚠️ **À confirmer avec le client** : préférence pour Google Fonts CDN ou self-hosted ?
