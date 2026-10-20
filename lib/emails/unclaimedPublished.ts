import { Resend } from "resend";

// Avis interne : des fiches non revendiquées viennent d'être mises en ligne par le cron
// publish-unclaimed (une fois par matin, dès que le lot du jour est importé).
// Texte brut, un seul destinataire — même pattern que errorAlert.ts.
// Les titres viennent des annonces importées : texte brut seulement, jamais de HTML.

const FROM = "Kabanalouer <info@kabanalouer.ca>";
const ADMIN_EMAIL = "simon.authentik@gmail.com";
const ADMIN_URL = "https://kabanalouer.ca/admin/invitations";

export interface PublishedUnclaimedItem {
  title: string;
  city: string | null;
  region: string | null;
  url: string | null;
}

export async function sendUnclaimedPublishedNotice({
  items,
  waiting,
}: {
  items: PublishedUnclaimedItem[];
  waiting: number;
}): Promise<{ error: Error | null }> {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const n = items.length;
  const lines = items.map((it) => {
    const title = it.title.replace(/\s+/g, " ").trim().slice(0, 90);
    const where = [it.city, it.region].filter(Boolean).join(", ");
    return `- ${title}${where ? ` (${where})` : ""}${it.url ? `\n  ${it.url}` : ""}`;
  });
  const { error } = await resend.emails.send({
    from: FROM,
    to: [ADMIN_EMAIL],
    subject: `${n} ${n > 1 ? "nouveaux chalets en ligne" : "nouveau chalet en ligne"} sur Kabanalouer`,
    text: [
      `${n} ${n > 1 ? "fiches non revendiquées viennent d’être mises en ligne" : "fiche non revendiquée vient d’être mise en ligne"} :`,
      "",
      ...lines,
      "",
      waiting > 0 ? `Encore ${waiting} fiche(s) importée(s) en attente de publication.` : null,
      "Les invitations aux propriétaires partent tout de suite après la mise en ligne.",
      `Suivi : ${ADMIN_URL}`,
    ].filter((l) => l !== null).join("\n"),
  });
  return { error: error ? new Error(error.message) : null };
}
