"use server";

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { escapeHtml } from "@/lib/escapeHtml";

export type ImportRequestState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

export async function submitImportRequest(
  _prev: ImportRequestState,
  formData: FormData
): Promise<ImportRequestState> {
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  const listingUrl = (formData.get("listing_url") as string | null)?.trim() ?? "";

  if (!name || !email || !listingUrl) {
    return { status: "error", message: "Tous les champs sont obligatoires." };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { status: "error", message: "Adresse courriel invalide." };
  }

  try {
    new URL(listingUrl);
  } catch {
    return { status: "error", message: "Le lien de l'annonce n'est pas valide." };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase.from("contact_messages").insert({
    name,
    email,
    subject: "Import annonce externe",
    message: `Lien de l'annonce : ${listingUrl}`,
  });

  if (error) {
    console.error("contact_messages insert error:", error.message);
    return { status: "error", message: "Une erreur est survenue. Veuillez réessayer." };
  }

  if (process.env.RESEND_API_KEY) {
    try {
      // name/email/listingUrl viennent d'un visiteur non authentifié — jamais
      // interpolés tels quels dans le HTML (voir lib/escapeHtml.ts).
      const safeName = escapeHtml(name);
      const safeEmail = escapeHtml(email);
      const safeListingUrl = escapeHtml(listingUrl);
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Kabanalouer <no-reply@kabanalouer.ca>",
        to: "simon.authentik@gmail.com",
        // Sujet : texte brut, jamais rendu en HTML — pas besoin d'échappement ici.
        subject: `Nouvelle demande d'import — ${name}`,
        html: `
          <p><strong>Nom :</strong> ${safeName}</p>
          <p><strong>Courriel :</strong> ${safeEmail}</p>
          <p><strong>Lien de l'annonce :</strong> <a href="${safeListingUrl}">${safeListingUrl}</a></p>
        `,
      });
    } catch (emailErr) {
      console.error("Resend error:", emailErr);
    }
  }

  return { status: "success" };
}
