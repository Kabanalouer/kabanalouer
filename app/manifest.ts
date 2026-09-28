import type { MetadataRoute } from "next";

// Servi par Next à /manifest.webmanifest — rend le site installable
// (Android Chrome, ordinateur) et, sur iPhone, permet de recevoir les
// notifications Web Push une fois ajouté à l'écran d'accueil (iOS 16.4+).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kabanalouer",
    short_name: "Kabanalouer",
    description:
      "Location de chalets au Québec — contact direct avec les propriétaires, aucun frais de service.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#636e40",
    lang: "fr-CA",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
