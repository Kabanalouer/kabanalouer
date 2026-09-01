import Link from "next/link";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const metadata = { title: "Imports en attente — Administration" };

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export default async function AdminImportsPage() {
  const admin = adminSupabase();

  const { data: rows } = await admin
    .from("listings")
    .select("id, title, import_source, created_at, host:host_id(name, email)")
    .eq("import_status", "pending_review")
    .order("created_at", { ascending: false });

  const imports = (rows ?? []).map((r) => {
    const hostRaw = r.host;
    const host = Array.isArray(hostRaw) ? hostRaw[0] : hostRaw;
    return {
      id: r.id as string,
      title: (r.title as string) || "Annonce sans titre",
      source: (r.import_source as string) ?? "—",
      createdAt: (r.created_at as string) ?? "",
      hostName: (host?.name as string) || "—",
      hostEmail: (host?.email as string) || "—",
    };
  });

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-charcoal-800">Imports en attente</h1>
        <p className="text-sm text-charcoal-400 mt-0.5">
          {imports.length} annonce{imports.length !== 1 ? "s" : ""} importée{imports.length !== 1 ? "s" : ""} en attente de révision
        </p>
      </div>

      {imports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#ebebeb] p-8 text-center text-charcoal-400 text-sm">
          Aucun import en attente pour l&apos;instant.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#ebebeb] overflow-hidden divide-y divide-[#ebebeb]">
          {imports.map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-4 px-6 py-4">
              <div className="min-w-0">
                <p className="font-semibold text-charcoal-800 text-sm truncate">{row.title}</p>
                <p className="text-xs text-charcoal-400 mt-0.5">
                  {row.hostName} · {row.hostEmail} · importée depuis {row.source === "airbnb" ? "Airbnb" : row.source}
                  {row.createdAt && (
                    <> · {new Date(row.createdAt).toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" })}</>
                  )}
                </p>
              </div>
              <Link
                href={`/dashboard/listings/${row.id}/edit`}
                className="shrink-0 bg-primary text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-primary-dark transition-colors"
              >
                Réviser
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
