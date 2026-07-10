// Mapping of FR path segments to their EN equivalents.
// Paths not listed here keep the same slug under /en/.
const PATH_TRANSLATIONS: Array<[string, string]> = [
  ["/chalets/ville", "/cabins/city"],
  ["/chalets", "/cabins"],
  ["/devenir-hote", "/become-a-host"],
  ["/a-propos", "/about"],
  ["/comment-ca-marche", "/how-it-works"],
  ["/tarifs", "/pricing"],
  ["/faq-hotes", "/owner-faq"],
  ["/conditions", "/terms"],
  ["/confidentialite", "/privacy"],
];

export function localePath(path: string, locale: string): string {
  if (locale !== "en") return path;
  // Separate pathname from query string
  const qIdx = path.indexOf("?");
  const pathname = qIdx >= 0 ? path.slice(0, qIdx) : path;
  const query = qIdx >= 0 ? path.slice(qIdx) : "";
  for (const [fr, en] of PATH_TRANSLATIONS) {
    if (pathname === fr || pathname === fr + "/") {
      return `/en${en}${query}`;
    }
    if (pathname.startsWith(fr + "/")) {
      return `/en${en}${pathname.slice(fr.length)}${query}`;
    }
  }
  return `/en${pathname}${query}`;
}
