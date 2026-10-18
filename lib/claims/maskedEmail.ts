import { adminSupabase } from "@/lib/sendMessage";

// « jean.tremblay@gmail.com » → « j…@gmail.com ». Ne révèle que la première
// lettre et le fournisseur, jamais l'adresse complète.
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1) return "…";
  return `${email[0]}…${email.slice(at)}`;
}

// Adresse masquée du propriétaire d'une fiche non revendiquée, pour afficher
// « Envoyer le lien à j…@gmail.com ». claim_email est une colonne privée : lue
// avec le client service, seule la version masquée sort du serveur.
export async function getMaskedClaimEmail(listingId: string): Promise<string | null> {
  const { data } = await adminSupabase()
    .from("listings")
    .select("claim_email")
    .eq("id", listingId)
    .eq("claim_status", "unclaimed")
    .maybeSingle();
  const email = data?.claim_email as string | null | undefined;
  return email ? maskEmail(email) : null;
}
