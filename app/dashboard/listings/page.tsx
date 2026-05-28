import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ListingsClient from "@/components/dashboard/ListingsClient";

export const metadata = { title: "Mes chalets — Kabanalouer" };

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const { deleted } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: listings } = await supabase
    .from("listings")
    .select("id, title, region, is_published, price_low, photos, created_at")
    .eq("host_id", user.id)
    .order("created_at", { ascending: false });

  const listingIds = (listings ?? []).map((l) => l.id);
  const { data: reviews } = listingIds.length > 0
    ? await supabase.from("reviews").select("listing_id, rating").in("listing_id", listingIds)
    : { data: [] };

  const reviewRecord: Record<string, { count: number; avg: number }> = {};
  for (const r of (reviews ?? [])) {
    const prev = reviewRecord[r.listing_id] ?? { count: 0, avg: 0 };
    const count = prev.count + 1;
    reviewRecord[r.listing_id] = { count, avg: (prev.avg * prev.count + r.rating) / count };
  }

  return (
    <div className="max-w-5xl">
      {deleted === "1" && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm text-green-800 font-medium">Votre annonce a été supprimée.</p>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-800">Mes chalets</h1>
          <p className="text-charcoal-500 text-sm mt-1">
            {listings?.length ?? 0} chalet{(listings?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/dashboard/listings/new"
          className="flex items-center gap-1.5 bg-primary text-white text-sm px-4 py-2 rounded-full font-semibold hover:bg-primary-dark transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Créer une annonce
        </Link>
      </div>

      {listings && listings.length > 0 ? (
        <ListingsClient listings={listings} reviews={reviewRecord} />
      ) : (
        <div className="bg-white rounded-2xl border border-[#ebebeb] p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-charcoal-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-charcoal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </div>
          <h3 className="font-semibold text-charcoal-800 mb-2">Aucune annonce pour l&apos;instant</h3>
          <p className="text-charcoal-400 text-sm mb-6 max-w-sm mx-auto">
            Créez votre première annonce et rejoignez notre communauté de propriétaires !
          </p>
          <Link
            href="/dashboard/listings/new"
            className="inline-block bg-primary text-white px-6 py-3 rounded-full font-semibold hover:bg-primary-dark transition-colors text-sm"
          >
            + Créer une annonce
          </Link>
        </div>
      )}
    </div>
  );
}
