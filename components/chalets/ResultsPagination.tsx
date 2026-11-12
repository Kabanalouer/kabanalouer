"use client";

import { useTranslations } from "next-intl";

// Pages à afficher, comme Airbnb : première, dernière, la page courante et ses voisines, des points de
// suspension entre les trous. Un trou d'une seule page est remplacé par son numéro.
function pageItems(current: number, count: number): (number | "gap")[] {
  const wanted = new Set<number>([1, count, current - 1, current, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((p) => wanted.add(p));
  if (current >= count - 2) [count - 3, count - 2, count - 1].forEach((p) => wanted.add(p));
  const pages = [...wanted].filter((p) => p >= 1 && p <= count).sort((a, b) => a - b);
  const items: (number | "gap")[] = [];
  pages.forEach((p, i) => {
    const prev = pages[i - 1];
    if (prev !== undefined && p - prev === 2) items.push(prev + 1);
    else if (prev !== undefined && p - prev > 2) items.push("gap");
    items.push(p);
  });
  return items;
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={direction === "left" ? "M15.75 19.5L8.25 12l7.5-7.5" : "M8.25 4.5l7.5 7.5-7.5 7.5"} />
    </svg>
  );
}

export default function ResultsPagination({
  page,
  pageCount,
  from,
  to,
  total,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  from: number;
  to: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const t = useTranslations("chaletsMap");
  if (pageCount <= 1) return null;

  const arrow =
    "flex h-10 w-10 items-center justify-center rounded-full border border-charcoal-300 bg-white text-charcoal-800 transition-colors hover:bg-charcoal-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white";

  return (
    <nav aria-label={t("paginationLabel")} className="mt-10 flex flex-col items-center gap-3">
      <ul className="flex flex-wrap items-center justify-center gap-1">
        <li>
          <button type="button" className={arrow} disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label={t("prevPage")}>
            <Chevron direction="left" />
          </button>
        </li>
        {pageItems(page, pageCount).map((item, i) => (
          <li key={item === "gap" ? `gap-${i}` : item}>
            {item === "gap" ? (
              <span className="flex h-10 w-8 items-center justify-center text-charcoal-400" aria-hidden="true">…</span>
            ) : (
              <button
                type="button"
                onClick={() => item !== page && onPageChange(item)}
                aria-label={t("pageLabel", { page: item })}
                aria-current={item === page ? "page" : undefined}
                className={`flex h-10 min-w-10 items-center justify-center rounded-full px-2 text-sm font-semibold tabular-nums transition-colors ${
                  item === page ? "bg-charcoal-800 text-white" : "text-charcoal-800 hover:bg-charcoal-50"
                }`}
              >
                {item}
              </button>
            )}
          </li>
        ))}
        <li>
          <button type="button" className={arrow} disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} aria-label={t("nextPage")}>
            <Chevron direction="right" />
          </button>
        </li>
      </ul>
      <p className="text-sm text-charcoal-500">{t("rangeOf", { from, to, total })}</p>
    </nav>
  );
}
