// Présentation (users.bio) dans la langue du lecteur. `bio` est le texte tel
// qu'écrit, dans n'importe quelle langue ; le cron translate-listings remplit
// `bio_en` (version anglaise, = l'original s'il est déjà en anglais) et
// `bio_fr` (version française, seulement quand l'original est en anglais).
export type BioFields = {
  bio?: string | null;
  bio_en?: string | null;
  bio_fr?: string | null;
};

export const BIO_COLUMNS = "bio, bio_en, bio_fr";

export function localizedBio(p: BioFields | null | undefined, locale: string): string | null {
  if (!p) return null;
  const translated = locale === "en" ? p.bio_en : p.bio_fr;
  return translated || p.bio || null;
}
