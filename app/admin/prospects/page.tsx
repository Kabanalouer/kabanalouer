import { adminSupabase } from "@/lib/sendMessage";
import { requireAdminPage } from "@/lib/requireAdminPage";
import ProspectsClient, { type ProspectRow } from "@/components/admin/ProspectsClient";

export const metadata = { title: "Prospects — Administration" };
export const dynamic = "force-dynamic";

export default async function AdminProspectsPage() {
  await requireAdminPage();
  const { data } = await adminSupabase()
    .from("prospect_sites")
    .select("id, name, domain, site_url, category, region, is_manager, listings_seen, sample_url, note, status")
    .order("listings_seen", { ascending: false, nullsFirst: false })
    .order("name");

  const rows: ProspectRow[] = (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    domain: (r.domain as string | null) ?? null,
    siteUrl: (r.site_url as string | null) ?? null,
    category: (r.category as string | null) ?? null,
    region: (r.region as string | null) ?? null,
    isManager: Boolean(r.is_manager),
    listingsSeen: (r.listings_seen as number | null) ?? null,
    sampleUrl: (r.sample_url as string | null) ?? null,
    note: (r.note as string | null) ?? null,
    status: r.status as ProspectRow["status"],
  }));

  const count = (status: ProspectRow["status"]) => rows.filter((r) => r.status === status).length;

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-charcoal-800">Prospects</h1>
        <p className="text-sm text-charcoal-400 mt-0.5">
          Sites de propriétaires repérés sur le web. « Créer brouillon / invitation » met le site en file d’attente : dites-moi ensuite de traiter la file et je prépare les brouillons et la note d’invitation. Rien n’est envoyé : l’invitation part toujours depuis Brouillons.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Nouveaux", String(count("nouveau"))],
          ["En file d’attente", String(count("a_creer"))],
          ["Brouillons créés", String(count("brouillons_crees") + count("invitation_envoyee"))],
          ["Ignorés", String(count("ignore"))],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-[#ebebeb] bg-white p-4">
            <p className="text-xs text-charcoal-400">{label}</p>
            <p className="mt-1 text-xl font-semibold text-charcoal-800">{value}</p>
          </div>
        ))}
      </div>

      <ProspectsClient rows={rows} />
    </div>
  );
}
