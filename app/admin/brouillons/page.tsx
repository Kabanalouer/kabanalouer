import { adminSupabase } from "@/lib/sendMessage";
import { requireAdminPage } from "@/lib/requireAdminPage";
import { listDraftOwners } from "@/lib/claims/draftTable";
import DraftInvitationsClient from "@/components/admin/DraftInvitationsClient";

export const metadata = { title: "Brouillons — Administration" };
export const dynamic = "force-dynamic";

export default async function AdminDraftsPage() {
  await requireAdminPage();
  const rows = await listDraftOwners(adminSupabase());

  const ready = rows.filter((r) => r.status === "pret").length;
  const due = rows.filter((r) => r.due).length;
  const invited = rows.filter((r) => r.invite).length;
  const active = rows.filter((r) => r.status === "actif").length;

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-charcoal-800">Brouillons</h1>
        <p className="text-sm text-charcoal-400 mt-0.5">
          Fiches préparées pour des propriétaires de plusieurs chalets, hors ligne. Vérifiez les fiches et le courriel, puis cliquez sur « Envoyer » quand vous êtes prêt : rien ne part tout seul. Quand une relance est due, vous recevez un courriel.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Prêts à envoyer", String(ready)],
          ["Relances dues", String(due)],
          ["Invités", String(invited)],
          ["Activés", String(active)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-[#ebebeb] bg-white p-4">
            <p className="text-xs text-charcoal-400">{label}</p>
            <p className="mt-1 text-xl font-semibold text-charcoal-800">{value}</p>
          </div>
        ))}
      </div>

      <DraftInvitationsClient rows={rows} />
    </div>
  );
}
