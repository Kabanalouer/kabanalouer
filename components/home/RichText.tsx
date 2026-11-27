import Link from "next/link";
import { REGIONS } from "@/lib/regions";
import { AMENITY_LANDINGS } from "@/lib/amenityLandings";
import { DOG_FRIENDLY_PATH_EN, DOG_FRIENDLY_PATH_FR } from "@/lib/dogPolicy";
import { localePath } from "@/lib/localePath";

// Rend un texte avec balisage [libellé](cible) : les cibles « theme:<clé> », « region:<slug> », « path:/… » et « #ancre »
// deviennent des liens vers les pages du site, dans la langue courante. Une cible inconnue reste du texte simple
// (jamais un lien cassé). Liens en --fg-link, 600, soulignés au survol.
function resolveHref(target: string, locale: string): string | null {
  const isEn = locale === "en";
  if (target.startsWith("#")) return target;
  if (target.startsWith("path:")) return localePath(target.slice(5), locale);
  if (target.startsWith("region:")) {
    const r = REGIONS.find((x) => x.slug === target.slice(7));
    return r ? (isEn ? `/en/cabins/${r.slugEn}` : `/chalets/${r.slug}`) : null;
  }
  if (target.startsWith("theme:")) {
    const key = target.slice(6);
    if (key === "dogs") return isEn ? DOG_FRIENDLY_PATH_EN : DOG_FRIENDLY_PATH_FR;
    const l = AMENITY_LANDINGS.find((x) => x.key === key);
    return l ? (isEn ? l.pathEn : l.pathFr) : null;
  }
  return null;
}

export default function RichText({ markup, locale }: { markup: string; locale: string }) {
  const parts: React.ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(markup)) !== null) {
    if (m.index > last) parts.push(markup.slice(last, m.index));
    const href = resolveHref(m[2], locale);
    parts.push(
      href ? (
        <Link key={i++} href={href} className="font-semibold text-link hover:underline underline-offset-4">
          {m[1]}
        </Link>
      ) : (
        m[1]
      )
    );
    last = m.index + m[0].length;
  }
  if (last < markup.length) parts.push(markup.slice(last));
  return <>{parts}</>;
}
