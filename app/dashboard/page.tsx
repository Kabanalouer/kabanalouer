import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: listings } = await supabase
    .from("listings")
    .select("id, title, region, is_published, price_low, photos, created_at")
    .eq("host_id", user!.id)
    .order("created_at", { ascending: false });

  const { data: profile } = await supabase
    .from("users")
    .select("name")
    .eq("id", user!.id)
    .single();

  const firstName = profile?.name?.split(" ")[0] ?? "là";
  const published = listings?.filter((l) => l.is_published).length ?? 0;
  const drafts = (listings?.length ?? 0) - published;

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Bonjour {firstName} 👋
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Gérez vos chalets et vos demandes depuis ici.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard value={published} label="Chalets publiés" color="text-primary" />
        <StatCard value={drafts} label="Brouillons" color="text-gray-400" />
        <StatCard value="—" label="Messages (Phase 3)" color="text-gray-300" />
      </div>

      {/* Listings */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">Mes chalets</h2>
        <Link
          href="/dashboard/listings/new"
          className="flex items-center gap-2 bg-primary text-white text-sm px-4 py-2 rounded-xl font-semibold hover:bg-primary-dark transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau chalet
        </Link>
      </div>

      {listings && listings.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Chalet
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Région
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Tarif
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Statut
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {listings.map((listing) => (
                <tr
                  key={listing.id}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                        {listing.photos?.[0] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={listing.photos[0]}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <span className="font-medium text-gray-900 line-clamp-1">
                        {listing.title || "Sans titre"}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-500">{listing.region}</td>
                  <td className="px-5 py-4 text-gray-500">
                    {listing.price_low > 0 ? `${listing.price_low} $/nuit` : "—"}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        listing.is_published
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {listing.is_published ? "Publié" : "Brouillon"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/dashboard/listings/${listing.id}/edit`}
                      className="text-primary text-xs font-semibold hover:underline"
                    >
                      Modifier
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="text-5xl mb-4">🏡</div>
          <h3 className="font-semibold text-gray-900 mb-2">
            Aucun chalet pour l&apos;instant
          </h3>
          <p className="text-gray-500 text-sm mb-6">
            Créez votre premier listing et commencez à recevoir des demandes.
          </p>
          <Link
            href="/dashboard/listings/new"
            className="inline-block bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-dark transition-colors text-sm"
          >
            Créer mon premier chalet →
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({
  value,
  label,
  color,
}: {
  value: number | string;
  label: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className={`text-3xl font-bold ${color} mb-1`}>{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}
