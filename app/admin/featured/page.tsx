import { createClient } from "@/lib/supabase/server";
import { firstPhotoUrl } from "@/lib/photo";
import { REGIONS } from "@/lib/regions";
import AdminFeaturedClient, {
  type FeaturedRow,
  type PickableListing,
} from "@/components/admin/AdminFeaturedClient";

export const metadata = { title: "Boosts — Administration" };

export default async function AdminFeaturedPage() {
  const supabase = await createClient();

  const [{ data: featured }, { data: listings }] = await Promise.all([
    supabase
      .from("featured_listings")
      .select(
        "id, listing_id, type, month, region, status, listing:listing_id(id, title, photos, host:host_id(name))"
      )
      .in("status", ["active", "pending"])
      .order("month", { ascending: true }),
    supabase
      .from("listings")
      .select("id, title, region, host:host_id(name)")
      .eq("is_published", true)
      .order("title", { ascending: true }),
  ]);

  const featuredRows: FeaturedRow[] = (featured ?? []).map((f) => {
    const listingRaw = f.listing;
    const listing = Array.isArray(listingRaw)
      ? (listingRaw[0] as { id: string; title: string; photos: unknown; host: unknown } | undefined)
      : (listingRaw as { id: string; title: string; photos: unknown; host: unknown } | null);

    const hostRaw = listing?.host;
    const host = Array.isArray(hostRaw)
      ? (hostRaw[0] as { name: string } | undefined)
      : (hostRaw as { name: string } | null);

    return {
      id: f.id as string,
      listingId: f.listing_id as string,
      title: (listing?.title as string) ?? "—",
      featuredRegion: (f.region as string | null) ?? null,
      type: (f.type as "home" | "region"),
      month: (f.month as string) ?? "",
      status: (f.status as string) ?? "active",
      photoUrl: firstPhotoUrl(listing?.photos) ?? null,
      hostName: (host?.name as string) ?? "—",
    };
  });

  const homeRows = featuredRows.filter((r) => r.type === "home");
  const regionRows = featuredRows.filter((r) => r.type === "region");

  const pickableListings: PickableListing[] = (listings ?? []).map((l) => {
    const hostRaw = l.host;
    const host = Array.isArray(hostRaw)
      ? (hostRaw[0] as { name: string } | undefined)
      : (hostRaw as { name: string } | null);
    return {
      id: l.id as string,
      title: (l.title as string) ?? "",
      region: (l.region as string) ?? "",
      hostName: (host?.name as string) ?? "—",
    };
  });

  const regions = REGIONS.map((r) => r.dbValue);

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-charcoal-800">Boosts</h1>
        <p className="text-sm text-charcoal-400 mt-0.5">
          Gérez les emplacements de boost de la page d&apos;accueil et des pages région.
        </p>
      </div>
      <AdminFeaturedClient
        homeRows={homeRows}
        regionRows={regionRows}
        listings={pickableListings}
        regions={regions}
      />
    </div>
  );
}
