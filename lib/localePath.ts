export function localePath(path: string, locale: string): string {
  return locale === "en" ? `/en${path}` : path;
}
