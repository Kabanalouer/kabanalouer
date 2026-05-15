import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ListingForm from "@/components/dashboard/ListingForm";

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

  const initialData = {
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
  };

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modifier le chalet</h1>
          <p className="text-gray-500 text-sm mt-1 line-clamp-1">{listing.title}</p>
        </div>
        <Link
          href={`/dashboard/listings/${id}/availability`}
          className="shrink-0 flex items-center gap-2 border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Disponibilités
        </Link>
      </div>
      <ListingForm userId={user.id} listingId={id} initialData={initialData} />
    </div>
  );
}
