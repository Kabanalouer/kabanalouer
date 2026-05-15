import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditListingForm from "@/components/dashboard/EditListingForm";

export const metadata = { title: "Modifier le chalet — Kabanalouer" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditListingPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .eq("host_id", user.id)
    .single();

  if (!listing) notFound();

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Modifier le chalet</h1>
        <p className="text-gray-500 text-sm mt-1 line-clamp-1">{listing.title}</p>
      </div>
      <EditListingForm
        userId={user.id}
        listingId={id}
        isPublished={listing.is_published ?? false}
        initialData={{
          title: listing.title ?? "",
          description: listing.description ?? "",
          region: listing.region ?? "",
          address: listing.address ?? "",
          capacity: listing.capacity ?? 4,
          bedrooms: listing.bedrooms ?? 2,
          bathrooms: listing.bathrooms ?? 1,
          price_low: listing.price_low ?? 0,
          price_high: listing.price_high ?? 0,
          price_peak: listing.price_peak ?? 0,
          amenities: Array.isArray(listing.amenities) ? listing.amenities : [],
          photos: Array.isArray(listing.photos) ? listing.photos : [],
        }}
      />
    </div>
  );
}
