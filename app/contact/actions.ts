"use server";

import { createClient } from "@supabase/supabase-js";

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
  const subject = (formData.get("subject") as string | null)?.trim() ?? "";
  const message = (formData.get("message") as string | null)?.trim() ?? "";

  if (!firstName || !lastName || !email || !subject || !message) {
    return { status: "error", message: "Tous les champs sont obligatoires." };
  }

  if (message.length > 5000) {
    return { status: "error", message: "Le message ne peut pas dépasser 5000 caractères." };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { status: "error", message: "Adresse courriel invalide." };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase
    .from("contact_messages")
    .insert({ name, email, subject, message });

  if (error) {
    console.error("contact_messages insert error:", error.message);
    return { status: "error", message: "Une erreur est survenue. Veuillez réessayer." };
  }

  return { status: "success" };
}
