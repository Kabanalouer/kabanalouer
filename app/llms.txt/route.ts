import { SITE_URL } from "@/lib/siteUrl";
import { REGIONS } from "@/lib/regions";
import { AMENITY_LANDINGS } from "@/lib/amenityLandings";
import { DEALS_PATH_FR } from "@/lib/promoLabel";
import { getThemeLinkVisibility } from "@/lib/themeLinks";
import { allActiveCombos, comboLinkLabel, comboPath, getComboIndex } from "@/lib/comboLandings";

// llms.txt (guide des pages pour les agents IA). Généré plutôt que statique :
// les pages par type, région et région/ville × type n'y figurent que
// lorsqu'elles existent et ont du contenu (mêmes règles que le pied de page
// et le sitemap). Remplace l'ancien public/llms.txt.
export const revalidate = 600;

export async function GET() {
  const [visibility, comboIndex] = await Promise.all([getThemeLinkVisibility(), getComboIndex()]);
  const url = (path: string) => `${SITE_URL}${path === "/" ? "" : path}`;

  const themeLines: string[] = [];
  if (visibility.dogFriendly) {
    themeLines.push(`- [Location de chalet avec chien](${url("/chalets/chiens-acceptes")}) : chalets où les chiens sont acceptés, avec le nombre maximum de chiens, les restrictions de poids et les frais de chaque chalet`);
  }
  if (visibility.accessible) {
    themeLines.push(`- [Location de chalet accessible aux personnes à mobilité réduite](${url("/chalets/accessible-mobilite-reduite")}) : chalets adaptés, avec le détail de l'entrée, de la salle de bain, de la chambre et de la circulation (mesures en cm et en pouces)`);
  }
  for (const l of AMENITY_LANDINGS) {
    if (visibility.amenities[l.key]) themeLines.push(`- [${l.h1Fr}](${url(l.pathFr)}) : ${l.metaDescriptionFr}`);
  }
  if (visibility.deals) {
    themeLines.push(`- [Chalets pas chers et en promotion](${url(DEALS_PATH_FR)}) : chalets avec un rabais en cours`);
  }

  const regionLines = REGIONS
    .filter((r) => visibility.activeRegionSlugs.includes(r.slug))
    .map((r) => `- [Location de chalet ${r.locative}](${url(`/chalets/${r.slug}`)})`);

  const combos = allActiveCombos(comboIndex);
  const comboLine = (l: (typeof combos)[number]) =>
    `- [${comboLinkLabel(l, false)}](${url(comboPath(l.theme, l.region, l.city, false))}) : ${l.count} chalets`;
  const regionComboLines = combos.filter((l) => !l.city).map(comboLine);
  const cityComboLines = combos.filter((l) => l.city).map(comboLine);

  const section = (title: string, lines: string[]) => (lines.length ? [`## ${title}`, "", ...lines, ""] : []);

  const body = [
    "# Kabanalouer",
    "",
    "> Kabanalouer est une marketplace de location de chalets au Québec, sans commission, permettant un contact direct entre voyageurs et proprios.",
    "",
    "## Pages principales",
    "",
    `- [Accueil](${SITE_URL}) : recherche de chalets par région`,
    `- [Chalets](${url("/chalets")}) : liste complète des chalets disponibles`,
    `- [Devenir proprio](${url("/devenir-hote")}) : inscrire son chalet sur la plateforme`,
    `- [Comment ça marche](${url("/comment-ca-marche")}) : fonctionnement pour voyageurs et propriétaires`,
    `- [FAQ propriétaires](${url("/faq-hotes")}) : questions fréquentes pour les proprios`,
    `- [À propos](${url("/a-propos")}) : présentation de Kabanalouer`,
    `- [Sitemap](${url("/sitemap.xml")}) : liste complète des pages, y compris chaque fiche de chalet`,
    "",
    ...section("Chalets par type", themeLines),
    ...section("Chalets par région", regionLines),
    ...section("Chalets par région et par type", regionComboLines),
    ...section("Chalets par ville et par type", cityComboLines),
    "## À propos",
    "",
    "Kabanalouer connecte directement les voyageurs et les propriétaires de chalets au Québec, sans frais de plateforme sur les réservations. Chaque fiche de chalet inclut les équipements, la capacité, les conditions (chiens acceptés avec nombre maximum, poids et frais, tabac, accessibilité aux personnes à mobilité réduite, arrivée/départ) et les coordonnées pour contacter le proprio directement. Les versions anglaises des pages sont sous /en/cabins.",
    "",
  ].join("\n");

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
