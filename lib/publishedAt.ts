// Date de la première mise en ligne d'une annonce par son proprio (listings.published_at, colonne privée).
// Sert de repère à la séquence d'accueil (cron host-onboarding-emails). Posée une seule fois.
type AdminClient = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export async function markPublished(admin: AdminClient, listingIds: string[]): Promise<void> {
  if (listingIds.length === 0) return;
  const { error } = await admin.from("listings").update({ published_at: new Date().toISOString() }).in("id", listingIds).is("published_at", null);
  if (error) console.error("markPublished: échec", error.message);
}
