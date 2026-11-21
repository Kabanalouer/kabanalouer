import { adminSupabase } from "@/lib/sendMessage";
import { requireAdminPage } from "@/lib/requireAdminPage";
import { listDraftOwners } from "@/lib/claims/draftTable";
import DraftInvitationsClient from "@/components/admin/DraftInvitationsClient";

export const metadata = { title: "Brouillons — Administration" };
export const dynamic = "force-dynamic";

export default async function AdminDraftsPage({ searchParams }: { searchParams: Promise<{ onglet?: string }> }) {
  await requireAdminPage();
  const { onglet } = await searchParams;
  // Toutes les lignes sont gardées : chaque propriétaire tombe dans un onglet (« Problèmes » pour les imports qui n'ont pas
  // marché, « Retirés » pour ceux qui ont demandé le retrait). Les données restent en base dans tous les cas.
  const rows = await listDraftOwners(adminSupabase());

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-charcoal-800">Brouillons</h1>
        <p className="text-sm text-charcoal-400 mt-0.5">
          Fiches préparées pour des propriétaires de plusieurs chalets, hors ligne. Vérifiez les fiches et le courriel, puis cliquez sur « Envoyer » quand vous êtes prêt : rien ne part tout seul. Quand une relance est due, vous recevez un courriel.
        </p>
      </div>

      <DraftInvitationsClient rows={rows} initialTab={onglet ?? null} />
    </div>
  );
}
