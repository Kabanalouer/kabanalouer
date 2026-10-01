import type { SupabaseClient } from "@supabase/supabase-js";

// Pages SEO/GEO thématiques basées sur un équipement de la fiche
// (listings.amenities, tableau jsonb de { id, details } — voir
// lib/amenities-catalog.ts). Une seule source de vérité pour les chemins,
// libellés et textes FR/EN ; la page elle-même est rendue par
// app/chalets/[...segments]/_components/AmenityLanding.tsx, résolue avant les
// régions dans le catch-all (même patron que /chalets/chiens-acceptes).
// Noindex, hors sitemap et lien du pied de page masqué sous
// MIN_CHALETS_FOR_INDEX (voir page.tsx, app/sitemap.ts, lib/themeLinks.ts).

export type AmenityLandingKey = "spa" | "waterfront" | "pool-table" | "ev-charger" | "remote-work";

type Tip = { title: string; body: string };

export interface AmenityLanding {
  key: AmenityLandingKey;
  // Un chalet apparaît sur la page s'il a AU MOINS UN de ces équipements.
  // Le premier sert au lien vers la recherche filtrée (/chalets?amenities=…).
  amenityIds: string[];
  icon: string; // nom d'icône de components/AmenityIcon.tsx
  slugFr: string;
  slugEn: string;
  pathFr: string;
  pathEn: string;
  h1Fr: string;
  h1En: string;
  metaTitleFr: string;
  metaTitleEn: string;
  metaDescriptionFr: string;
  metaDescriptionEn: string;
  // Libellé court : pied de page, fil d'Ariane, titre « … par région »
  linkFr: string;
  linkEn: string;
  // [singulier, pluriel] — « 3 chalets avec spa », « Aucun chalet avec spa »
  nounFr: [string, string];
  nounEn: [string, string];
  introFr: string;
  introEn: string;
  // Première réponse de la FAQ : « Tous les chalets de cette page ont un spa »
  allHaveFr: string;
  allHaveEn: string;
  // Question sur l'accès privé/partagé (équipements qui ont un champ « acces »)
  accessQuestionFr?: string;
  accessQuestionEn?: string;
  tipsTitleFr: string;
  tipsTitleEn: string;
  tipsFr: Tip[];
  tipsEn: Tip[];
}

function landing(
  entry: Omit<AmenityLanding, "pathFr" | "pathEn">
): AmenityLanding {
  return { ...entry, pathFr: `/chalets/${entry.slugFr}`, pathEn: `/en/cabins/${entry.slugEn}` };
}

export const AMENITY_LANDINGS: AmenityLanding[] = [
  landing({
    key: "spa",
    amenityIds: ["spa"],
    icon: "SpaSteam",
    slugFr: "avec-spa",
    slugEn: "hot-tub",
    h1Fr: "Location de chalet avec spa au Québec",
    h1En: "Cabin rentals with a hot tub in Quebec",
    metaTitleFr: "Location de chalet avec spa au Québec",
    metaTitleEn: "Cabin rentals with a hot tub in Quebec",
    metaDescriptionFr: "Trouvez un chalet à louer avec spa au Québec. Accès privé ou partagé et capacité indiqués sur chaque fiche. Contact direct avec les propriétaires, aucuns frais de service.",
    metaDescriptionEn: "Find a cabin for rent with a hot tub in Quebec. Private or shared access and capacity shown on each listing. Direct contact with owners, no service fees.",
    linkFr: "Chalets avec spa",
    linkEn: "Cabins with a hot tub",
    nounFr: ["chalet avec spa", "chalets avec spa"],
    nounEn: ["cabin with a hot tub", "cabins with a hot tub"],
    introFr: "Des chalets avec spa, partout au Québec, pour se détendre dans l'eau chaude après une journée de ski ou de plein air. Contact direct avec les propriétaires, aucuns frais de service.",
    introEn: "Cabins with a hot tub everywhere in Quebec, to relax in warm water after a day of skiing or hiking. Direct contact with owners, no service fees.",
    allHaveFr: "Tous les chalets de cette page ont un spa",
    allHaveEn: "Every cabin on this page has a hot tub",
    accessQuestionFr: "Le spa est-il privé ?",
    accessQuestionEn: "Is the hot tub private?",
    tipsTitleFr: "Avant de louer un chalet avec spa",
    tipsTitleEn: "Before renting a cabin with a hot tub",
    tipsFr: [
      { title: "Vérifiez l'accès", body: "Certains spas sont réservés au chalet, d'autres sont partagés. L'accès est indiqué sur la fiche quand le propriétaire l'a précisé." },
      { title: "Regardez la capacité", body: "Le nombre de personnes que le spa peut accueillir figure sur la fiche quand il est indiqué : pratique pour un séjour en groupe." },
      { title: "Voyagez l'hiver ?", body: "Certains spas ne sont ouverts qu'en saison. Si vous partez en hiver, confirmez avec le propriétaire qu'il sera accessible à vos dates." },
    ],
    tipsEn: [
      { title: "Check the access", body: "Some hot tubs are private to the cabin, others are shared. Access is shown on the listing when the owner has specified it." },
      { title: "Look at the capacity", body: "The number of people the hot tub can fit is shown on the listing when available: handy for group stays." },
      { title: "Travelling in winter?", body: "Some hot tubs are only open in season. If you are going in winter, confirm with the owner that it will be available on your dates." },
    ],
  }),
  landing({
    key: "waterfront",
    amenityIds: ["bord-eau", "acces-lac"],
    icon: "Waves",
    slugFr: "bord-de-l-eau",
    slugEn: "waterfront",
    h1Fr: "Location de chalet au bord de l'eau au Québec",
    h1En: "Waterfront cabin rentals in Quebec",
    metaTitleFr: "Location de chalet au bord de l'eau au Québec",
    metaTitleEn: "Waterfront cabin rentals in Quebec",
    metaDescriptionFr: "Trouvez un chalet à louer au bord de l'eau ou avec accès à un lac au Québec. Baignade, kayak et couchers de soleil sur l'eau. Contact direct avec les propriétaires, aucuns frais de service.",
    metaDescriptionEn: "Find a waterfront or lake-access cabin for rent in Quebec. Swimming, kayaking and sunsets on the water. Direct contact with owners, no service fees.",
    linkFr: "Chalets au bord de l'eau",
    linkEn: "Waterfront cabins",
    nounFr: ["chalet au bord de l'eau", "chalets au bord de l'eau"],
    nounEn: ["waterfront cabin", "waterfront cabins"],
    introFr: "Des chalets au bord de l'eau ou avec accès à un lac, partout au Québec, pour la baignade, le kayak ou simplement profiter de la vue. Contact direct avec les propriétaires, aucuns frais de service.",
    introEn: "Waterfront and lake-access cabins everywhere in Quebec, for swimming, kayaking or simply enjoying the view. Direct contact with owners, no service fees.",
    allHaveFr: "Tous les chalets de cette page sont au bord de l'eau ou ont un accès à un lac",
    allHaveEn: "Every cabin on this page is on the water or has lake access",
    tipsTitleFr: "Avant de louer un chalet au bord de l'eau",
    tipsTitleEn: "Before renting a waterfront cabin",
    tipsFr: [
      { title: "Bord de l'eau ou accès au lac", body: "Un chalet au bord de l'eau est directement sur la rive ; un accès au lac peut se trouver à quelques pas ou au bout d'un sentier. Les photos et la fiche vous aident à choisir." },
      { title: "Demandez pour les embarcations", body: "Certains propriétaires prêtent ou louent des kayaks, canots ou planches à pagaie. C'est indiqué sur la fiche quand le chalet en offre." },
      { title: "Avec de jeunes enfants", body: "Demandez au propriétaire la distance entre le chalet et l'eau, et s'il y a un quai ou une plage." },
    ],
    tipsEn: [
      { title: "Waterfront or lake access", body: "A waterfront cabin sits right on the shore; lake access can be a few steps away or at the end of a trail. Photos and the listing help you choose." },
      { title: "Ask about boats", body: "Some owners lend or rent kayaks, canoes or paddleboards. It is shown on the listing when the cabin offers them." },
      { title: "With young children", body: "Ask the owner how far the cabin is from the water, and whether there is a dock or a beach." },
    ],
  }),
  landing({
    key: "pool-table",
    amenityIds: ["table-billard"],
    icon: "Disc",
    slugFr: "table-de-billard",
    slugEn: "pool-table",
    h1Fr: "Location de chalet avec table de billard au Québec",
    h1En: "Cabin rentals with a pool table in Quebec",
    metaTitleFr: "Location de chalet avec table de billard au Québec",
    metaTitleEn: "Cabin rentals with a pool table in Quebec",
    metaDescriptionFr: "Trouvez un chalet à louer avec table de billard au Québec, idéal pour les séjours en famille ou entre amis. Contact direct avec les propriétaires, aucuns frais de service.",
    metaDescriptionEn: "Find a cabin for rent with a pool table in Quebec, great for family and group getaways. Direct contact with owners, no service fees.",
    linkFr: "Chalets avec table de billard",
    linkEn: "Cabins with a pool table",
    nounFr: ["chalet avec table de billard", "chalets avec table de billard"],
    nounEn: ["cabin with a pool table", "cabins with a pool table"],
    introFr: "Des chalets avec table de billard, partout au Québec, pour animer les soirées en famille ou entre amis. Contact direct avec les propriétaires, aucuns frais de service.",
    introEn: "Cabins with a pool table everywhere in Quebec, for fun evenings with family or friends. Direct contact with owners, no service fees.",
    allHaveFr: "Tous les chalets de cette page ont une table de billard",
    allHaveEn: "Every cabin on this page has a pool table",
    accessQuestionFr: "La table de billard est-elle privée ?",
    accessQuestionEn: "Is the pool table private?",
    tipsTitleFr: "Avant de louer un chalet avec table de billard",
    tipsTitleEn: "Before renting a cabin with a pool table",
    tipsFr: [
      { title: "Privée ou partagée", body: "La table peut être dans le chalet ou dans un espace commun. L'accès est indiqué sur la fiche quand le propriétaire l'a précisé." },
      { title: "Pensez au groupe", body: "Une salle de jeux fait le bonheur des grands groupes : vérifiez aussi la capacité et le nombre de chambres sur la fiche." },
      { title: "Posez vos questions", body: "Demandez au propriétaire si les queues et les boules sont fournies, et s'il y a d'autres jeux sur place." },
    ],
    tipsEn: [
      { title: "Private or shared", body: "The table can be inside the cabin or in a shared space. Access is shown on the listing when the owner has specified it." },
      { title: "Think about your group", body: "A game room is a hit with large groups: also check the capacity and number of bedrooms on the listing." },
      { title: "Ask your questions", body: "Ask the owner whether cues and balls are provided, and whether there are other games on site." },
    ],
  }),
  landing({
    key: "ev-charger",
    amenityIds: ["borne-recharge-vr"],
    icon: "Zap",
    slugFr: "borne-de-recharge",
    slugEn: "ev-charger",
    h1Fr: "Location de chalet avec borne de recharge au Québec",
    h1En: "Cabin rentals with an EV charger in Quebec",
    metaTitleFr: "Location de chalet avec borne de recharge au Québec",
    metaTitleEn: "Cabin rentals with an EV charger in Quebec",
    metaDescriptionFr: "Trouvez un chalet à louer avec borne de recharge pour véhicule électrique au Québec. Rechargez sur place pendant votre séjour. Contact direct avec les propriétaires, aucuns frais de service.",
    metaDescriptionEn: "Find a cabin for rent with an EV charging station in Quebec. Charge on site during your stay. Direct contact with owners, no service fees.",
    linkFr: "Chalets avec borne de recharge",
    linkEn: "Cabins with an EV charger",
    nounFr: ["chalet avec borne de recharge", "chalets avec borne de recharge"],
    nounEn: ["cabin with an EV charger", "cabins with an EV charger"],
    introFr: "Des chalets avec borne de recharge pour véhicule électrique, partout au Québec, pour arriver et repartir sans chercher de borne publique. Contact direct avec les propriétaires, aucuns frais de service.",
    introEn: "Cabins with an EV charging station everywhere in Quebec, so you can arrive and leave without looking for a public charger. Direct contact with owners, no service fees.",
    allHaveFr: "Tous les chalets de cette page ont une borne de recharge pour véhicule électrique",
    allHaveEn: "Every cabin on this page has an EV charging station",
    tipsTitleFr: "Avant de louer un chalet avec borne de recharge",
    tipsTitleEn: "Before renting a cabin with an EV charger",
    tipsFr: [
      { title: "Confirmez le type de borne", body: "Demandez au propriétaire le type de prise et la puissance de la borne pour vous assurer qu'elle convient à votre véhicule." },
      { title: "Frais de recharge", body: "Certains propriétaires incluent la recharge, d'autres demandent des frais. Posez la question avant de réserver." },
      { title: "Planifiez le trajet", body: "En région éloignée, les bornes publiques sont plus rares : une borne au chalet vous évite un détour à l'arrivée." },
    ],
    tipsEn: [
      { title: "Confirm the charger type", body: "Ask the owner about the plug type and charging power to make sure it works with your vehicle." },
      { title: "Charging fees", body: "Some owners include charging, others charge a fee. Ask before you book." },
      { title: "Plan your trip", body: "Public chargers are scarcer in remote regions: a charger at the cabin saves you a detour when you arrive." },
    ],
  }),
  landing({
    key: "remote-work",
    amenityIds: ["espace-travail"],
    icon: "Laptop",
    slugFr: "teletravail",
    slugEn: "remote-work",
    h1Fr: "Location de chalet pour le télétravail au Québec",
    h1En: "Cabin rentals for remote work in Quebec",
    metaTitleFr: "Location de chalet pour le télétravail au Québec",
    metaTitleEn: "Cabin rentals for remote work in Quebec",
    metaDescriptionFr: "Trouvez un chalet à louer avec un espace de travail pour le télétravail au Québec. Travaillez en nature, la semaine comme la fin de semaine. Contact direct avec les propriétaires, aucuns frais de service.",
    metaDescriptionEn: "Find a cabin for rent with a dedicated workspace for remote work in Quebec. Work surrounded by nature. Direct contact with owners, no service fees.",
    linkFr: "Chalets pour le télétravail",
    linkEn: "Cabins for remote work",
    nounFr: ["chalet pour le télétravail", "chalets pour le télétravail"],
    nounEn: ["cabin for remote work", "cabins for remote work"],
    introFr: "Des chalets avec un espace de travail, partout au Québec, pour télétravailler en nature et profiter du plein air après la journée. Contact direct avec les propriétaires, aucuns frais de service.",
    introEn: "Cabins with a workspace everywhere in Quebec, to work remotely surrounded by nature and enjoy the outdoors after hours. Direct contact with owners, no service fees.",
    allHaveFr: "Tous les chalets de cette page ont un espace de travail pour le télétravail",
    allHaveEn: "Every cabin on this page has a workspace for remote work",
    accessQuestionFr: "L'espace de travail est-il privé ?",
    accessQuestionEn: "Is the workspace private?",
    tipsTitleFr: "Avant de louer un chalet pour le télétravail",
    tipsTitleEn: "Before renting a cabin for remote work",
    tipsFr: [
      { title: "Vérifiez la connexion", body: "Si vous faites des appels vidéo, demandez au propriétaire le type et la vitesse de la connexion Internet." },
      { title: "Espace privé ou commun", body: "L'espace de travail peut être une pièce fermée ou un coin dans une aire commune. C'est indiqué sur la fiche quand le propriétaire l'a précisé." },
      { title: "Pensez aux séjours plus longs", body: "Le télétravail au chalet se prête bien aux séjours de semaine. Demandez au propriétaire s'il offre un prix à la semaine." },
    ],
    tipsEn: [
      { title: "Check the connection", body: "If you take video calls, ask the owner about the type and speed of the Internet connection." },
      { title: "Private or shared space", body: "The workspace can be a separate room or a corner of a shared area. It is shown on the listing when the owner has specified it." },
      { title: "Consider longer stays", body: "Remote work at a cabin is well suited to weekday stays. Ask the owner whether they offer a weekly rate." },
    ],
  }),
];

export function getAmenityLandingBySlug(slug: string, isEn: boolean): AmenityLanding | undefined {
  return AMENITY_LANDINGS.find((l) => (isEn ? l.slugEn : l.slugFr) === slug);
}

// Ids d'équipement présents dans un tableau listings.amenities (jsonb)
function amenityIdsOf(amenities: unknown): string[] {
  if (!Array.isArray(amenities)) return [];
  return amenities
    .map((a) => (a && typeof a === "object" ? (a as { id?: unknown }).id : null))
    .filter((id): id is string => typeof id === "string");
}

export function listingMatchesLanding(amenities: unknown, landing: AmenityLanding): boolean {
  const ids = amenityIdsOf(amenities);
  return landing.amenityIds.some((id) => ids.includes(id));
}

// Nombre de chalets publiés par page thématique, en une seule requête. Filtré
// côté JS plutôt qu'en PostgREST : un filtre .or() de plusieurs `cs` sur un
// tableau jsonb d'objets exige de citer le JSON (virgules), et le volume de
// fiches publiées reste petit.
export async function countAmenityLandingsWith(
  supabase: SupabaseClient
): Promise<Record<AmenityLandingKey, number>> {
  const { data, error } = await supabase
    .from("listings")
    .select("id, amenities")
    .eq("is_published", true);
  if (error) console.error("amenityLandings: erreur Supabase sur le décompte", error);
  const counts = Object.fromEntries(AMENITY_LANDINGS.map((l) => [l.key, 0])) as Record<AmenityLandingKey, number>;
  for (const row of data ?? []) {
    for (const l of AMENITY_LANDINGS) {
      if (listingMatchesLanding(row.amenities, l)) counts[l.key] += 1;
    }
  }
  return counts;
}
