// Liste de fiches des courriels d'invitation à plusieurs chalets : 3 liens au plus pour ne pas alourdir le courriel,
// puis, à partir de 4 fiches, un lien « Voir mes N autres fiches » vers la page qui les liste toutes.
export const MAX_LISTED_LISTINGS = 3;

export function othersLabel(count: number, fr: boolean): string {
  if (fr) return count === 1 ? "Voir mon autre fiche" : `Voir mes ${count} autres fiches`;
  return count === 1 ? "See my other listing" : `See my ${count} other listings`;
}

// Puces faites à la main (pas de <ul> : le texte du courriel est dans un <p>) : retrait suspendu, « • » en tête ;
// marge négative sous le dernier bloc : le saut de ligne qui suit un bloc ajouterait sinon une ligne vide de trop.
// moreHtml : ligne sans puce sous la liste (lien « Voir mes N autres fiches »).
export function listingBullets(items: string[], moreHtml?: string): string {
  const margin = (isLast: boolean) => (isLast ? -22 : 6);
  const shown = items.slice(0, MAX_LISTED_LISTINGS);
  const bullets = shown
    .map((html, i) => {
      const isLast = !moreHtml && i === shown.length - 1;
      return `<span style="display:block;padding-left:14px;text-indent:-14px;margin:0 0 ${margin(isLast)}px 0;">•&nbsp; ${html}</span>`;
    })
    .join("");
  const more = moreHtml ? `<span style="display:block;margin:0 0 ${margin(true)}px 0;">${moreHtml}</span>` : "";
  return bullets + more;
}
