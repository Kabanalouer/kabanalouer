import Link from "next/link";
import Image from "next/image";
import { getLocale } from "next-intl/server";
import { getThemeLinkVisibility } from "@/lib/themeLinks";
import { AMENITY_LANDINGS, type AmenityLandingKey } from "@/lib/amenityLandings";
import { DOG_FRIENDLY_PATH_EN, DOG_FRIENDLY_PATH_FR } from "@/lib/dogPolicy";

// Accueil : « Explorer par thème », sous « Explorer par région » (2026-10-22, demande de Simon).
// Une tuile par page thématique qui a au moins un chalet (jamais de lien vers une page vide), photos
// de public/images/themes/ (versions allégées de public/images/Theme/). Bord de l'eau, spa et chiens
// passent en premier et en grand. La grille est calculée pour ne jamais laisser de trou, peu importe
// le nombre de thèmes visibles (voir `layout`).

type Theme = { key: string; image: string; titleFr: string; titleEn: string; altFr: string; altEn: string; href: (en: boolean) => string };

const landing = (key: AmenityLandingKey) => AMENITY_LANDINGS.find((l) => l.key === key)!;

// Ordre = priorité : le premier visible occupe la grande tuile, les deux suivants la colonne à côté.
const THEMES: Theme[] = [
  { key: "waterfront", image: "waterfront", titleFr: "Au bord de l’eau", titleEn: "Waterfront", altFr: "Chalet au bord de l’eau au Québec", altEn: "Waterfront cabin in Quebec", href: (en) => (en ? landing("waterfront").pathEn : landing("waterfront").pathFr) },
  { key: "spa", image: "spa", titleFr: "Avec spa", titleEn: "With a hot tub", altFr: "Chalet avec spa au Québec", altEn: "Cabin with a hot tub in Quebec", href: (en) => (en ? landing("spa").pathEn : landing("spa").pathFr) },
  { key: "dogs", image: "dogs", titleFr: "Chiens acceptés", titleEn: "Dog-friendly", altFr: "Chalet qui accepte les chiens au Québec", altEn: "Dog-friendly cabin in Quebec", href: (en) => (en ? DOG_FRIENDLY_PATH_EN : DOG_FRIENDLY_PATH_FR) },
  { key: "pool-table", image: "pool-table", titleFr: "Table de billard", titleEn: "Pool table", altFr: "Chalet avec table de billard au Québec", altEn: "Cabin with a pool table in Quebec", href: (en) => (en ? landing("pool-table").pathEn : landing("pool-table").pathFr) },
  { key: "ev-charger", image: "ev-charger", titleFr: "Borne de recharge", titleEn: "EV charger", altFr: "Chalet avec borne de recharge pour véhicule électrique", altEn: "Cabin with an electric vehicle charger", href: (en) => (en ? landing("ev-charger").pathEn : landing("ev-charger").pathFr) },
  { key: "remote-work", image: "remote-work", titleFr: "Télétravail", titleEn: "Remote work", altFr: "Chalet pour travailler à distance au Québec", altEn: "Cabin for remote work in Quebec", href: (en) => (en ? landing("remote-work").pathEn : landing("remote-work").pathFr) },
];

// Grille de 12 colonnes (ordinateur) : 1re tuile 6 colonnes sur 2 rangées, 2e et 3e 6 colonnes sur 1 rangée,
// puis les autres se partagent la rangée du bas à parts égales. Moins de 3 thèmes : une rangée.
// Mobile (2 colonnes) : 1re tuile pleine largeur, les autres par deux, la dernière pleine largeur si impaire.
// Tailwind ne génère que les classes écrites en toutes lettres : lg:col-span-12 lg:col-span-6 lg:col-span-4 lg:row-span-2
function layout(index: number, total: number): string {
  let desktop: string;
  if (total >= 3) {
    if (index === 0) desktop = "lg:col-span-6 lg:row-span-2";
    else if (index <= 2) desktop = "lg:col-span-6";
    else desktop = `lg:col-span-${12 / (total - 3)}`;
  } else {
    desktop = `lg:col-span-${12 / total}`;
  }
  const alone = index === 0 || (index === total - 1 && (total - 1) % 2 === 1);
  return `${alone ? "col-span-2" : "col-span-1"} ${desktop}`;
}

export default async function ThemesExplorer() {
  const [locale, show] = await Promise.all([getLocale(), getThemeLinkVisibility()]);
  const isEn = locale === "en";

  const visible = THEMES.filter((t) => (t.key === "dogs" ? show.dogFriendly : show.amenities[t.key as AmenityLandingKey]));
  if (visible.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-16 w-full">
      <h2 className="text-3xl font-bold text-charcoal-800 tracking-h2 leading-snug mb-8">
        {isEn ? "Explore by theme" : "Explorer par thème"}
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4 auto-rows-[170px] sm:auto-rows-[200px] lg:auto-rows-[230px]">
        {visible.map((t, i) => {
          const title = isEn ? t.titleEn : t.titleFr;
          return (
            <Link
              key={t.key}
              href={t.href(isEn)}
              className={`group relative block overflow-hidden rounded-2xl ${layout(i, visible.length)} ${i === 0 && visible.length >= 3 ? "row-span-2" : ""}`}
            >
              <Image
                src={`/images/themes/${t.image}.webp`}
                alt={isEn ? t.altEn : t.altFr}
                fill
                sizes={i === 0 ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 33vw, 50vw"}
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" aria-hidden="true" />
              <span className={`absolute left-4 bottom-4 right-4 font-bold text-white ${i === 0 ? "text-2xl" : "text-heading-3"}`}>{title}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
