"use server";

import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { importAirbnbListing } from "@/lib/listingImport";
import { generateUniqueListingNumber } from "@/lib/generateListingNumber";
import { localePath } from "@/lib/localePath";

export async function createBlankListing() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const locale = await getLocale();

  if (!user) redirect(localePath("/login", locale));

  const listingNumber = await generateUniqueListingNumber(supabase);

  const { data, error } = await supabase
    .from("listings")
    .insert({
      host_id: user.id,
      listing_number: listingNumber,
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
      price_on_request: true,
    })
    .select("id")
    .single();

  if (error || !data) redirect(localePath("/dashboard/listings", locale));

  redirect(localePath(`/dashboard/listings/${data.id}/edit`, locale));
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
  const t = await getTranslations("listings.new");

  if (!listingUrl) {
    return { status: "error", message: t("errorNoUrl") };
  }
  try {
    new URL(listingUrl);
  } catch {
    return { status: "error", message: t("errorInvalidUrl") };
  }
  if (!photosRightsConfirmed) {
    return { status: "error", message: t("errorPhotosRights") };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: t("errorSessionExpired") };

  const tImport = await getTranslations("listings.import");
  const outcome = await importAirbnbListing(supabase, user.id, listingUrl, tImport);

  if (!outcome.ok) {
    return { status: "error", message: outcome.error };
  }
  if (outcome.status === "duplicate") {
    return { status: "duplicate", listingId: outcome.listingId };
  }
  return { status: "success", listingId: outcome.listingId };
}
