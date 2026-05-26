import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Nouveau chalet — Kabanalouer" };

export default async function NewListingPage() {
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

  if (error || !data) {
    console.error("Failed to create blank listing:", error?.message);
    redirect("/dashboard/listings");
  }

  redirect(`/dashboard/listings/${data.id}/edit`);
}
