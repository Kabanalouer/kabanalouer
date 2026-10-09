"use server";

import { createClient } from "@supabase/supabase-js";
import { sendContactMessageNotification } from "@/lib/emails/contactMessageNotification";

export type ContactFormState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

export async function submitContactForm(
  _prev: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const firstName = (formData.get("first_name") as string | null)?.trim() ?? "";
  const lastName = (formData.get("last_name") as string | null)?.trim() ?? "";
  const name = `${firstName} ${lastName}`.trim();
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  // Le formulaire n'a plus de champ Sujet ; la colonne reste NOT NULL en base.
  const subject = "Formulaire de contact";
  const message = (formData.get("message") as string | null)?.trim() ?? "";
  // Champ caché posé par ContactForm (langue de la page).
  const isEn = formData.get("locale") === "en";

  // Piège à robots rempli : on fait comme si tout allait bien, sans rien enregistrer
  if ((formData.get("website") as string | null)?.trim()) return { status: "success" };

  if (firstName.length > 80 || lastName.length > 80 || email.length > 254) {
    return { status: "error", message: isEn ? "One of the fields is too long." : "Un des champs est trop long." };
  }

  if (!firstName || !lastName || !email || !message) {
    return { status: "error", message: isEn ? "All fields are required." : "Tous les champs sont obligatoires." };
  }

  if (message.length > 5000) {
    return { status: "error", message: isEn ? "The message cannot exceed 5,000 characters." : "Le message ne peut pas dépasser 5000 caractères." };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { status: "error", message: isEn ? "Invalid email address." : "Adresse courriel invalide." };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Limites anti-inondation : même adresse 3 fois par heure, 30 messages par
  // heure au total (au-delà, c'est un robot — la boîte de Simon reste lisible).
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const [{ count: sameEmail }, { count: total }] = await Promise.all([
    supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("email", email).gte("created_at", hourAgo),
    supabase.from("contact_messages").select("id", { count: "exact", head: true }).gte("created_at", hourAgo),
  ]);
  if ((sameEmail ?? 0) >= 3 || (total ?? 0) >= 30) {
    return { status: "error", message: isEn ? "Too many messages sent. Please try again later." : "Trop de messages envoyés. Réessayez plus tard." };
  }

  const { error } = await supabase
    .from("contact_messages")
    .insert({ name, email, subject, message });

  if (error) {
    console.error("contact_messages insert error:", error.message);
    return { status: "error", message: isEn ? "Something went wrong. Please try again." : "Une erreur est survenue. Veuillez réessayer." };
  }

  // Notification à l'admin — ne doit jamais faire échouer la soumission du
  // formulaire si Resend est indisponible (le message est déjà en base).
  try {
    const { error: emailError } = await sendContactMessageNotification({ name, email, message, lang: isEn ? "en" : "fr" });
    if (emailError) {
      console.error("sendContactMessageNotification error:", emailError.message);
    }
  } catch (emailErr) {
    console.error("sendContactMessageNotification threw:", emailErr);
  }

  return { status: "success" };
}
