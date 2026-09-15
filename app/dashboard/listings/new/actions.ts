"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { importAirbnbListing } from "@/lib/listingImport";

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
  | { status: "success"; listingId: string }
  | { status: "duplicate"; listingId: string }
  | { status: "error"; message: string };

export async function submitImportRequest(
  _prev: ImportState,
  formData: FormData
): Promise<ImportState> {
  const listingUrl = (formData.get("listing_url") as string | null)?.trim() ?? "";
  const photosRightsConfirmed = formData.get("photos_rights_confirmed") === "on";

  if (!listingUrl) {
    return { status: "error", message: "Veuillez coller le lien de votre annonce." };
  }
  try {
    new URL(listingUrl);
  } catch {
    return { status: "error", message: "Le lien n'est pas valide." };
  }
  if (!photosRightsConfirmed) {
    return { status: "error", message: "Vous devez confirmer détenir les droits sur les photos de cette annonce." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Session expirée, veuillez vous reconnecter." };

  const outcome = await importAirbnbListing(supabase, user.id, listingUrl);

  if (!outcome.ok) {
    return { status: "error", message: outcome.error };
  }
  if (outcome.status === "duplicate") {
    return { status: "duplicate", listingId: outcome.listingId };
  }
  return { status: "success", listingId: outcome.listingId };
}
