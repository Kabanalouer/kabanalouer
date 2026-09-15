// Classes Tailwind partagées pour les liens texte cliquables inline (pas les
// boutons CTA en rounded-full). Fonce au survol (jamais plus pâle), gagne un
// soulignement et un poids de police plus fort — un survol qui éclaircissait
// la couleur ou réduisait l'opacité était la cause du bug de faible contraste
// rapporté en test manuel (2026-09-15).
export const TEXT_LINK_CLASSNAME =
  "text-primary font-medium hover:text-primary-700 hover:underline hover:font-semibold transition-colors duration-150";
