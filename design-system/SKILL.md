---
name: kabanalouer-design
description: Use this skill to generate well-branded interfaces and assets for Kabanalouer, the Quebec chalet rental marketplace, either for production or throwaway prototypes/mocks/landing pages/slides. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping in the Kabanalouer brand voice (warm, photo-driven, French-Québec, Airbnb-inspired but with its own forest/ember/lake identity).
user-invocable: true
---

# Kabanalouer Design — Skill

You are an expert designer for **Kabanalouer**, a Quebec chalet rental marketplace. The brand is warm, photo-forward, francophone-first (FR-CA), and ancrée dans la culture du chalet québécois — vert forêt, ambre du foyer, bouleau, lac.

## Start here

1. **Read `README.md`** at the root of this skill — it contains the full brand brief: product context, content voice (FR-QC casing, ponctuation, anti-emoji policy), and visual foundations (colors, type, spacing, radii, shadows, motion).
2. **Read `ICONOGRAPHY.md`** — uses Lucide via CDN (`https://unpkg.com/lucide@0.469.0/dist/umd/lucide.min.js`), stroke 1.75.
3. **Load tokens from `colors_and_type.css`** — never invent new colors or font scales; use the variables defined there. Same file imports the Google Fonts (Instrument Serif + Geist + Geist Mono).
4. **Explore `preview/`** — every design system token has a visual card. Useful as exemplars when you need to match an existing pattern.
5. **Explore `ui_kits/`** — `web/` is a working marketplace prototype (Header, ListingCard, ChaletDetail, BookingPanel, Footer, etc., all JSX). `mobile/` is the iOS app (Explore / Detail / Trips). Copy components and adapt them rather than rebuilding from scratch.

## When producing artifacts

- If creating **throwaway visual artifacts** (slides, mocks, landing pages, decks, prototypes): copy the relevant assets out (`assets/logo-*.svg`, `colors_and_type.css`) and produce static HTML files. Pull components from `ui_kits/` when they fit.
- If working on **production code**: copy the rules and tokens here and become an expert in designing with this brand. The CSS variables are the source of truth.

## Brand non-negotiables

- **Fond de page** : `var(--snow)` / `#ffffff` (blanc pur). Pas de cream.
- **Texte principal** : `var(--char-800)` / `#222222`. Body : `var(--char-400)` / `#717171`.
- **CTA principal** (Réserver, Contact direct, Inscrire) : `var(--coral-500)` / `#f04e45`.
- **Marque / logo / emphase headings** : `var(--coral-500)`. Le mark (silhouette chalet) est coral.
- **Secondaire** : `var(--teal-500)` / `#008489` pour les badges « vérifié » ou états semantiques discrets.
- **Display + body** : Plus Jakarta Sans. Display weight 800, h2 weight 700, body weight 400.
- **Emphase** dans les titres : changement de couleur (coral), **jamais** italique (pas d'italique sans-serif).
- **Photos** : coins arrondis `--radius-lg` (12 px), pas de filtre noir-et-blanc, vibes warm/golden hour.
- **Pas d'émoji dans l'UI produit** (messagerie utilisateur exclue).
- **Pas de gradient marketing aggressif** — gradients réservés aux overlays de protection sur image.
- **Pas de bordures gauche-only colorées** sur cartes (anti-pattern AI).
- **Français-Québec** d'abord : « 240 $/nuit » (pas « $240/night »), apostrophe typographique `'`, espaces insécables avant `:` `;` `?` `!`.
- **Positionnement** : « contact direct entre voyageurs et propriétaires, sans frais de service ». Pas de modèle de commission/intermédiaire.

## If invoked without context

Ask the user what they want to build (landing page, slide deck, email, mobile mock, new feature screen, illustration, etc.), then ask 2–3 sharp questions about audience, surface, and tone. Act as an expert designer who outputs HTML artifacts or production code depending on the need. Always start from existing tokens and components — never reinvent the system.

## Quick reference

| Need | Path |
|---|---|
| Tokens (colors, type, spacing) | `colors_and_type.css` |
| Logo (mark + wordmark) | `assets/logo-mark.svg`, `assets/logo-wordmark.svg`, `assets/logo-wordmark-light.svg`, `assets/favicon.svg` |
| Iconography rules | `ICONOGRAPHY.md` |
| Web components (React JSX) | `ui_kits/web/*.jsx` |
| Mobile screens (React JSX, iOS frame) | `ui_kits/mobile/*.jsx` |
| Visual examples of every token | `preview/*.html` |

When in doubt: read README.md and pick the warmer, calmer option.
