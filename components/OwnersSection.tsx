import OwnersClaimBanner from "@/components/OwnersClaimBanner";

// Bannière « Pour les proprios » des pages publiques (recherche, régions, villes, thèmes), juste avant le pied de page :
// la même que celle de l'accueil (components/OwnersClaimBanner.tsx). Gratuit, sans durée ni date.
export default function OwnersSection() {
  return <OwnersClaimBanner emplacement="banniere_site" />;
}
