export interface RegionConfig {
  slug: string;
  name: string;
  dbValue: string;       // Exact value stored in Supabase listings.region
  locative: string;      // French locative phrase
  seoText: string[];     // 2–3 SEO paragraphs
  heroImage: string;
}

export const REGIONS: RegionConfig[] = [
  {
    slug: "laurentides",
    name: "Laurentides",
    dbValue: "Laurentides",
    locative: "dans les Laurentides",
    heroImage: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1920&q=80",
    seoText: [
      "Les Laurentides constituent la destination de chalet la plus populaire du Québec, et pour cause : ski alpin à Mont-Tremblant et Saint-Sauveur, randonnée pédestre, lacs cristallins et vélo de montagne rythment les quatre saisons. À moins de deux heures de Montréal, cette région enchante autant les familles en quête de calme que les groupes d'amis en mode aventure.",
      "Louer un chalet dans les Laurentides, c'est choisir entre des propriétés au bord du lac idéales pour la baignade et le kayak, des refuges boisés avec jacuzzi au fond des bois, ou des chalets de luxe à deux pas des remontées mécaniques. L'hébergement s'adapte à tous les budgets et tous les styles de vacances.",
      "De Saint-Jérôme à Mont-Laurier en passant par Sainte-Agathe-des-Monts, les Laurentides offrent une diversité de paysages et d'activités incomparable. Réservez tôt — les chalets s'arrachent les fins de semaine de ski et les semaines d'été.",
    ],
  },
  {
    slug: "charlevoix",
    name: "Charlevoix",
    dbValue: "Charlevoix",
    locative: "en Charlevoix",
    heroImage: "https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?w=1920&q=80",
    seoText: [
      "Charlevoix est l'une des régions les plus spectaculaires du Québec, avec ses panoramas sur le fleuve Saint-Laurent, ses montagnes abruptes et ses villages de charme comme Baie-Saint-Paul et La Malbaie. Classé Réserve mondiale de la biosphère par l'UNESCO, Charlevoix attire les amateurs de nature, de gastronomie et d'art depuis des décennies.",
      "Un chalet en Charlevoix, c'est le privilège de se réveiller face au fleuve ou en altitude, d'observer les bélugas depuis la rive, et de dîner dans des restaurants qui valorisent les produits locaux — agneau de l'île aux Coudres, fromages fins, bières artisanales. Le Massif de Charlevoix offre l'une des meilleures descentes à ski de l'est du Canada.",
      "Toutes saisons, Charlevoix séduira ceux qui cherchent l'authenticité québécoise : randonnée dans les parcs régionaux, kayak de mer, festival d'art, ou simplement se ressourcer dans un chalet face au fleuve avec un bon livre et un feu de foyer.",
    ],
  },
  {
    slug: "cantons-de-lest",
    name: "Cantons-de-l'Est",
    dbValue: "Estrie (Cantons-de-l'Est)",
    locative: "dans les Cantons-de-l'Est",
    heroImage: "https://images.unsplash.com/photo-1470770903676-69b98201ea1c?w=1920&q=80",
    seoText: [
      "Les Cantons-de-l'Est (Estrie) sont une région de collines verdoyantes, de lacs pittoresques et de vignobles florissants, à moins d'une heure et demie de Montréal. Les chalets au bord du lac Memphrémagog, de l'Orford ou du Massawippi offrent un cadre bucolique en toute saison.",
      "En été, on pratique le vélo, la randonnée sur les sentiers de l'Appalachian Trail, la planche à pagaie et la baignade. À l'automne, la région se couvre de feuillage flamboyant — les Cantons sont réputés comme l'une des plus belles destinations au Québec pour les couleurs. L'hiver, le mont Orford et le Sutton attirent les skieurs.",
      "La région regorge de marchés locaux, de cidreries, de fromagers et de vignobles à visiter. Louer un chalet dans les Cantons-de-l'Est, c'est combiner nature, gastronomie et détente dans un environnement paisible.",
    ],
  },
  {
    slug: "lanaudiere",
    name: "Lanaudière",
    dbValue: "Lanaudière",
    locative: "en Lanaudière",
    heroImage: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80",
    seoText: [
      "La région de Lanaudière, juste au nord de Montréal, est un vaste territoire de lacs, de rivières et de forêts boréales idéal pour les amoureux de la nature sauvage. Du Bas-Lanaudière agricole aux montagnes du Haut-Lanaudière, la région offre une grande diversité de paysages et d'activités de plein air.",
      "L'été, les rivières L'Assomption, Ouareau et Rouge sont prisées pour le canot, le kayak et le rafting. Les lacs du Haut-Lanaudière accueillent de nombreux chalets et pourvoiries. La région abrite aussi le Festival de Lanaudière, l'un des plus importants festivals de musique classique en Amérique du Nord.",
      "En hiver, les sentiers de ski de fond et de motoneige s'étendent à perte de vue. Plusieurs centres de ski, dont Val Saint-Côme, animent la saison froide. Un chalet en Lanaudière, c'est la garantie d'une escapade ressourçante loin de l'agitation urbaine.",
    ],
  },
  {
    slug: "mauricie",
    name: "Mauricie",
    dbValue: "Mauricie",
    locative: "en Mauricie",
    heroImage: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80",
    seoText: [
      "La Mauricie est une région de nature grandiose, dominée par le parc national de la Mauricie — 536 km² de forêts, de lacs et de rivières. Ce parc est l'un des plus beaux du Québec pour le canot-camping, la randonnée et l'observation de la faune. La rivière Saint-Maurice et ses paysages sauvages complètent le tableau.",
      "Louer un chalet en Mauricie, c'est profiter d'un accès direct aux sentiers du parc national, aux rivières à truites, aux forêts où rôdent l'orignal et l'ours. Shawinigan, réinventée en ville de culture et de plein air, est une base idéale pour explorer la région.",
      "L'hiver, la région se transforme : motoneige sur des centaines de kilomètres de sentiers balisés, raquettes en forêt, pêche sur glace. Toute l'année, la Mauricie est une invitation à ralentir et à se reconnecter avec la nature.",
    ],
  },
  {
    slug: "outaouais",
    name: "Outaouais",
    dbValue: "Outaouais",
    locative: "en Outaouais",
    heroImage: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1920&q=80",
    seoText: [
      "L'Outaouais est une région méconnue et pourtant magnifique, aux portes de Gatineau et d'Ottawa. Le parc de la Gatineau offre 361 km² de sentiers, de lacs et de panoramas sur la vallée. Plus au nord, la vallée de la Petite-Nation et la région de Montebello séduisent par leur nature préservée et leur atmosphère authentique.",
      "Un chalet en Outaouais, c'est la possibilité de combiner nature sauvage et vie culturelle. La rivière des Outaouais et ses affluents sont idéaux pour le canot, la pêche et le kayak. Le Château Montebello et ses environs offrent des paysages sublimes en toute saison.",
      "En été, on profite des lacs de la Petite-Nation et des sentiers de vélo de montagne. L'automne est splendide avec les couleurs des feuilles. En hiver, le parc de la Gatineau propose l'un des meilleurs réseaux de ski de fond de la région.",
    ],
  },
  {
    slug: "saguenay-lac-saint-jean",
    name: "Saguenay–Lac-Saint-Jean",
    dbValue: "Saguenay–Lac-Saint-Jean",
    locative: "au Saguenay–Lac-Saint-Jean",
    heroImage: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80",
    seoText: [
      "Le Saguenay–Lac-Saint-Jean est une région de caractère, fière de son identité bleuette et de ses paysages spectaculaires. Le fjord du Saguenay, l'un des plus impressionnants en Amérique du Nord, contraste avec les grandes étendues plates et agricoles du Lac-Saint-Jean.",
      "Le tour du Lac-Saint-Jean à vélo (250 km) est une expérience légendaire. La pêche au doré, à l'omble de fontaine et au brochet est réputée dans la région. L'été, les myrtilles sauvages envahissent les sous-bois. Le parc national du Fjord-du-Saguenay et le parc national de la Pointe-Taillon offrent des expériences de plein air inoubliables.",
      "En hiver, les sentiers de motoneige s'étendent sur des milliers de kilomètres. Un chalet au bord du Lac-Saint-Jean en hiver, avec le coucher de soleil sur la glace et un feu crépitant dans l'âtre, est une expérience unique au monde.",
    ],
  },
  {
    slug: "bas-saint-laurent",
    name: "Bas-Saint-Laurent",
    dbValue: "Bas-Saint-Laurent",
    locative: "dans le Bas-Saint-Laurent",
    heroImage: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1920&q=80",
    seoText: [
      "Le Bas-Saint-Laurent s'étend le long du fleuve Saint-Laurent, entre Rivière-du-Loup et Matane, offrant des paysages côtiers à couper le souffle. Le parc national du Bic, avec ses promontoires rocheux et ses phoques, est l'un des joyaux de la région.",
      "Un chalet dans le Bas-Saint-Laurent, c'est profiter du fleuve dans toute sa majesté — pêche au saumon sur la rivière Mitis ou Matapédia, kayak de mer dans les archipels, observation des baleines au large. La région est aussi reconnue pour ses fruits de mer, agneaux de lait et fromages artisanaux.",
      "En hiver, les randonnées en raquettes dans les Appalaches, la pêche sur glace et les sentiers de motoneige attirent les adeptes de plein air. Le Bas-Saint-Laurent offre un dépaysement complet et une hospitalité chaleureuse.",
    ],
  },
  {
    slug: "gaspesie",
    name: "Gaspésie",
    dbValue: "Gaspésie",
    locative: "en Gaspésie",
    heroImage: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80",
    seoText: [
      "La Gaspésie, c'est le bout du monde québécois — et c'est précisément ce qui la rend inoubliable. Avec le rocher Percé et l'île Bonaventure, le parc national de la Gaspésie et ses sommets dépassant 1 000 mètres, les falaises de la côte sauvage et les villages de pêcheurs accrochés au bord du fleuve, la Gaspésie est une destination d'exception.",
      "Louer un chalet en Gaspésie, c'est vivre l'expérience d'une région préservée où la nature reprend tous ses droits. La pêche au saumon dans les rivières Bonaventure, York ou Matapédia est légendaire. Le mont Albert offre des randonnées alpines uniques au Québec.",
      "La Gaspésie se mérite — il faut conduire plusieurs heures depuis Québec ou Montréal — mais ceux qui font ce voyage reviennent changés. Une destination pour les amants de grands espaces et les chercheurs d'aventures authentiques.",
    ],
  },
  {
    slug: "abitibi-temiscamingue",
    name: "Abitibi-Témiscamingue",
    dbValue: "Abitibi-Témiscamingue",
    locative: "en Abitibi-Témiscamingue",
    heroImage: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1920&q=80",
    seoText: [
      "L'Abitibi-Témiscamingue est une région de forêt boréale, de lacs immenses et de ciel étoilé comme nulle part ailleurs au Québec. Éloignée des grands centres, elle attire les voyageurs en quête de nature sauvage intacte, de pêche sportive et d'authenticité. Les aurores boréales y sont visibles plusieurs nuits par hiver.",
      "Le lac Témiscamingue, le réservoir Kipawa et les centaines de lacs de la région offrent une pêche exceptionnelle : doré, brochet, touladi et omble de fontaine. Les pourvoiries de l'Abitibi sont parmi les meilleures du Québec.",
      "Louer un chalet en Abitibi-Témiscamingue, c'est choisir l'aventure et la déconnexion totale — et rentrer chez soi avec des souvenirs de nature pure qui durent toute une vie.",
    ],
  },
  {
    slug: "cote-nord",
    name: "Côte-Nord",
    dbValue: "Côte-Nord",
    locative: "sur la Côte-Nord",
    heroImage: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80",
    seoText: [
      "La Côte-Nord est l'une des régions les plus sauvages du Québec, s'étirant sur plus de 1 300 km le long du fleuve Saint-Laurent. C'est ici que les bélugas et les baleines bleues fréquentent les eaux du fjord du Saguenay, offrant des spectacles d'observation de la faune marine incomparables.",
      "Tadoussac et les Bergeronnes sont les capitales mondiales de l'observation des baleines. Les archipels de Mingan, classés Réserve de la biosphère, abritent des formations calcaires uniques. L'île d'Anticosti est un paradis pour la pêche au saumon.",
      "Louer un chalet sur la Côte-Nord, c'est accepter de s'éloigner de tout pour mieux se retrouver. Les routes sont longues, les espaces sont immenses, et les étoiles sont plus nombreuses que partout ailleurs au Québec.",
    ],
  },
  {
    slug: "monteregie",
    name: "Montérégie",
    dbValue: "Montérégie",
    locative: "en Montérégie",
    heroImage: "https://images.unsplash.com/photo-1444464666168-49d633b86797?w=1920&q=80",
    seoText: [
      "La Montérégie est la région agricole par excellence du Québec, parsemée de vergers, de vignobles, de cidreries et de fromageries artisanales. À moins d'une heure de Montréal, elle offre un contraste saisissant avec la vie urbaine : champs à perte de vue, montérégiennes et le majestueux fleuve Saint-Laurent.",
      "L'agrotourisme est roi en Montérégie : cueillette de pommes et de fraises, dégustations de vins et de cidres de glace, marchés publics. Les amateurs de plein air apprécieront les sentiers du parc national du Mont-Saint-Bruno et les pistes cyclables le long du Saint-Laurent.",
      "Un chalet en Montérégie, c'est profiter de la campagne québécoise dans ce qu'elle a de plus généreux, tout en restant proche de Montréal. Idéal pour les escapades de fin de semaine en famille ou en couple, toute l'année.",
    ],
  },
  {
    slug: "chaudiere-appalaches",
    name: "Chaudière-Appalaches",
    dbValue: "Chaudière-Appalaches",
    locative: "en Chaudière-Appalaches",
    heroImage: "https://images.unsplash.com/photo-1487621167305-5d248087c724?w=1920&q=80",
    seoText: [
      "Chaudière-Appalaches s'étend sur la rive sud du Saint-Laurent, face à Québec, entre les plaines du fleuve et les premiers contreforts des Appalaches. La région est une porte d'entrée vers les paysages des Appalaches québécoises, avec leurs vallées boisées, leurs rivières à truites et leurs sommets arrondis.",
      "La rivière Chaudière traverse la région en offrant de nombreux spots de pêche et de kayak. Les parcs régionaux des Appalaches et de Frontenac proposent des activités de plein air variées en toute saison. La région est aussi réputée pour ses acériculteurs de renom et ses ponts couverts historiques.",
      "Un chalet en Chaudière-Appalaches, c'est la tranquillité des campagnes québécoises à quelques minutes de la Vieille Capitale, avec ses cabanes à sucre, ses fromageries artisanales et ses paysages enneigés l'hiver.",
    ],
  },
  {
    slug: "capitale-nationale",
    name: "Capitale-Nationale",
    dbValue: "Québec (ville et région)",
    locative: "dans la Capitale-Nationale",
    heroImage: "https://images.unsplash.com/photo-1548695607-9c73430379f9?w=1920&q=80",
    seoText: [
      "La région de la Capitale-Nationale englobe Québec, la vieille ville fortifiée, mais aussi les magnifiques campagnes de la Côte-de-Beaupré, de l'Île d'Orléans et du nord jusqu'à la réserve faunique des Laurentides. Louer un chalet dans cette région, c'est combiner culture urbaine et nature sauvage à quelques kilomètres de distance.",
      "L'Île d'Orléans, surnommée le « jardin du Québec », offre des tables champêtres, des fromageries et des vergers dans un cadre pastoral unique. La Côte-de-Beaupré mène à la grandiose chute Montmorency et au mont Sainte-Anne, l'une des importantes stations de ski alpin de l'est du Canada.",
      "Le parc de la Jacques-Cartier, au nord de Québec, est un paradis de canot-camping l'été et de raquettes l'hiver. Un chalet dans la Capitale-Nationale vous place au cœur de l'histoire et de la nature québécoise.",
    ],
  },
];

export function getRegionBySlug(slug: string): RegionConfig | undefined {
  return REGIONS.find((r) => r.slug === slug);
}

export function getRegionSlugs(): string[] {
  return REGIONS.map((r) => r.slug);
}

// Retrouve le slug de page publique (/chalets/[slug]) à partir de la valeur région
// stockée en base (listings.region / featured_listings.region) — utilisé pour lier
// le nom de région vers sa page publique dans les emails de boost.
export function getRegionSlugByDbValue(dbValue: string): string | undefined {
  return REGIONS.find((r) => r.dbValue === dbValue)?.slug;
}
