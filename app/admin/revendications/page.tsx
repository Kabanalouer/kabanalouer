import { adminSupabase } from "@/lib/sendMessage";
import { requireAdminPage } from "@/lib/requireAdminPage";
import ClaimRequestActions from "@/components/admin/ClaimRequestActions";

export const metadata = { title: "Revendications — Administration" };

type ListingEmbed = { id: string; title: string | null; citq_number: string | null; claim_email: string | null; claim_status: string | null };
type RequesterEmbed = { name: string | null; email: string | null };

type Row = {
  id: string;
  kind: "proof" | "dispute";
  status: "pending" | "approved" | "refused" | "handled";
  message: string | null;
  proof_path: string | null;
  contact_email: string | null;
  created_at: string;
  reviewed_at: string | null;
  admin_note: string | null;
  listing: ListingEmbed | ListingEmbed[] | null;
  requester: RequesterEmbed | RequesterEmbed[] | null;
};

const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);
const STATUS_LABELS: Record<Row["status"], string> = { pending: "À traiter", approved: "Approuvée", refused: "Refusée", handled: "Traité" };

export default async function AdminClaimsPage() {
  await requireAdminPage();
  const admin = adminSupabase();

  const { data } = await admin
    .from("claim_requests")
    .select("id, kind, status, message, proof_path, contact_email, created_at, reviewed_at, admin_note, listing:listing_id(id, title, citq_number, claim_email, claim_status), requester:user_id(name, email)")
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []) as unknown as Row[];

  // Épreuves : bucket privé, lien signé valable une heure
  const proofUrls = new Map<string, string>();
  await Promise.all(
    rows
      .filter((r) => r.proof_path)
      .map(async (r) => {
        const { data: signed } = await admin.storage.from("claim-proofs").createSignedUrl(r.proof_path as string, 3600);
        if (signed?.signedUrl) proofUrls.set(r.id, signed.signedUrl);
      })
  );

  const [{ count: unclaimedCount }, { count: publishedUnclaimed }] = await Promise.all([
    admin.from("listings").select("id", { count: "exact", head: true }).eq("claim_status", "unclaimed").eq("is_test", false),
    admin.from("listings").select("id", { count: "exact", head: true }).eq("claim_status", "unclaimed").eq("is_test", false).eq("is_published", true),
  ]);

  // Autres fiches non revendiquées liées à la même adresse : elles suivent une approbation
  const siblingTitles = new Map<string, string[]>();
  await Promise.all(
    rows
      .filter((r) => r.status === "pending" && r.kind === "proof")
      .map(async (r) => {
        const l = one(r.listing);
        if (!l?.claim_email) return;
        const { data: sib } = await admin
          .from("listings")
          .select("id, title")
          .eq("claim_status", "unclaimed")
          .eq("claim_email", l.claim_email)
          .neq("id", l.id);
        if ((sib ?? []).length > 0) siblingTitles.set(r.id, (sib ?? []).map((s) => (s.title as string | null) ?? "(sans titre)"));
      })
  );

  const pending = rows.filter((r) => r.status === "pending");
  const done = rows.filter((r) => r.status !== "pending");

  const card = (r: Row) => {
    const listing = one(r.listing);
    const requester = one(r.requester);
    return (
      <div key={r.id} className="px-6 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-charcoal-100 px-2.5 py-0.5 text-xs font-semibold text-charcoal-700">
            {r.kind === "proof" ? "Demande de vérification" : "Signalement après activation"}
          </span>
          <span className="text-xs text-charcoal-400">
            {new Date(r.created_at).toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" })}
            {" · "}
            {STATUS_LABELS[r.status]}
          </span>
        </div>
        <p className="mt-2 text-base font-semibold text-charcoal-800">{listing?.title ?? "(fiche supprimée)"}</p>
        <p className="text-sm text-charcoal-500">
          CITQ {listing?.citq_number ?? "—"} · adresse au dossier {listing?.claim_email ?? "—"} · statut de la fiche {listing?.claim_status ?? "—"}
        </p>
        <p className="mt-1 text-sm text-charcoal-500">
          De {requester?.name ?? "—"} · {requester?.email ?? r.contact_email ?? "—"}
        </p>
        {r.message && <p className="mt-3 whitespace-pre-wrap rounded-xl bg-charcoal-50 p-3 text-sm text-charcoal-700">{r.message}</p>}
        {proofUrls.get(r.id) && (
          <p className="mt-2 text-sm">
            <a href={proofUrls.get(r.id)} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
              Voir la preuve jointe
            </a>
          </p>
        )}
        {r.admin_note && <p className="mt-2 text-sm text-charcoal-500">Note : {r.admin_note}</p>}
        {r.status === "pending" && r.kind === "proof" && siblingTitles.has(r.id) && (
          <p className="mt-2 rounded-xl bg-warning-50 p-3 text-sm text-warning-800">
            L’approbation transfère aussi {siblingTitles.get(r.id)!.length} autre{siblingTitles.get(r.id)!.length > 1 ? "s" : ""} fiche{siblingTitles.get(r.id)!.length > 1 ? "s" : ""} liée{siblingTitles.get(r.id)!.length > 1 ? "s" : ""} à la même adresse au dossier : {siblingTitles.get(r.id)!.join(", ")}.
          </p>
        )}
        {r.status === "pending" && <ClaimRequestActions id={r.id} kind={r.kind} siblingCount={siblingTitles.get(r.id)?.length ?? 0} />}
      </div>
    );
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-charcoal-800">Revendications</h1>
        <p className="text-sm text-charcoal-400 mt-0.5">
          {pending.length} à traiter · {unclaimedCount ?? 0} fiche{(unclaimedCount ?? 0) !== 1 ? "s" : ""} non revendiquée{(unclaimedCount ?? 0) !== 1 ? "s" : ""}, dont {publishedUnclaimed ?? 0} en ligne
        </p>
      </div>

      <h2 className="mb-3 text-heading-3 font-semibold text-charcoal-800">À traiter</h2>
      {pending.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#ebebeb] p-8 text-center text-charcoal-400 text-sm">Aucune demande en attente.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#ebebeb] overflow-hidden divide-y divide-[#ebebeb]">{pending.map(card)}</div>
      )}

      {done.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 text-heading-3 font-semibold text-charcoal-800">Traitées récemment</h2>
          <div className="bg-white rounded-2xl border border-[#ebebeb] overflow-hidden divide-y divide-[#ebebeb]">{done.map(card)}</div>
        </>
      )}
    </div>
  );
}
