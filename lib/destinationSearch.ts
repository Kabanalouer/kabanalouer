// Correspondance tolérante pour le champ « Destination » des barres de
// recherche (useSearchForm et NavSearchBar) : majuscules, accents, tirets et
// abréviations (« st » = « saint ») ignorés, fautes de frappe proposées en
// « Vouliez-vous dire… ». Une recherche ne part jamais sur un lieu inconnu.

export type DestItem = { label: string; type: "region" | "city"; value: string };

// Candidat : l'élément affiché + les textes sur lesquels on compare
// (nom FR et EN pour une région).
export type DestCandidate = { item: DestItem; names: string[] };

const ABBREVIATIONS: Record<string, string> = { st: "saint", ste: "sainte", mt: "mont" };

export function normalizeDest(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[-'’.,/]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => ABBREVIATIONS[w] ?? w)
    .join(" ");
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

// 0 = identique, 1 = commence par, 2 = un mot commence par, 3 = contient.
function matchScore(q: string, name: string): number | null {
  if (name === q) return 0;
  if (name.startsWith(q)) return 1;
  if (name.includes(" " + q)) return 2;
  if (name.includes(q)) return 3;
  return null;
}

export type RankedDestinations = {
  items: DestItem[];
  /** Vrai quand aucun nom ne contient la saisie : ce sont des propositions
   *  « Vouliez-vous dire… » (fautes de frappe), jamais choisies automatiquement. */
  fuzzy: boolean;
  /** Élément dont le nom correspond exactement à la saisie, s'il y en a un. */
  exact: DestItem | null;
  /** Seul élément dont le nom commence par la saisie (ex. « laurentide »). */
  onlyPrefix: DestItem | null;
};

export function rankDestinations(
  query: string,
  regions: DestCandidate[],
  cities: DestCandidate[],
  limits = { regions: 4, cities: 6 }
): RankedDestinations {
  const q = normalizeDest(query);
  if (!q) return { items: [], fuzzy: false, exact: null, onlyPrefix: null };

  const scoreAll = (list: DestCandidate[]) =>
    list
      .map((c) => {
        const scores = c.names.map((n) => matchScore(q, normalizeDest(n))).filter((s): s is number => s !== null);
        return scores.length ? { c, score: Math.min(...scores) } : null;
      })
      .filter((x): x is { c: DestCandidate; score: number } => x !== null)
      .sort((a, b) => a.score - b.score || a.c.item.label.length - b.c.item.label.length);

  const regionHits = scoreAll(regions).slice(0, limits.regions);
  const cityHits = scoreAll(cities).slice(0, limits.cities);
  const allHits = [...regionHits, ...cityHits];
  const exactHit = allHits.find((h) => h.score === 0);
  const prefixHits = allHits.filter((h) => h.score <= 1);
  if (allHits.length) {
    return {
      items: allHits.map((h) => h.c.item),
      fuzzy: false,
      exact: exactHit?.c.item ?? null,
      onlyPrefix: prefixHits.length === 1 ? prefixHits[0].c.item : null,
    };
  }

  // Aucune correspondance : on cherche les noms les plus proches (fautes de
  // frappe), en comparant au nom entier et à son début de même longueur.
  if (q.length < 3) return { items: [], fuzzy: false, exact: null, onlyPrefix: null };
  const maxDist = q.length <= 5 ? 1 : 2;
  const near = [...regions, ...cities]
    .map((c) => {
      const d = Math.min(
        ...c.names.map((n) => {
          const nn = normalizeDest(n);
          return Math.min(levenshtein(q, nn), levenshtein(q, nn.slice(0, q.length)));
        })
      );
      return { c, d };
    })
    .filter((x) => x.d <= maxDist)
    .sort((a, b) => a.d - b.d || a.c.item.label.length - b.c.item.label.length)
    .slice(0, 3);
  return { items: near.map((x) => x.c.item), fuzzy: near.length > 0, exact: null, onlyPrefix: null };
}

// Destination à utiliser quand on lance la recherche sans avoir cliqué une
// suggestion : correspondance exacte, seul nom qui commence par la saisie,
// ou une seule suggestion possible.
// Sinon null — la recherche est bloquée et la liste reste ouverte.
export function resolveDestination(ranked: RankedDestinations): DestItem | null {
  if (ranked.exact) return ranked.exact;
  if (ranked.onlyPrefix) return ranked.onlyPrefix;
  if (!ranked.fuzzy && ranked.items.length === 1) return ranked.items[0];
  return null;
}
