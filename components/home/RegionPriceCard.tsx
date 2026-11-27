import Link from "next/link";
import { HOME_SEO } from "@/lib/homeSeoContent";
import { localePath } from "@/lib/localePath";
import type { RegionPriceStats } from "@/lib/regionPriceStats";

// Carte « Combien coûte un chalet au Québec ? » (accueil, section « Louer un chalet au Québec… ») : prix de départ moyen
// par nuit selon la région, calculé côté serveur (lib/regionPriceStats.ts) et rendu dans le HTML. Une donnée que
// seul Kabanalouer a : les moteurs de recherche et les outils d'IA peuvent la citer.
export default function RegionPriceCard({ stats, locale }: { stats: RegionPriceStats; locale: string }) {
  const isEn = locale === "en";
  const c = HOME_SEO[isEn ? "en" : "fr"].card;
  const { rows } = stats;
  if (rows.length === 0) return null;

  const max = Math.max(...rows.map((r) => r.average));
  const cheapest = rows.reduce((a, b) => (b.average < a.average ? b : a));
  const money = (n: number) => (isEn ? `$${n}` : `${n} $`);
  const date = new Date(stats.updatedAt).toLocaleDateString(isEn ? "en-CA" : "fr-CA", { day: "numeric", month: "long", year: "numeric" });
  const regionHref = (r: (typeof rows)[number]) => (isEn ? `/en/cabins/${r.slugEn}` : `/chalets/${r.slug}`);

  return (
    <aside className="flex flex-col gap-4 rounded-[var(--radius-xl)] bg-charcoal-50 p-5 sm:p-[clamp(20px,3vw,32px)] lg:sticky lg:top-[100px]">
      <header>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-primary">{c.eyebrow}</p>
        <h3 className="text-[22px] font-extrabold tracking-[-0.025em] leading-tight text-charcoal-800">{c.title}</h3>
        <p className="mt-1 text-sm text-charcoal-400">{c.subtitle}</p>
      </header>

      <table className="w-full border-collapse">
        <caption className="sr-only">{c.caption}</caption>
        <thead>
          <tr className="text-xs font-semibold uppercase tracking-[0.08em] text-charcoal-400">
            <th scope="col" className="px-1 pb-2 text-left font-semibold">{c.colRegion}</th>
            <th scope="col" className="w-20 pb-2 pl-3 pr-1 text-right font-semibold sm:w-[110px]">{c.colPrice}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const name = isEn ? r.nameEn : r.name;
            const pct = Math.max(4, Math.round((r.average / max) * 100));
            return (
              <tr key={r.slug} className="group border-t border-[var(--border-2)]">
                <th scope="row" className="min-w-0 px-1 py-3 text-left align-top font-normal">
                  <Link href={regionHref(r)} className="block min-w-0 text-[15px] font-bold text-charcoal-800 transition-colors group-hover:text-action">
                    {name}
                  </Link>
                  <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-[var(--border-1)]" aria-hidden="true">
                    <span
                      className={`block h-full rounded-full ${r.slug === cheapest.slug ? "bg-highlight" : "bg-primary"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                </th>
                <td className="w-20 py-3 pl-3 pr-1 text-right align-top sm:w-[110px]">
                  <span className="block whitespace-nowrap text-lg font-extrabold tracking-[-0.02em] text-charcoal-800 sm:text-xl">{money(r.average)}</span>
                  <span className="block text-xs text-charcoal-400">{c.perNight}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex flex-col gap-2">
        <p className="text-[13px]">
          <span className="font-bold text-action">{isEn ? cheapest.nameEn : cheapest.name}</span>
          {isEn ? " has the lowest starting prices." : " a les prix de départ les plus bas."}
        </p>
        <p className="text-xs leading-relaxed text-charcoal-400">{c.note(date)}</p>
        <Link href={localePath("/regions", locale)} className="text-[15px] font-bold text-link hover:text-action-hover transition-colors">
          {c.seeAll(stats.regionsListed)}
        </Link>
      </div>
    </aside>
  );
}
