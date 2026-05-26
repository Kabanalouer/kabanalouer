"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function createBlankListing() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("listings")
    .insert({
      host_id: user.id,
      title: "",
      description: "",
      is_published: false,
      capacity: 4,
      bedrooms: 2,
      bathrooms: 1,
      price_low: 0,
      price_high: 0,
      price_peak: 0,
      amenities: [],
      photos: [],
      checkin_time: "16:00",
      checkout_time: "11:00",
      pets_allowed: false,
      smoking_allowed: false,
      checkin_type: "autonomous",
      nearby_activities: [],
      price_on_request: false,
    })
    .select("id")
    .single();

  if (error || !data) redirect("/dashboard/listings");

  redirect(`/dashboard/listings/${data.id}/edit`);
}

export type ImportState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

export async function submitImportRequest(
  _prev: ImportState,
  formData: FormData
): Promise<ImportState> {
  const listingUrl = (formData.get("listing_url") as string | null)?.trim() ?? "";

  if (!listingUrl) {
    return { status: "error", message: "Veuillez coller le lien de votre annonce." };
  }
  try {
    new URL(listingUrl);
  } catch {
    return { status: "error", message: "Le lien n'est pas valide." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Session expirée, veuillez vous reconnecter." };

  const { data: profile } = await supabase
    .from("users")
    .select("name")
    .eq("id", user.id)
    .single();

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await admin.from("contact_messages").insert({
    name: profile?.name ?? user.email ?? "Hôte",
    email: user.email ?? "",
    subject: "Import annonce - hôte connecté",
    message: `Lien de l'annonce : ${listingUrl}`,
  });

  if (error) {
    console.error("contact_messages insert error:", error.message);
    return { status: "error", message: "Une erreur est survenue. Veuillez réessayer." };
  }

  return { status: "success" };
}
