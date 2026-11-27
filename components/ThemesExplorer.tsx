import Link from "next/link";
import Image from "next/image";
import { getLocale } from "next-intl/server";
import { getThemeLinkVisibility } from "@/lib/themeLinks";
import { AMENITY_LANDINGS, type AmenityLandingKey } from "@/lib/amenityLandings";
import { DOG_FRIENDLY_PATH_EN, DOG_FRIENDLY_PATH_FR } from "@/lib/dogPolicy";
import { ACCESSIBLE_PATH_EN, ACCESSIBLE_PATH_FR } from "@/lib/accessibility";
import { DEALS_PATH_EN, DEALS_PATH_FR } from "@/lib/promoLabel";

// Accueil : « Explorer par thème » (option 5a, 2026-11-27) : une pastille par page thématique qui a au moins un chalet
// (jamais de lien vers une page vide), avec une petite photo ronde de public/images/themes/. Les URL, les textes de
// lien et les alt sont ceux d'avant (maillage interne SEO). Sur ordinateur les pastilles passent à la ligne ; sur
// mobile, une seule rangée qui défile au doigt et déborde jusqu'au bord droit de l'écran.

type Theme = { key: string; image: string; titleFr: string; titleEn: string; altFr: string; altEn: string; href: (en: boolean) => string };

const landing = (key: AmenityLandingKey) => AMENITY_LANDINGS.find((l) => l.key === key)!;

// Ordre d'affichage.
const THEMES: Theme[] = [
  { key: "waterfront", image: "waterfront", titleFr: "Au bord de l’eau", titleEn: "Waterfront", altFr: "Chalet au bord de l’eau au Québec", altEn: "Waterfront cabin in Quebec", href: (en) => (en ? landing("waterfront").pathEn : landing("waterfront").pathFr) },
  { key: "spa", image: "spa", titleFr: "Avec spa", titleEn: "With a hot tub", altFr: "Chalet avec spa au Québec", altEn: "Cabin with a hot tub in Quebec", href: (en) => (en ? landing("spa").pathEn : landing("spa").pathFr) },
  { key: "dogs", image: "dogs", titleFr: "Chiens acceptés", titleEn: "Dog-friendly", altFr: "Chalet qui accepte les chiens au Québec", altEn: "Dog-friendly cabin in Quebec", href: (en) => (en ? DOG_FRIENDLY_PATH_EN : DOG_FRIENDLY_PATH_FR) },
  { key: "sauna", image: "sauna", titleFr: "Avec sauna", titleEn: "With a sauna", altFr: "Chalet avec sauna au Québec", altEn: "Cabin with a sauna in Quebec", href: (en) => (en ? landing("sauna").pathEn : landing("sauna").pathFr) },
  { key: "pool-table", image: "pool-table", titleFr: "Table de billard", titleEn: "Pool table", altFr: "Chalet avec table de billard au Québec", altEn: "Cabin with a pool table in Quebec", href: (en) => (en ? landing("pool-table").pathEn : landing("pool-table").pathFr) },
  { key: "ev-charger", image: "ev-charger", titleFr: "Borne de recharge", titleEn: "EV charger", altFr: "Chalet avec borne de recharge pour véhicule électrique", altEn: "Cabin with an electric vehicle charger", href: (en) => (en ? landing("ev-charger").pathEn : landing("ev-charger").pathFr) },
  { key: "remote-work", image: "remote-work", titleFr: "Télétravail", titleEn: "Remote work", altFr: "Chalet pour travailler à distance au Québec", altEn: "Cabin for remote work in Quebec", href: (en) => (en ? landing("remote-work").pathEn : landing("remote-work").pathFr) },
  { key: "accessible", image: "accessible", titleFr: "Mobilité réduite", titleEn: "Accessible", altFr: "Chalet accessible aux personnes à mobilité réduite au Québec", altEn: "Accessible cabin for people with reduced mobility in Quebec", href: (en) => (en ? ACCESSIBLE_PATH_EN : ACCESSIBLE_PATH_FR) },
  { key: "deals", image: "deals", titleFr: "Pas chers", titleEn: "Deals", altFr: "Chalet à louer pas cher au Québec", altEn: "Affordable cabin rental in Quebec", href: (en) => (en ? DEALS_PATH_EN : DEALS_PATH_FR) },
];

export default async function ThemesExplorer({ exclude = [] }: { exclude?: string[] }) {
  const [locale, show] = await Promise.all([getLocale(), getThemeLinkVisibility()]);
  const isEn = locale === "en";

  const isVisible = (key: string) =>
    key === "dogs" ? show.dogFriendly : key === "accessible" ? show.accessible : key === "deals" ? show.deals : show.amenities[key as AmenityLandingKey];
  const visible = THEMES.filter((t) => !exclude.includes(t.key) && isVisible(t.key));
  if (visible.length === 0) return null;

  return (
    <section className="w-full overflow-x-clip bg-white pt-[clamp(64px,8vw,96px)] pb-[clamp(32px,4vw,48px)]">
      <div className="mx-auto max-w-[1280px] px-[clamp(16px,4vw,56px)]">
        <h2 className="mb-[18px] sm:mb-6 text-[length:var(--fs-display)] font-extrabold tracking-[-0.04em] leading-none text-charcoal-800">
          {isEn ? "Explore by theme" : "Explorer par thème"}
        </h2>
        {/* Mobile : une rangée qui défile, marge négative + padding à droite pour déborder jusqu'au bord de l'écran */}
        <div className="-mr-[clamp(16px,4vw,56px)] flex snap-x snap-proximity flex-nowrap gap-3 overflow-x-auto pr-[clamp(16px,4vw,56px)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mr-0 md:flex-wrap md:overflow-visible md:pr-0">
          {visible.map((t) => (
            <Link
              key={t.key}
              href={t.href(isEn)}
              className="group flex flex-none snap-start items-center gap-[10px] whitespace-nowrap rounded-[var(--radius-pill)] border border-[var(--border-2)] bg-white py-1.5 pl-1.5 pr-5 text-[15px] md:gap-3 md:text-base font-semibold text-charcoal-800 transition-[border-color,box-shadow] duration-[140ms] hover:border-charcoal-800 hover:shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)] motion-reduce:transition-none"
            >
              <span className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-full bg-charcoal-100 md:h-12 md:w-12">
                <Image src={`/images/themes/${t.image}.webp`} alt={isEn ? t.altEn : t.altFr} fill sizes="48px" className="object-cover" />
              </span>
              {isEn ? t.titleEn : t.titleFr}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
