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

function Arrow({ direction }: { direction: "left" | "right" }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={direction === "left" ? "M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" : "M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"} />
    </svg>
  );
}

const ROUND = "flex h-11 min-w-11 items-center justify-center rounded-full text-sm font-semibold tabular-nums transition-colors";

export default function ResultsPagination({
  page,
  pageCount,
  shown,
  total,
  hrefFor,
  onPageChange,
  onLoadMore,
  loadingMore,
}: {
  page: number;
  pageCount: number;
  // Fiches actuellement affichées (les pages chargées par « Afficher plus » s'ajoutent)
  shown: number;
  total: number;
  // Vrai lien (?page=N) : les moteurs de recherche suivent les pages, un clic simple reste côté navigateur
  hrefFor: (page: number) => string;
  onPageChange: (page: number) => void;
  onLoadMore: () => void;
  loadingMore: boolean;
}) {
  const t = useTranslations("chaletsMap");
  if (pageCount <= 1) return null;

  const share = total > 0 ? Math.min(100, Math.round((shown / total) * 100)) : 0;

  // Clic simple : on charge côté client. Clic avec Ctrl/Cmd/Maj ou bouton du milieu : le navigateur ouvre le lien.
  const go = (target: number) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onPageChange(target);
  };

  const idle = `${ROUND} text-[var(--fg-1)] hover:bg-charcoal-50`;
  const arrowIdle = `${ROUND} border border-[var(--border-2)] bg-white text-[var(--fg-1)] hover:bg-charcoal-50`;
  const arrowOff = `${ROUND} border border-[var(--border-1)] text-charcoal-300 cursor-not-allowed`;

  return (
    <div className="flex flex-col items-center gap-5 pt-6">
      <p className="text-sm text-[var(--fg-3)]">{t("shownOf", { shown, total })}</p>

      <div
        className="h-1 w-60 max-w-full rounded-full bg-[var(--border-1)] overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={share}
        aria-label={t("shownOf", { shown, total })}
      >
        <div className="h-full rounded-full bg-[var(--fg-1)]" style={{ width: `${share}%` }} />
      </div>

      {page < pageCount && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loadingMore}
          className="rounded-[var(--radius-sm)] bg-[var(--fg-1)] px-7 py-[15px] text-[15px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {t("loadMore")}
        </button>
      )}

      <nav aria-label={t("paginationLabel")}>
        <ul className="flex items-center justify-center gap-1">
          <li>
            {page > 1 ? (
              <a href={hrefFor(page - 1)} onClick={go(page - 1)} className={arrowIdle} aria-label={t("prevPage")} rel="prev">
                <Arrow direction="left" />
              </a>
            ) : (
              <span className={arrowOff} aria-disabled="true" aria-label={t("prevPage")}>
                <Arrow direction="left" />
              </span>
            )}
          </li>

          {/* Sous 640 px : seulement « page courante / total » */}
          <li className="sm:hidden px-3 text-sm font-semibold tabular-nums text-[var(--fg-1)]" aria-hidden="true">
            {t("pageCompact", { page, count: pageCount })}
          </li>

          {pageItems(page, pageCount).map((item, i) => (
            <li key={item === "gap" ? `gap-${i}` : item} className="hidden sm:block">
              {item === "gap" ? (
                <span className="flex h-11 w-8 items-center justify-center text-charcoal-400" aria-hidden="true">…</span>
              ) : item === page ? (
                <span className={`${ROUND} bg-[var(--bg-inverse)] text-white`} aria-current="page" aria-label={t("pageLabel", { page: item })}>
                  {item}
                </span>
              ) : (
                <a href={hrefFor(item)} onClick={go(item)} className={idle} aria-label={t("pageLabel", { page: item })}>
                  {item}
                </a>
              )}
            </li>
          ))}

          <li>
            {page < pageCount ? (
              <a href={hrefFor(page + 1)} onClick={go(page + 1)} className={arrowIdle} aria-label={t("nextPage")} rel="next">
                <Arrow direction="right" />
              </a>
            ) : (
              <span className={arrowOff} aria-disabled="true" aria-label={t("nextPage")}>
                <Arrow direction="right" />
              </span>
            )}
          </li>
        </ul>
      </nav>
    </div>
  );
}
