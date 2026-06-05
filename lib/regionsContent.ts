export interface RegionContent {
  slug: string;
  region_fr: string;
  region_en: string;
  locative_en: string;
  description_en: string[];
  highlights_fr: string[];
  highlights_en: string[];
  meta_title_fr: string;
  meta_title_en: string;
  meta_description_fr: string;
  meta_description_en: string;
  faq_fr: { question: string; answer: string }[];
  faq_en: { question: string; answer: string }[];
}

const REGIONS_CONTENT: RegionContent[] = [
  {
    slug: "laurentides",
    region_fr: "les Laurentides",
    region_en: "the Laurentians",
    locative_en: "in the Laurentians",
    description_en: [
      "The Laurentians are Quebec's most beloved cottage country, drawing visitors year-round with world-class skiing at Mont-Tremblant and Saint-Sauveur, crystal-clear lakes ideal for swimming and kayaking, and hundreds of kilometres of trails for hiking and mountain biking. Just under two hours from Montreal, this scenic region delights families seeking peaceful escapes and groups of friends looking for outdoor adventure.",
      "Renting a cabin in the Laurentians means choosing between lakefront retreats perfect for summer water activities, forest hideaways with hot tubs nestled deep in the pines, or luxury ski chalets steps from the chairlifts. Accommodations here suit every budget and every style of getaway.",
      "From Saint-Jérôme to Mont-Laurier via Sainte-Agathe-des-Monts, the Laurentians offer an unmatched diversity of landscapes and activities. Book early — cabins are in high demand on ski weekends and summer weeks.",
    ],
    highlights_fr: [
      "Ski alpin à Mont-Tremblant et Saint-Sauveur",
      "Lacs cristallins pour la baignade et le kayak",
      "Randonnée et vélo de montagne",
      "Spas nordiques et jacuzzis en forêt",
      "À moins de 2 h de Montréal",
    ],
    highlights_en: [
      "World-class skiing at Mont-Tremblant and Saint-Sauveur",
      "Crystal-clear lakes for swimming and kayaking",
      "Hiking and mountain biking trails",
      "Nordic spas and forest hot tubs",
      "Under 2 hours from Montreal",
    ],
    meta_title_fr: "Chalets à louer dans les Laurentides | Kabanalouer",
    meta_title_en: "Cabin Rentals in the Laurentians, Quebec | Kabanalouer",
    meta_description_fr: "Trouvez votre chalet dans les Laurentides — ski, lacs et randonnée. Contact direct avec les propriétaires québécois. Aucun frais de service.",
    meta_description_en: "Rent a cabin in the Laurentians, Quebec. Skiing, lakes, hiking — direct contact with local owners. No service fees. Book your getaway today.",
    faq_fr: [
      {
        question: "Quand est-il préférable de louer un chalet dans les Laurentides ?",
        answer: "Les Laurentides sont magnifiques en toute saison. L'hiver (décembre à mars) est idéal pour le ski alpin à Mont-Tremblant et Saint-Sauveur. L'été (juin à août) attire les amoureux des lacs et de la randonnée. L'automne offre un feuillage splendide, et le printemps propose des escapades tranquilles à prix réduit.",
      },
      {
        question: "Quelles activités faire dans les Laurentides ?",
        answer: "Les Laurentides offrent le ski alpin et de fond, le vélo de montagne, la randonnée pédestre, le canot-kayak, la baignade en lac, la pêche, la motoneige et les spas nordiques. Il y a de quoi s'occuper pour toute la famille, peu importe la saison.",
      },
      {
        question: "Combien coûte la location d'un chalet dans les Laurentides ?",
        answer: "Les prix varient selon la taille, la saison et les équipements. Comptez en général entre 150 $ et 500 $ la nuit pour un chalet familial. Les weekends de ski et les vacances scolaires sont les périodes les plus achalandées — réservez à l'avance pour les meilleures disponibilités.",
      },
    ],
    faq_en: [
      {
        question: "When is the best time to rent a cabin in the Laurentians?",
        answer: "The Laurentians are beautiful year-round. Winter (December to March) is ideal for alpine skiing at Mont-Tremblant and Saint-Sauveur. Summer (June to August) is great for lake activities and hiking. Fall brings spectacular foliage, and spring offers peaceful escapes at lower prices.",
      },
      {
        question: "What activities are available in the Laurentians?",
        answer: "The Laurentians offer downhill and cross-country skiing, mountain biking, hiking, canoeing, kayaking, swimming, fishing, snowmobiling, and Nordic spas. There is something for every member of the family, no matter the season.",
      },
      {
        question: "How much does it cost to rent a cabin in the Laurentians?",
        answer: "Prices vary by size, season, and amenities. Expect to pay between $150 and $500 per night for a family cabin. Ski weekends and school holidays are the busiest periods — book early for the best selection.",
      },
    ],
  },
  {
    slug: "charlevoix",
    region_fr: "Charlevoix",
    region_en: "Charlevoix",
    locative_en: "in Charlevoix",
    description_en: [
      "Charlevoix is one of Quebec's most spectacular regions, with sweeping views over the St. Lawrence River, dramatic cliffs, and charming villages like Baie-Saint-Paul and La Malbaie. Recognized as a UNESCO World Biosphere Reserve, Charlevoix has long attracted lovers of nature, gastronomy, and the arts.",
      "Renting a cabin in Charlevoix means waking up to views of the St. Lawrence or the mountains, watching belugas from the shore, and dining at farm-to-table restaurants celebrating local products — lamb from Île aux Coudres, fine cheeses, craft beers. Le Massif de Charlevoix offers some of the finest ski runs in Eastern Canada.",
      "Charlevoix is a destination for every season: hiking in regional parks, sea kayaking, arts festivals, or simply unwinding in a cozy cabin by the river with a good book and a crackling fire.",
    ],
    highlights_fr: [
      "Vue panoramique sur le fleuve Saint-Laurent",
      "Ski au Massif de Charlevoix",
      "Observation des bélugas et baleines",
      "Gastronomie locale réputée",
      "Réserve mondiale de la biosphère UNESCO",
    ],
    highlights_en: [
      "Panoramic St. Lawrence River views",
      "Skiing at Le Massif de Charlevoix",
      "Beluga and whale watching",
      "Renowned local gastronomy",
      "UNESCO World Biosphere Reserve",
    ],
    meta_title_fr: "Chalets à louer en Charlevoix, Québec | Kabanalouer",
    meta_title_en: "Cabin Rentals in Charlevoix, Quebec | Kabanalouer",
    meta_description_fr: "Louez un chalet en Charlevoix avec vue sur le fleuve Saint-Laurent. Ski, gastronomie, nature. Contact direct avec les propriétaires. Aucun frais.",
    meta_description_en: "Rent a cabin in Charlevoix, Quebec. River views, skiing, gourmet food, whale watching — direct contact with local owners. No service fees.",
    faq_fr: [
      {
        question: "Que faire en Charlevoix en été ?",
        answer: "En été, Charlevoix offre le kayak de mer, la randonnée pédestre dans les parcs régionaux, l'observation des baleines au large de Tadoussac, le vélo et la visite des producteurs artisanaux locaux. Les festivals d'art animent les villages tout au long de la belle saison.",
      },
      {
        question: "Charlevoix est-il accessible en hiver ?",
        answer: "Oui, Charlevoix est une destination hivernale de premier plan. Le Massif de Charlevoix est l'une des plus grandes stations de ski de l'est du Canada avec une dénivellation exceptionnelle. La raquette, le ski de fond et les séjours cocooning au chalet complètent l'offre hivernale.",
      },
      {
        question: "Quelle est la meilleure façon de se rendre en Charlevoix ?",
        answer: "Charlevoix est accessible en voiture depuis Québec en environ 1h30 en suivant la route 138 le long du fleuve. Cette route panoramique fait elle-même partie de l'expérience. La région est aussi accessible via le traversier de Saint-Siméon depuis la rive sud.",
      },
    ],
    faq_en: [
      {
        question: "What is there to do in Charlevoix in summer?",
        answer: "In summer, Charlevoix offers sea kayaking, hiking in regional parks, whale watching off Tadoussac, cycling, and visits to local artisan producers. Arts festivals bring the villages to life throughout the warm season.",
      },
      {
        question: "Is Charlevoix accessible in winter?",
        answer: "Yes, Charlevoix is a top winter destination. Le Massif de Charlevoix is one of Eastern Canada's largest ski resorts with exceptional vertical drop. Snowshoeing, cross-country skiing, and cozy cabin stays round out the winter experience.",
      },
      {
        question: "How do I get to Charlevoix?",
        answer: "Charlevoix is accessible by car from Quebec City in about 1.5 hours, following Route 138 along the river — a scenic drive that is part of the experience. The Saint-Siméon ferry also connects the region from the south shore.",
      },
    ],
  },
  {
    slug: "cantons-de-lest",
    region_fr: "les Cantons-de-l'Est",
    region_en: "the Eastern Townships",
    locative_en: "in the Eastern Townships",
    description_en: [
      "The Eastern Townships (Estrie) are a region of rolling green hills, picturesque lakes, and thriving vineyards, less than ninety minutes from Montreal. Cabins along Lake Memphrémagog, near Mount Orford, or beside Lake Massawippi offer a bucolic setting in every season.",
      "In summer, cycle the trails, hike along the Appalachian Trail, paddleboard on the lakes, and swim. Autumn is spectacular — the Eastern Townships are known as one of Quebec's most beautiful fall foliage destinations. Winter brings skiing at Mount Orford and Sutton.",
      "The region is dotted with farmers' markets, cider houses, cheese makers, and vineyards. Renting a cabin in the Eastern Townships means combining nature, gourmet food, and relaxation in a peaceful, pastoral setting.",
    ],
    highlights_fr: [
      "Vignobles et cidreries artisanales",
      "Ski à Mont-Orford et Sutton",
      "Randonnée sur les sentiers des Appalaches",
      "Feuillage d'automne spectaculaire",
      "À 90 min de Montréal",
    ],
    highlights_en: [
      "Vineyards and artisan cider houses",
      "Skiing at Mount Orford and Sutton",
      "Hiking on the Appalachian Trail",
      "Spectacular fall foliage",
      "90 min from Montreal",
    ],
    meta_title_fr: "Chalets à louer dans les Cantons-de-l'Est | Kabanalouer",
    meta_title_en: "Cabin Rentals in the Eastern Townships, QC | Kabanalouer",
    meta_description_fr: "Chalets à louer dans les Cantons-de-l'Est, Québec. Vignobles, ski, randonnée et lacs. Contact direct propriétaires. Aucun frais de service.",
    meta_description_en: "Rent a cabin in Quebec's Eastern Townships. Vineyards, skiing, hiking, and lakes — direct contact with local owners. No service fees.",
    faq_fr: [
      {
        question: "Quels sont les meilleurs lacs des Cantons-de-l'Est pour louer un chalet ?",
        answer: "Le lac Memphrémagog (autour de Magog) est le plus populaire pour les chalets au bord de l'eau, suivi du lac Massawippi (North Hatley) et du lac Orford. Ces lacs offrent baignade, nautisme et une ambiance estivale incomparable.",
      },
      {
        question: "Les Cantons-de-l'Est sont-ils une bonne destination pour l'automne ?",
        answer: "Absolument — les Cantons-de-l'Est sont l'une des plus belles destinations de feuillage au Québec. De mi-septembre à mi-octobre, les collines se couvrent de rouge, d'orange et de jaune. C'est aussi la période idéale pour visiter les vignobles et les cidreries.",
      },
      {
        question: "Quelles activités hivernales sont disponibles dans les Cantons-de-l'Est ?",
        answer: "Le ski alpin aux stations de Mont-Orford et Sutton est la principale attraction hivernale. Les Cantons offrent aussi le ski de fond, la raquette, la pêche sur glace et de nombreux spas nordiques pour se ressourcer après une journée en plein air.",
      },
    ],
    faq_en: [
      {
        question: "Which lakes in the Eastern Townships are best for renting a cabin?",
        answer: "Lake Memphrémagog near Magog is the most popular for waterfront cabins, followed by Lake Massawippi (North Hatley) and Lake Orford. These lakes offer swimming, boating, and an unbeatable summer atmosphere.",
      },
      {
        question: "Are the Eastern Townships a good destination for fall?",
        answer: "Absolutely — the Eastern Townships are one of Quebec's most beautiful fall foliage destinations. From mid-September to mid-October, the hillsides turn red, orange, and gold. It is also the perfect time to visit vineyards and cider houses.",
      },
      {
        question: "What winter activities are available in the Eastern Townships?",
        answer: "Alpine skiing at Mount Orford and Sutton is the main winter attraction. The Townships also offer cross-country skiing, snowshoeing, ice fishing, and many Nordic spas for unwinding after a day outdoors.",
      },
    ],
  },
  {
    slug: "lanaudiere",
    region_fr: "Lanaudière",
    region_en: "Lanaudière",
    locative_en: "in Lanaudière",
    description_en: [
      "The Lanaudière region, just north of Montreal, spans a vast territory of lakes, rivers, and boreal forests ideal for nature lovers. From the agricultural plains of Bas-Lanaudière to the mountains of Haut-Lanaudière, the region offers a rich variety of landscapes and outdoor activities.",
      "In summer, the L'Assomption, Ouareau, and Rouge rivers draw canoeists, kayakers, and whitewater enthusiasts. The lakes of Haut-Lanaudière host countless cottages and wilderness lodges. The region is also home to the Festival de Lanaudière, one of the most important classical music festivals in North America.",
      "In winter, cross-country ski and snowmobile trails stretch as far as the eye can see. Several ski resorts, including Val Saint-Côme, liven up the cold season. A cabin in Lanaudière is the perfect recipe for a restorative escape from urban life.",
    ],
    highlights_fr: [
      "Canot et kayak sur les rivières Rouge et Ouareau",
      "Festival de Lanaudière (musique classique)",
      "Ski alpin à Val Saint-Côme",
      "Motoneige sur des centaines de km de sentiers",
      "Nature accessible à 1 h de Montréal",
    ],
    highlights_en: [
      "Canoeing on the Rouge and Ouareau rivers",
      "Festival de Lanaudière (classical music)",
      "Alpine skiing at Val Saint-Côme",
      "Snowmobiling on hundreds of km of trails",
      "Wilderness 1 hour from Montreal",
    ],
    meta_title_fr: "Chalets à louer en Lanaudière, Québec | Kabanalouer",
    meta_title_en: "Cabin Rentals in Lanaudière, Quebec | Kabanalouer",
    meta_description_fr: "Chalets à louer en Lanaudière — lacs, rivières et forêts boréales. Contact direct avec les propriétaires québécois. Aucun frais de service.",
    meta_description_en: "Rent a cabin in Lanaudière, Quebec. Lakes, rivers, and boreal forests — direct contact with local owners. No service fees. Book your escape.",
    faq_fr: [
      {
        question: "Quelles activités de plein air pratiquer en Lanaudière ?",
        answer: "Lanaudière est une destination de choix pour le canot, le kayak et le rafting sur les rivières Rouge, Ouareau et L'Assomption. En été, les lacs du Haut-Lanaudière sont parfaits pour la baignade et la pêche. L'hiver, la région propose ski alpin, ski de fond et motoneige.",
      },
      {
        question: "Où se trouve Lanaudière par rapport à Montréal ?",
        answer: "Lanaudière est située immédiatement au nord de Montréal — à moins d'une heure pour le Bas-Lanaudière, et environ 1h30 à 2h pour le Haut-Lanaudière (région de Saint-Donat et Rawdon). C'est l'une des escapades nature les plus proches de la métropole.",
      },
      {
        question: "La Lanaudière est-elle une bonne région pour la pêche ?",
        answer: "Oui, Lanaudière est reconnue pour sa pêche sportive de qualité. Les rivières Rouge, Ouareau et leurs affluents abritent la truite mouchetée, le doré et le grand brochet. De nombreuses pourvoiries proposent des accès exclusifs à des lacs peu exploités.",
      },
    ],
    faq_en: [
      {
        question: "What outdoor activities can I enjoy in Lanaudière?",
        answer: "Lanaudière is a top destination for canoeing, kayaking, and whitewater rafting on the Rouge, Ouareau, and L'Assomption rivers. In summer, the lakes of Haut-Lanaudière are perfect for swimming and fishing. Winter brings alpine skiing, cross-country skiing, and snowmobiling.",
      },
      {
        question: "How far is Lanaudière from Montreal?",
        answer: "Lanaudière is immediately north of Montreal — under an hour for Bas-Lanaudière, and about 1.5 to 2 hours for Haut-Lanaudière (Saint-Donat and Rawdon area). It is one of the closest nature escapes from the city.",
      },
      {
        question: "Is Lanaudière a good region for fishing?",
        answer: "Yes, Lanaudière is well known for quality sport fishing. The Rouge, Ouareau, and their tributaries hold brook trout, walleye, and northern pike. Many wilderness lodges offer fishing packages on secluded lakes.",
      },
    ],
  },
  {
    slug: "mauricie",
    region_fr: "la Mauricie",
    region_en: "Mauricie",
    locative_en: "in Mauricie",
    description_en: [
      "Mauricie is a region of grand natural landscapes, anchored by Mauricie National Park — 536 km² of forests, lakes, and rivers. One of Quebec's most beautiful parks for canoe-camping, hiking, and wildlife watching, it is complemented by the wild scenery of the Saint-Maurice River.",
      "Renting a cabin in Mauricie means having direct access to national park trails, trout streams, and forests where moose and bears roam. Shawinigan, reinvented as a city of culture and outdoor recreation, makes an ideal base for exploring the region.",
      "In winter, the region transforms: snowmobiling on hundreds of kilometres of groomed trails, snowshoeing in the forest, and ice fishing on frozen lakes. Year-round, Mauricie is an invitation to slow down and reconnect with nature.",
    ],
    highlights_fr: [
      "Parc national de la Mauricie (canot-camping)",
      "Pêche à la truite sur la rivière Saint-Maurice",
      "Motoneige sur des centaines de km de sentiers",
      "Observation de la faune (orignal, ours)",
      "Shawinigan — ville de culture et plein air",
    ],
    highlights_en: [
      "Mauricie National Park (canoe-camping)",
      "Trout fishing on the Saint-Maurice River",
      "Snowmobiling on hundreds of km of trails",
      "Wildlife watching (moose, black bear)",
      "Shawinigan — culture and outdoor city",
    ],
    meta_title_fr: "Chalets à louer en Mauricie, Québec | Kabanalouer",
    meta_title_en: "Cabin Rentals in Mauricie, Quebec | Kabanalouer",
    meta_description_fr: "Chalets à louer en Mauricie — parc national, canot, pêche et motoneige. Contact direct propriétaires. Aucun frais de service.",
    meta_description_en: "Rent a cabin in Mauricie, Quebec. National park, canoeing, fishing, snowmobiling — direct contact with owners. No service fees. Book today.",
    faq_fr: [
      {
        question: "Que faire au parc national de la Mauricie ?",
        answer: "Le parc national de la Mauricie est idéal pour le canot-camping, avec plus de 150 km de circuits navigables. Il propose aussi des sentiers de randonnée, de l'interprétation de la nature, de la pêche dans des lacs intérieurs et une observation de la faune exceptionnelle : orignal, ours, loup et castor.",
      },
      {
        question: "La Mauricie est-elle bien reliée aux grands centres ?",
        answer: "La Mauricie est à environ 1h45 de Montréal et 1h30 de Québec par l'autoroute 40. Trois-Rivières est la capitale régionale et Shawinigan est à 20 minutes de là. La région est très accessible en voiture.",
      },
      {
        question: "Peut-on faire de la motoneige en Mauricie ?",
        answer: "Oui, la Mauricie est l'une des meilleures régions du Québec pour la motoneige. Le réseau de sentiers balisés couvre des centaines de kilomètres et relie plusieurs villages. La saison dure habituellement de décembre à mars selon les conditions d'enneigement.",
      },
    ],
    faq_en: [
      {
        question: "What can I do at Mauricie National Park?",
        answer: "Mauricie National Park is perfect for canoe-camping, with over 150 km of navigable circuits. It also offers hiking trails, nature interpretation, fishing in interior lakes, and exceptional wildlife watching — moose, black bear, wolf, and beaver.",
      },
      {
        question: "Is Mauricie easily accessible from major cities?",
        answer: "Mauricie is about 1 hour 45 minutes from Montreal and 1 hour 30 minutes from Quebec City via Highway 40. Trois-Rivières is the regional capital, and Shawinigan is 20 minutes away. The region is very accessible by car.",
      },
      {
        question: "Can I go snowmobiling in Mauricie?",
        answer: "Yes, Mauricie is one of Quebec's best snowmobiling regions. The groomed trail network covers hundreds of kilometres and connects several villages and towns. The season typically runs from December to March depending on snowfall.",
      },
    ],
  },
  {
    slug: "outaouais",
    region_fr: "l'Outaouais",
    region_en: "the Outaouais",
    locative_en: "in the Outaouais",
    description_en: [
      "The Outaouais is an underrated but magnificent region, right at the doorstep of Gatineau and Ottawa. Gatineau Park offers 361 km² of trails, lakes, and panoramic views over the valley. Further north, the Petite-Nation Valley and the Montebello area captivate with their preserved nature and authentic atmosphere.",
      "A cabin in the Outaouais offers the chance to combine wild nature with cultural life. The Ottawa River and its tributaries are ideal for canoeing, fishing, and kayaking. The Château Montebello area delivers breathtaking scenery in every season.",
      "In summer, enjoy the lakes of the Petite-Nation and mountain biking trails. Autumn is stunning with leaf colours. In winter, Gatineau Park boasts one of the region's finest cross-country ski networks.",
    ],
    highlights_fr: [
      "Parc de la Gatineau (361 km² de nature)",
      "Rivière des Outaouais — canot et kayak",
      "Ski de fond réputé en hiver",
      "Vallée de la Petite-Nation préservée",
      "À 30 min d'Ottawa-Gatineau",
    ],
    highlights_en: [
      "Gatineau Park (361 km² of wilderness)",
      "Ottawa River — canoeing and kayaking",
      "Renowned cross-country skiing in winter",
      "Preserved Petite-Nation Valley",
      "30 min from Ottawa-Gatineau",
    ],
    meta_title_fr: "Chalets à louer en Outaouais, Québec | Kabanalouer",
    meta_title_en: "Cabin Rentals in the Outaouais, Quebec | Kabanalouer",
    meta_description_fr: "Chalets à louer en Outaouais — parc de la Gatineau, nature, ski de fond. Contact direct propriétaires. Aucun frais de service.",
    meta_description_en: "Rent a cabin in the Outaouais, Quebec. Gatineau Park, canoeing, cross-country skiing — direct contact with owners. No service fees.",
    faq_fr: [
      {
        question: "Quelles activités pratiquer dans le parc de la Gatineau ?",
        answer: "Le parc de la Gatineau propose de la randonnée sur plus de 165 km de sentiers, du ski de fond sur 200 km de pistes en hiver, de la baignade dans plusieurs lacs aménagés et une observation de la faune exceptionnelle. La vue du belvédère Champlain au coucher du soleil est légendaire.",
      },
      {
        question: "L'Outaouais est-il accessible depuis Montréal ?",
        answer: "Oui, l'Outaouais est à environ 2h30 de Montréal par l'autoroute 50 ou via Ottawa. Gatineau est au cœur de la région. De nombreux voyageurs combinent une visite d'Ottawa avec une escapade en chalet dans la vallée de la Petite-Nation.",
      },
      {
        question: "La région de l'Outaouais est-elle différente du reste du Québec ?",
        answer: "L'Outaouais a une identité unique, à cheval entre le Québec et l'Ontario. Gatineau et Ottawa forment une région métropolitaine bilingue dynamique. La campagne environnante est typiquement québécoise, avec ses rangs, ses érablières et ses paysages boisés.",
      },
    ],
    faq_en: [
      {
        question: "What activities are available in Gatineau Park?",
        answer: "Gatineau Park offers hiking on over 165 km of trails, cross-country skiing on 200 km of groomed trails in winter, swimming at several supervised beaches, and exceptional wildlife watching. The view from Champlain Lookout at sunset is legendary.",
      },
      {
        question: "Is the Outaouais accessible from Montreal?",
        answer: "Yes, the Outaouais is about 2.5 hours from Montreal via Highway 50 or through Ottawa. Gatineau is the heart of the region. Many visitors combine a stop in Ottawa with a cabin escape in the Petite-Nation Valley.",
      },
      {
        question: "Is the Outaouais region unique compared to the rest of Quebec?",
        answer: "The Outaouais has a distinctive identity straddling Quebec and Ontario. Gatineau and Ottawa form a dynamic bilingual metropolitan area. The surrounding countryside is quintessentially Quebecois, with sugar bushes, maple forests, and scenic waterways.",
      },
    ],
  },
  {
    slug: "saguenay-lac-saint-jean",
    region_fr: "le Saguenay–Lac-Saint-Jean",
    region_en: "Saguenay–Lac-Saint-Jean",
    locative_en: "in Saguenay–Lac-Saint-Jean",
    description_en: [
      "Saguenay–Lac-Saint-Jean is a region of strong character, proud of its blueberry culture and spectacular landscapes. The Saguenay Fjord, one of the most impressive in North America, contrasts with the vast flat farmland surrounding Lac-Saint-Jean.",
      "Cycling the Tour du Lac-Saint-Jean (250 km) is a legendary experience. Walleye, brook trout, and pike fishing is outstanding throughout the region. In summer, wild blueberries carpet the forest floor. Fjord-du-Saguenay National Park and Pointe-Taillon National Park offer unforgettable outdoor adventures.",
      "In winter, snowmobile trails extend for thousands of kilometres. A cabin on the shores of Lac-Saint-Jean in winter — with the sunset glowing over the frozen lake and a fire crackling in the hearth — is a uniquely Quebec experience.",
    ],
    highlights_fr: [
      "Fjord du Saguenay — l'un des plus beaux en Amérique",
      "Tour du Lac-Saint-Jean à vélo (250 km)",
      "Pêche sportive réputée (doré, truite)",
      "Bleuets sauvages en été",
      "Motoneige sur des milliers de km de sentiers",
    ],
    highlights_en: [
      "Saguenay Fjord — one of the finest in North America",
      "Cycling the Tour du Lac-Saint-Jean (250 km)",
      "Outstanding sport fishing (walleye, trout)",
      "Wild blueberry picking in summer",
      "Snowmobiling on thousands of km of trails",
    ],
    meta_title_fr: "Chalets à louer au Saguenay–Lac-Saint-Jean | Kabanalouer",
    meta_title_en: "Cabin Rentals in Saguenay–Lac-Saint-Jean | Kabanalouer",
    meta_description_fr: "Chalets à louer au Saguenay–Lac-Saint-Jean — fjord, pêche, vélo et motoneige. Contact direct propriétaires. Aucun frais de service.",
    meta_description_en: "Rent a cabin in Saguenay–Lac-Saint-Jean. Fjord, fishing, cycling, snowmobiling — direct contact with owners. No service fees.",
    faq_fr: [
      {
        question: "Que voir et faire au Saguenay–Lac-Saint-Jean ?",
        answer: "Le fjord du Saguenay est incontournable — on peut l'explorer en kayak, en croisière ou depuis les belvédères des parcs nationaux. Le tour du Lac-Saint-Jean à vélo (250 km) est une aventure emblématique. La région offre aussi d'excellentes pourvoiries de pêche et une culture bleuette unique.",
      },
      {
        question: "Comment se rendre au Saguenay–Lac-Saint-Jean depuis Québec ?",
        answer: "La région est à environ 2h de Québec par la route 175, une route pittoresque qui traverse la réserve faunique des Laurentides. Un service de traversier relie aussi Baie-Sainte-Catherine à Tadoussac en été.",
      },
      {
        question: "La région est-elle accessible et active en hiver ?",
        answer: "Oui, le Saguenay–Lac-Saint-Jean est très actif en hiver. La motoneige est reine avec des milliers de kilomètres de sentiers balisés. La pêche sur glace sur le Lac-Saint-Jean et ses tributaires est une expérience unique, et les nuits étoilées y sont parmi les plus belles du Québec.",
      },
    ],
    faq_en: [
      {
        question: "What are the top things to see and do in Saguenay–Lac-Saint-Jean?",
        answer: "The Saguenay Fjord is unmissable — explore it by kayak, cruise, or from national park lookouts. Cycling the Tour du Lac-Saint-Jean (250 km) is an iconic adventure. The region also offers excellent fishing lodges and a unique blueberry culture.",
      },
      {
        question: "How do I get to Saguenay–Lac-Saint-Jean from Quebec City?",
        answer: "The region is about 2 hours from Quebec City via Route 175, a scenic road through the Laurentians wildlife reserve with good wildlife spotting opportunities. A ferry also connects Baie-Sainte-Catherine to Tadoussac in summer.",
      },
      {
        question: "Is the region active in winter?",
        answer: "Yes, Saguenay–Lac-Saint-Jean is very lively in winter. Snowmobiling is king with thousands of kilometres of groomed trails. Ice fishing on Lac-Saint-Jean and its tributaries is a one-of-a-kind experience, and the starry skies here are among Quebec's most spectacular.",
      },
    ],
  },
  {
    slug: "bas-saint-laurent",
    region_fr: "le Bas-Saint-Laurent",
    region_en: "Bas-Saint-Laurent",
    locative_en: "in Bas-Saint-Laurent",
    description_en: [
      "Bas-Saint-Laurent stretches along the St. Lawrence River between Rivière-du-Loup and Matane, offering breathtaking coastal landscapes. Bic National Park, with its rocky headlands and colonies of grey seals, is one of the region's crown jewels.",
      "A cabin in Bas-Saint-Laurent means enjoying the river in all its majesty — salmon fishing on the Mitis or Matapédia rivers, sea kayaking through island archipelagos, whale watching offshore. The region is also celebrated for its seafood, milk-fed lamb, and artisan cheeses.",
      "In winter, snowshoeing in the Appalachians, ice fishing, and snowmobile trails attract outdoor enthusiasts. Bas-Saint-Laurent delivers a complete change of scenery with warm, genuine hospitality.",
    ],
    highlights_fr: [
      "Parc national du Bic et ses phoques gris",
      "Pêche au saumon sur la rivière Mitis",
      "Kayak de mer dans les archipels côtiers",
      "Gastronomie — fruits de mer et fromages artisanaux",
      "Observation des baleines au large",
    ],
    highlights_en: [
      "Bic National Park and its grey seal colonies",
      "Salmon fishing on the Mitis River",
      "Sea kayaking through coastal archipelagos",
      "Seafood and artisan cheeses",
      "Whale watching offshore",
    ],
    meta_title_fr: "Chalets à louer dans le Bas-Saint-Laurent | Kabanalouer",
    meta_title_en: "Cabin Rentals in Bas-Saint-Laurent, QC | Kabanalouer",
    meta_description_fr: "Chalets à louer dans le Bas-Saint-Laurent — fleuve, kayak, pêche au saumon. Contact direct propriétaires. Aucun frais de service.",
    meta_description_en: "Rent a cabin in Bas-Saint-Laurent, Quebec. River landscapes, sea kayaking, salmon fishing — direct contact with owners. No service fees.",
    faq_fr: [
      {
        question: "Qu'est-ce qui rend le parc national du Bic si spécial ?",
        answer: "Le parc national du Bic est unique au Québec avec ses promontoires rocheux qui plongent dans le fleuve Saint-Laurent, ses anses abritées et ses colonies de phoques gris. C'est une destination de choix pour la randonnée côtière, le kayak de mer et l'observation de la faune marine.",
      },
      {
        question: "Peut-on observer des baleines depuis le Bas-Saint-Laurent ?",
        answer: "Oui, les eaux au large du Bas-Saint-Laurent sont fréquentées par plusieurs espèces de cétacés : petit rorqual, baleine à bosse et, plus rarement, rorqual bleu. Des croisières d'observation partent régulièrement depuis Rimouski et d'autres ports de la région.",
      },
      {
        question: "Le Bas-Saint-Laurent est-il loin des grands centres ?",
        answer: "Rivière-du-Loup, la porte d'entrée du Bas-Saint-Laurent, est à environ 3h de Québec et 5h de Montréal. La route longeant le fleuve est magnifique et fait partie de l'expérience. La région récompense amplement le voyage pour ses paysages côtiers uniques.",
      },
    ],
    faq_en: [
      {
        question: "What makes Bic National Park so special?",
        answer: "Bic National Park is unique in Quebec with its rocky headlands dropping into the St. Lawrence, sheltered coves, and grey seal colonies. It is a prime destination for coastal hiking, sea kayaking, and marine wildlife watching.",
      },
      {
        question: "Can I watch whales from Bas-Saint-Laurent?",
        answer: "Yes, the waters off Bas-Saint-Laurent are frequented by several whale species, including minke whales, humpback whales, and occasionally blue whales. Whale-watching cruises depart regularly from Rimouski and other ports in the region.",
      },
      {
        question: "Is Bas-Saint-Laurent far from major cities?",
        answer: "Rivière-du-Loup, the gateway to Bas-Saint-Laurent, is about 3 hours from Quebec City and 5 hours from Montreal. The riverside drive is magnificent and part of the experience. The region rewards the journey with its unique coastal scenery and genuine character.",
      },
    ],
  },
  {
    slug: "gaspesie",
    region_fr: "la Gaspésie",
    region_en: "Gaspésie",
    locative_en: "in Gaspésie",
    description_en: [
      "Gaspésie is Quebec's ultimate road-trip destination — and that is precisely what makes it unforgettable. With Percé Rock and Bonaventure Island, Gaspésie National Park with its peaks surpassing 1,000 metres, rugged coastal cliffs, and fishing villages perched above the river, Gaspésie is an exceptional destination for those who seek the extraordinary.",
      "Renting a cabin in Gaspésie means experiencing a preserved region where nature truly runs wild. Salmon fishing on the Bonaventure, York, or Matapédia rivers is the stuff of legend. Mont Albert offers alpine hiking unlike anything else in Quebec.",
      "Gaspésie must be earned — the drive takes several hours from Quebec City or Montreal — but those who make the journey return changed. A destination for lovers of vast open spaces and authentic adventure.",
    ],
    highlights_fr: [
      "Rocher Percé et île Bonaventure",
      "Parc national de la Gaspésie (sommets >1 000 m)",
      "Pêche au saumon légendaire",
      "Villages de pêcheurs authentiques",
      "Paysages sauvages préservés",
    ],
    highlights_en: [
      "Percé Rock and Bonaventure Island",
      "Gaspésie National Park (peaks over 1,000 m)",
      "Legendary salmon fishing",
      "Authentic fishing villages",
      "Pristine wild landscapes",
    ],
    meta_title_fr: "Chalets à louer en Gaspésie, Québec | Kabanalouer",
    meta_title_en: "Cabin Rentals in Gaspésie, Quebec | Kabanalouer",
    meta_description_fr: "Chalets à louer en Gaspésie — rocher Percé, pêche au saumon, randonnée alpine. Contact direct propriétaires. Aucun frais de service.",
    meta_description_en: "Rent a cabin in Gaspésie, Quebec. Percé Rock, salmon fishing, alpine hiking — direct contact with owners. No service fees. Book now.",
    faq_fr: [
      {
        question: "Combien de temps dure le tour de la Gaspésie ?",
        answer: "Un tour complet de la péninsule gaspésienne représente environ 900 km. En prenant le temps de s'arrêter et d'explorer, comptez au minimum 7 à 10 jours. Beaucoup choisissent de séjourner en chalet dans plusieurs secteurs : Forillon, Percé, Bonaventure et la baie des Chaleurs.",
      },
      {
        question: "Quelle est la meilleure saison pour visiter la Gaspésie ?",
        answer: "L'été (juillet-août) est la haute saison, avec le meilleur temps pour la randonnée et la baignade. Septembre est magnifique pour les couleurs d'automne et une fréquentation plus calme. L'hiver gaspésien, avec ses tempêtes et ses paysages enneigés face à la mer, a son propre charme sauvage.",
      },
      {
        question: "Y a-t-il des activités pour les familles en Gaspésie ?",
        answer: "Oui, la Gaspésie est une destination familiale authentique. Les plages de la baie des Chaleurs, les croisières d'observation des baleines, les randonnées adaptées en forêt et la visite du rocher Percé en bateau sont appréciés de tous les âges.",
      },
    ],
    faq_en: [
      {
        question: "How long does it take to tour the Gaspé Peninsula?",
        answer: "A full circuit of the Gaspé Peninsula covers about 900 km. To truly explore the region with stops and side trips, plan at least 7 to 10 days. Many visitors stay in cabins in several areas: Forillon, Percé, Bonaventure, and the Baie des Chaleurs.",
      },
      {
        question: "What is the best season to visit Gaspésie?",
        answer: "Summer (July-August) is high season with the best weather for hiking and swimming. September is beautiful for fall colours and smaller crowds. Winter in Gaspésie, with its storms and snowy seascapes, has its own wild charm.",
      },
      {
        question: "Are there family-friendly activities in Gaspésie?",
        answer: "Yes, Gaspésie is a genuinely family-friendly destination. The beaches of Baie des Chaleurs, whale-watching cruises, family-friendly forest hikes, and boat trips to Percé Rock are enjoyed by all ages.",
      },
    ],
  },
  {
    slug: "abitibi-temiscamingue",
    region_fr: "l'Abitibi-Témiscamingue",
    region_en: "Abitibi-Témiscamingue",
    locative_en: "in Abitibi-Témiscamingue",
    description_en: [
      "Abitibi-Témiscamingue is a region of boreal forest, vast lakes, and some of the darkest skies in Quebec. Far from the major cities, it attracts travellers seeking untouched wilderness, sport fishing, and complete disconnection. Northern lights are visible on many winter nights.",
      "Lake Témiscamingue, the Kipawa Reservoir, and hundreds of other lakes offer exceptional fishing: walleye, northern pike, lake trout, and brook trout. The wilderness lodges of Abitibi are among the finest in Quebec.",
      "Renting a cabin in Abitibi-Témiscamingue means choosing adventure and total disconnection — and returning home with memories of pure nature that last a lifetime.",
    ],
    highlights_fr: [
      "Ciel étoilé exceptionnel et aurores boréales",
      "Pêche sportive de classe mondiale (doré, brochet, touladi)",
      "Pourvoiries parmi les meilleures au Québec",
      "Nature boréale intacte et grands espaces",
      "Déconnexion totale — loin de tout",
    ],
    highlights_en: [
      "Exceptional stargazing and northern lights",
      "World-class sport fishing (walleye, pike, lake trout)",
      "Some of Quebec's finest wilderness lodges",
      "Pristine boreal nature and wide-open spaces",
      "Total disconnection — far from everything",
    ],
    meta_title_fr: "Chalets à louer en Abitibi-Témiscamingue | Kabanalouer",
    meta_title_en: "Cabin Rentals in Abitibi-Témiscamingue | Kabanalouer",
    meta_description_fr: "Chalets à louer en Abitibi-Témiscamingue — pêche, aurores boréales, nature boréale. Contact direct propriétaires. Aucun frais de service.",
    meta_description_en: "Rent a cabin in Abitibi-Témiscamingue. Fishing, northern lights, boreal wilderness — direct contact with owners. No service fees.",
    faq_fr: [
      {
        question: "Peut-on vraiment voir les aurores boréales en Abitibi-Témiscamingue ?",
        answer: "Oui, l'Abitibi-Témiscamingue est l'une des meilleures régions du Québec pour observer les aurores boréales. La pollution lumineuse y est très faible et le ciel dégagé par grand froid offre des spectacles saisissants. Les nuits d'automne et d'hiver (septembre à mars) sont les plus propices.",
      },
      {
        question: "Quels poissons peut-on pêcher en Abitibi-Témiscamingue ?",
        answer: "La région est réputée pour la pêche au doré jaune, au grand brochet, au touladi (truite grise) et à l'omble de fontaine. De nombreuses pourvoiries proposent des accès exclusifs à des lacs peu exploités pour une expérience de pêche exceptionnelle.",
      },
      {
        question: "L'Abitibi-Témiscamingue est-il accessible depuis Montréal ?",
        answer: "La région est à environ 5h à 6h de route de Montréal selon le secteur (Rouyn-Noranda, Val-d'Or, Ville-Marie). Des vols régionaux depuis Montréal sont disponibles. La distance s'oublie vite quand on arrive dans ces grands espaces.",
      },
    ],
    faq_en: [
      {
        question: "Can you really see the northern lights in Abitibi-Témiscamingue?",
        answer: "Yes, Abitibi-Témiscamingue is one of Quebec's best regions for aurora borealis viewing. Light pollution is minimal and clear cold skies produce stunning displays. Autumn and winter nights (September to March) are the most favourable.",
      },
      {
        question: "What fish can I catch in Abitibi-Témiscamingue?",
        answer: "The region is renowned for walleye, northern pike, lake trout, and brook trout fishing. Many wilderness lodges provide exclusive access to secluded lakes for an outstanding fishing experience.",
      },
      {
        question: "Is Abitibi-Témiscamingue accessible from Montreal?",
        answer: "The region is about 5 to 6 hours from Montreal by car depending on the area (Rouyn-Noranda, Val-d'Or, Ville-Marie). Regional flights from Montreal are available. The distance fades quickly once you arrive in these open spaces.",
      },
    ],
  },
  {
    slug: "cote-nord",
    region_fr: "la Côte-Nord",
    region_en: "the North Shore",
    locative_en: "on the North Shore",
    description_en: [
      "The North Shore (Côte-Nord) is one of Quebec's wildest regions, stretching over 1,300 km along the St. Lawrence River. This is where belugas and blue whales frequent the waters near the Saguenay Fjord, offering incomparable marine wildlife viewing.",
      "Tadoussac and Les Bergeronnes are world capitals of whale watching. The Mingan Archipelago, a UNESCO Biosphere Reserve, is home to unique limestone formations rising from the sea. Anticosti Island is paradise for salmon fishing.",
      "Renting a cabin on the North Shore means embracing the distance from everything in order to find yourself. The roads are long, the spaces are vast, and the stars are more numerous than anywhere else in Quebec.",
    ],
    highlights_fr: [
      "Observation des baleines (bélugas, rorqual bleu)",
      "Archipel de Mingan — formations calcaires uniques",
      "Île d'Anticosti — paradis de la pêche au saumon",
      "Ciel étoilé parmi les plus beaux du Québec",
      "Nature sauvage préservée sur 1 300 km de côte",
    ],
    highlights_en: [
      "Whale watching (belugas, blue whales)",
      "Mingan Archipelago — unique limestone formations",
      "Anticosti Island — salmon fishing paradise",
      "Stargazing among Quebec's finest",
      "Pristine wilderness over 1,300 km of coastline",
    ],
    meta_title_fr: "Chalets à louer sur la Côte-Nord, Québec | Kabanalouer",
    meta_title_en: "Cabin Rentals on Quebec's North Shore | Kabanalouer",
    meta_description_fr: "Chalets à louer sur la Côte-Nord — baleines, archipel de Mingan, nature sauvage. Contact direct propriétaires. Aucun frais de service.",
    meta_description_en: "Rent a cabin on Quebec's North Shore. Whale watching, Mingan Archipelago, wilderness — direct contact with owners. No service fees.",
    faq_fr: [
      {
        question: "Où est-il le mieux d'observer les baleines sur la Côte-Nord ?",
        answer: "Tadoussac est le point de départ classique pour l'observation des baleines, à la confluence du Saguenay et du Saint-Laurent. Les Bergeronnes et Baie-Sainte-Catherine offrent également d'excellentes conditions. La saison s'étend de juin à octobre.",
      },
      {
        question: "Comment se rendre sur la Côte-Nord ?",
        answer: "L'accès principal se fait par la route 138 depuis Québec vers l'ouest de la Côte-Nord (Tadoussac, Baie-Comeau). Pour les secteurs plus éloignés (Sept-Îles, Natashquan), le traversier ou l'avion régional sont parfois nécessaires. Le traversier Matane–Baie-Comeau est une option depuis la Gaspésie.",
      },
      {
        question: "Qu'est-ce que l'archipel de Mingan ?",
        answer: "L'archipel de Mingan est un chapelet d'îles du golfe du Saint-Laurent, réputé pour ses impressionnantes formations calcaires en forme de monolithes. Classé Réserve de la biosphère de l'UNESCO, il abrite une faune et une flore marines uniques, accessibles depuis Havre-Saint-Pierre.",
      },
    ],
    faq_en: [
      {
        question: "Where is the best whale watching on the North Shore?",
        answer: "Tadoussac is the classic starting point for whale watching, at the confluence of the Saguenay and St. Lawrence rivers. Les Bergeronnes and Baie-Sainte-Catherine also offer excellent conditions. The season runs from June to October.",
      },
      {
        question: "How do I get to the North Shore?",
        answer: "The main access is via Route 138 from Quebec City toward the western North Shore (Tadoussac, Baie-Comeau). For more remote areas (Sept-Îles, Natashquan), a ferry or regional flight may be needed. The Matane–Baie-Comeau ferry is an option from the Gaspésie side.",
      },
      {
        question: "What is the Mingan Archipelago?",
        answer: "The Mingan Archipelago is a chain of islands in the Gulf of St. Lawrence, known for its impressive monolith-shaped limestone formations. A UNESCO Biosphere Reserve, it hosts unique marine flora and fauna and is accessible from the town of Havre-Saint-Pierre.",
      },
    ],
  },
  {
    slug: "monteregie",
    region_fr: "la Montérégie",
    region_en: "Montérégie",
    locative_en: "in Montérégie",
    description_en: [
      "Montérégie is Quebec's premier agricultural region, scattered with orchards, vineyards, cider houses, and artisan cheese makers. Less than an hour from Montreal, it offers a striking contrast to urban life: fields stretching to the horizon, the Montérégiennes hills, and the majestic St. Lawrence River.",
      "Agrotourism reigns in Montérégie: apple and strawberry picking, wine and ice cider tastings, farmers' markets. Outdoor lovers will enjoy the trails at Mont-Saint-Bruno National Park and cycling paths along the St. Lawrence.",
      "A cabin in Montérégie means experiencing the Quebec countryside at its most generous, while staying close to Montreal. Perfect for family or couple weekend escapes, all year round.",
    ],
    highlights_fr: [
      "Vignobles et cidreries de glace artisanales",
      "Cueillette de pommes et de fraises",
      "Parc national du Mont-Saint-Bruno",
      "Pistes cyclables le long du Saint-Laurent",
      "À 45 min de Montréal",
    ],
    highlights_en: [
      "Vineyards and artisan ice cider houses",
      "Apple and strawberry picking",
      "Mont-Saint-Bruno National Park",
      "Cycling paths along the St. Lawrence",
      "45 min from Montreal",
    ],
    meta_title_fr: "Chalets à louer en Montérégie, Québec | Kabanalouer",
    meta_title_en: "Cabin Rentals in Montérégie, Quebec | Kabanalouer",
    meta_description_fr: "Chalets à louer en Montérégie — vignobles, agrotourisme, nature près de Montréal. Contact direct propriétaires. Aucun frais de service.",
    meta_description_en: "Rent a cabin in Montérégie, Quebec. Vineyards, agrotourism, nature near Montreal — direct contact with owners. No service fees.",
    faq_fr: [
      {
        question: "Quand est la meilleure période pour faire de l'agrotourisme en Montérégie ?",
        answer: "La saison agrotouristique s'étend de juin à octobre. La cueillette des fraises commence en juin, celle des framboises et bleuets en juillet-août, et la cueillette des pommes ainsi que les vendanges en septembre-octobre. L'automne est particulièrement beau avec les couleurs et les nombreux festivals locaux.",
      },
      {
        question: "Peut-on faire du vélo en Montérégie ?",
        answer: "Absolument. La Montérégie dispose d'un excellent réseau de pistes cyclables, dont la Route verte. Les pistes longeant le fleuve Saint-Laurent et celles menant aux montérégiennes offrent des balades pittoresques. Le vélo est un excellent moyen de visiter les producteurs locaux.",
      },
      {
        question: "Y a-t-il des activités hivernales en Montérégie ?",
        answer: "L'hiver, la Montérégie propose la raquette et le ski de fond dans les parcs régionaux, ainsi que les repas en cabane à sucre traditionnellement en mars-avril. La région est davantage connue pour ses attraits des trois autres saisons.",
      },
    ],
    faq_en: [
      {
        question: "When is the best time for agrotourism in Montérégie?",
        answer: "The agrotourism season runs from June to October. Strawberry picking starts in June, raspberries and blueberries in July-August, and apple picking and grape harvests in September-October. Fall is particularly beautiful with foliage colours and local festivals.",
      },
      {
        question: "Can I cycle in Montérégie?",
        answer: "Absolutely. Montérégie has an excellent cycling network, including the Route Verte. Paths along the St. Lawrence River and routes leading to the Montérégiennes hills offer scenic rides. Cycling is a great way to visit local producers.",
      },
      {
        question: "Are there winter activities in Montérégie?",
        answer: "In winter, Montérégie offers snowshoeing and cross-country skiing in regional parks, as well as sugar shack dining traditionally in March-April. The region is better known for its three other seasons.",
      },
    ],
  },
  {
    slug: "chaudiere-appalaches",
    region_fr: "Chaudière-Appalaches",
    region_en: "Chaudière-Appalaches",
    locative_en: "in Chaudière-Appalaches",
    description_en: [
      "Chaudière-Appalaches spans the south shore of the St. Lawrence, facing Quebec City, between the river plains and the first foothills of the Appalachians. The region is a gateway to the Quebec Appalachians, with their forested valleys, trout streams, and rounded summits.",
      "The Chaudière River flows through the region, offering numerous fishing and kayaking spots. Les Appalaches and Frontenac regional parks provide varied outdoor activities in every season. The region is also celebrated for its award-winning maple producers and historic covered bridges.",
      "A cabin in Chaudière-Appalaches means the tranquillity of Quebec's countryside just minutes from the Old Capital, with sugar shacks, artisan cheese makers, and snow-covered landscapes in winter.",
    ],
    highlights_fr: [
      "Parcs régionaux des Appalaches et de Frontenac",
      "Pêche et kayak sur la rivière Chaudière",
      "Érablières et cabanes à sucre réputées",
      "Ponts couverts historiques",
      "À 30 min de la ville de Québec",
    ],
    highlights_en: [
      "Les Appalaches and Frontenac Regional Parks",
      "Fishing and kayaking on the Chaudière River",
      "Renowned maple farms and sugar shacks",
      "Historic covered bridges",
      "30 min from Quebec City",
    ],
    meta_title_fr: "Chalets à louer en Chaudière-Appalaches | Kabanalouer",
    meta_title_en: "Cabin Rentals in Chaudière-Appalaches, QC | Kabanalouer",
    meta_description_fr: "Chalets à louer en Chaudière-Appalaches — Appalaches, pêche, cabanes à sucre. Contact direct propriétaires. Aucun frais de service.",
    meta_description_en: "Rent a cabin in Chaudière-Appalaches, Quebec. Appalachians, fishing, sugar shacks — direct contact with owners. No service fees.",
    faq_fr: [
      {
        question: "Quelles sont les activités de plein air en Chaudière-Appalaches ?",
        answer: "La région offre la randonnée pédestre et le vélo de montagne dans les parcs régionaux des Appalaches et de Frontenac, le canot-kayak sur la rivière Chaudière, la pêche à la truite dans les cours d'eau des Appalaches, et en hiver, le ski de fond, la raquette et la motoneige.",
      },
      {
        question: "Pourquoi la région est-elle réputée pour l'acériculture ?",
        answer: "La Chaudière-Appalaches est l'une des plus grandes régions productrices de sirop d'érable au Québec, avec de nombreuses érablières primées. Les cabanes à sucre ouvrent traditionnellement en mars-avril et proposent des repas québécois avec sirop chaud, oreilles de crisse et tarte au sucre.",
      },
      {
        question: "Les ponts couverts de la région valent-ils le détour ?",
        answer: "Oui, la Chaudière-Appalaches possède plusieurs des plus beaux ponts couverts du Québec, dont certains datant du XIXe siècle. Le circuit des ponts couverts est une balade pittoresque à faire en voiture ou à vélo, surtout en automne lors du feuillage.",
      },
    ],
    faq_en: [
      {
        question: "What outdoor activities are available in Chaudière-Appalaches?",
        answer: "The region offers hiking and mountain biking in Les Appalaches and Frontenac regional parks, canoeing and kayaking on the Chaudière River, trout fishing in the Appalachian streams, and in winter, cross-country skiing, snowshoeing, and snowmobiling.",
      },
      {
        question: "Why is the region renowned for maple production?",
        answer: "Chaudière-Appalaches is one of Quebec's largest maple syrup producing regions, with many award-winning sugar bushes. Sugar shacks traditionally open in March-April and serve classic Quebec meals with warm maple syrup, oreilles de crisse, and sugar pie.",
      },
      {
        question: "Are the region's covered bridges worth visiting?",
        answer: "Yes, Chaudière-Appalaches has some of Quebec's most beautiful covered bridges, some dating back to the 19th century. The covered bridge circuit is a scenic drive or cycle, especially beautiful during fall foliage.",
      },
    ],
  },
  {
    slug: "capitale-nationale",
    region_fr: "la Capitale-Nationale",
    region_en: "the Capitale-Nationale region",
    locative_en: "in the Capitale-Nationale region",
    description_en: [
      "The Capitale-Nationale region encompasses Quebec City, the historic fortified old town, as well as the magnificent countryside of the Côte-de-Beaupré, Orléans Island, and the wild lands to the north up to the Laurentians wildlife reserve. Renting a cabin here means combining urban culture with wild nature just kilometres apart.",
      "Orléans Island, nicknamed the 'Garden of Quebec,' offers farm restaurants, cheese makers, and orchards in a unique pastoral setting. The Côte-de-Beaupré leads to the grand Montmorency Falls and Mont-Sainte-Anne, one of Eastern Canada's most important alpine ski resorts.",
      "Jacques-Cartier National Park, north of Quebec City, is paradise for canoe-camping in summer and snowshoeing in winter. A cabin in the Capitale-Nationale places you at the heart of Quebec history and nature.",
    ],
    highlights_fr: [
      "Mont-Sainte-Anne — ski alpin de classe mondiale",
      "Chute Montmorency et parc de la Jacques-Cartier",
      "Île d'Orléans — le jardin du Québec",
      "Ville de Québec à quelques minutes",
      "Canot-camping et raquettes dans les parcs nationaux",
    ],
    highlights_en: [
      "Mont-Sainte-Anne — world-class alpine skiing",
      "Montmorency Falls and Jacques-Cartier National Park",
      "Orléans Island — the Garden of Quebec",
      "Quebec City just minutes away",
      "Canoe-camping and snowshoeing in national parks",
    ],
    meta_title_fr: "Chalets à louer dans la Capitale-Nationale | Kabanalouer",
    meta_title_en: "Cabin Rentals near Quebec City, QC | Kabanalouer",
    meta_description_fr: "Chalets à louer dans la Capitale-Nationale — Mont-Sainte-Anne, île d'Orléans, parc de la Jacques-Cartier. Contact direct propriétaires.",
    meta_description_en: "Rent a cabin near Quebec City. Mont-Sainte-Anne, Montmorency Falls, Jacques-Cartier Park — direct contact with owners. No service fees.",
    faq_fr: [
      {
        question: "Quelles sont les activités hivernales autour de Québec ?",
        answer: "La région offre le ski alpin au mont Sainte-Anne et au Stoneham, le ski de fond dans le parc de la Jacques-Cartier, la raquette, la glissade sur la terrasse Dufferin et le carnaval de Québec en février — le plus grand carnaval d'hiver au monde.",
      },
      {
        question: "L'île d'Orléans mérite-t-elle une visite ?",
        answer: "Absolument. L'île d'Orléans est surnommée le « jardin du Québec » pour ses tables champêtres, ses producteurs de fruits, ses fromageries et ses vignobles. Un circuit de 67 km fait le tour de l'île et permet de visiter six villages aux maisons ancestrales. La vue sur la chute Montmorency depuis le pont est mémorable.",
      },
      {
        question: "Le parc de la Jacques-Cartier est-il adapté aux familles ?",
        answer: "Oui, le parc national de la Jacques-Cartier est une excellente destination familiale. La rivière Jacques-Cartier, encaissée dans une vallée spectaculaire, est idéale pour le canot débutant. Des sentiers de randonnée variés conviennent à tous les niveaux. En hiver, la raquette et le ski de fond sont accessibles à toute la famille.",
      },
    ],
    faq_en: [
      {
        question: "What winter activities are available near Quebec City?",
        answer: "The Capitale-Nationale region offers downhill skiing at Mont-Sainte-Anne and Stoneham, cross-country skiing in Jacques-Cartier National Park, snowshoeing, tobogganing on the Dufferin Terrace slide, and the Quebec Winter Carnival in February — the world's largest winter carnival.",
      },
      {
        question: "Is Orléans Island worth a visit?",
        answer: "Absolutely. Orléans Island is nicknamed the 'Garden of Quebec' for its farm restaurants, fruit producers, cheese makers, and vineyards. A 67 km circuit covers six villages with ancestral homes. The view of Montmorency Falls from the bridge is memorable.",
      },
      {
        question: "Is Jacques-Cartier National Park family-friendly?",
        answer: "Yes, Jacques-Cartier National Park is an excellent family destination. The Jacques-Cartier River, nestled in a spectacular valley, is ideal for beginner canoeing. Varied hiking trails suit all levels. In winter, snowshoeing and cross-country skiing are accessible to the whole family.",
      },
    ],
  },
];

export function getRegionContent(slug: string): RegionContent | undefined {
  return REGIONS_CONTENT.find((r) => r.slug === slug);
}
