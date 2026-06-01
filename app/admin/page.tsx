import { createClient } from "@/lib/supabase/server";

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const [
    { data: activeSubUsers },
    { count: publishedListings },
    { count: totalMessages },
    { count: totalReviews },
    { data: recentUsers },
    { data: recentListings },
  ] = await Promise.all([
    supabase.from("subscriptions").select("user_id").eq("status", "active"),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("is_published", true),
    supabase.from("messages").select("id", { count: "exact", head: true }),
    supabase.from("reviews").select("id", { count: "exact", head: true }),
    supabase.from("users").select("id, name, email, created_at").eq("role", "host").order("created_at", { ascending: false }).limit(5),
    supabase.from("listings").select("id, title, region, is_published, created_at, host:host_id(name)").order("created_at", { ascending: false }).limit(5),
  ]);

  const activeProprios = new Set((activeSubUsers ?? []).map((s) => s.user_id)).size;

  const metrics = [
    { label: "Proprios actifs", value: activeProprios },
    { label: "Annonces publiées", value: publishedListings ?? 0 },
    { label: "Messages envoyés", value: totalMessages ?? 0 },
    { label: "Avis reçus", value: totalReviews ?? 0 },
  ];

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-charcoal-800 mb-8">Vue d&apos;ensemble</h1>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white rounded-2xl border border-[#ebebeb] p-5">
            <p className="text-xs font-semibold text-charcoal-400 uppercase tracking-wide mb-2">{m.label}</p>
            <p className="text-3xl font-bold text-charcoal-800">{m.value.toLocaleString("fr-CA")}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dernières inscriptions */}
        <div className="bg-white rounded-2xl border border-[#ebebeb] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#ebebeb]">
            <h2 className="font-semibold text-charcoal-800">Dernières inscriptions</h2>
            <p className="text-xs text-charcoal-400 mt-0.5">5 proprios les plus récents</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#ebebeb]">
                <th className="text-left px-5 py-3 text-xs font-semibold text-charcoal-400 uppercase tracking-wide">Nom</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-charcoal-400 uppercase tracking-wide">Email</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-charcoal-400 uppercase tracking-wide">Inscrit le</th>
              </tr>
            </thead>
            <tbody>
              {(recentUsers ?? []).map((u) => (
                <tr key={u.id} className="border-b border-[#ebebeb] last:border-0 hover:bg-charcoal-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-charcoal-800 truncate max-w-[120px]">{u.name ?? "—"}</td>
                  <td className="px-5 py-3 text-charcoal-500 truncate max-w-[160px]">{u.email ?? "—"}</td>
                  <td className="px-5 py-3 text-charcoal-400 text-right whitespace-nowrap">
                    {new Date(u.created_at).toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                </tr>
              ))}
              {(recentUsers ?? []).length === 0 && (
                <tr><td colSpan={3} className="px-5 py-6 text-center text-charcoal-400 text-sm">Aucune inscription</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Dernières annonces */}
        <div className="bg-white rounded-2xl border border-[#ebebeb] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#ebebeb]">
            <h2 className="font-semibold text-charcoal-800">Dernières annonces</h2>
            <p className="text-xs text-charcoal-400 mt-0.5">5 annonces les plus récentes</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#ebebeb]">
                <th className="text-left px-5 py-3 text-xs font-semibold text-charcoal-400 uppercase tracking-wide">Titre</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-charcoal-400 uppercase tracking-wide">Région</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-charcoal-400 uppercase tracking-wide">Statut</th>
              </tr>
            </thead>
            <tbody>
              {(recentListings ?? []).map((l) => {
                const hostData = l.host;
                const host = Array.isArray(hostData) ? (hostData[0] as { name: string } | undefined) : (hostData as { name: string } | null);
                return (
                  <tr key={l.id} className="border-b border-[#ebebeb] last:border-0 hover:bg-charcoal-50 transition-colors">
                    <td className="px-5 py-3 max-w-[160px]">
                      <p className="font-medium text-charcoal-800 truncate">{l.title ?? "Sans titre"}</p>
                      <p className="text-xs text-charcoal-400 truncate">{host?.name ?? "—"}</p>
                    </td>
                    <td className="px-5 py-3 text-charcoal-500 whitespace-nowrap">{l.region ?? "—"}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        l.is_published ? "bg-green-50 text-green-700" : "bg-charcoal-100 text-charcoal-500"
                      }`}>
                        {l.is_published ? "Publié" : "Brouillon"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {(recentListings ?? []).length === 0 && (
                <tr><td colSpan={3} className="px-5 py-6 text-center text-charcoal-400 text-sm">Aucune annonce</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
