import { adminSupabase } from "@/lib/sendMessage";
import { requireAdminPage } from "@/lib/requireAdminPage";
import { listInvitationCandidates, REMINDER_DELAY_DAYS } from "@/lib/claims/invitations";
import InvitationsClient, { type InvitationRow } from "@/components/admin/InvitationsClient";

export const metadata = { title: "Invitations — Administration" };

type Sent = { id: string; claim_email: string; kind: "invite" | "reminder"; sent_at: string; opened_at: string | null; claimed_at: string | null; listing_ids: string[] };

const fmt = (iso: string) => new Date(iso).toLocaleDateString("fr-CA", { month: "short", day: "numeric" });

export default async function AdminInvitationsPage() {
  await requireAdminPage();
  const admin = adminSupabase();

  const [invite, reminder, { data: sentData }, queue, { data: rejected }, unpublished] = await Promise.all([
    listInvitationCandidates(admin, "invite"),
    listInvitationCandidates(admin, "reminder"),
    admin.from("listing_invitations").select("id, claim_email, kind, sent_at, opened_at, claimed_at, listing_ids").order("sent_at", { ascending: false }).limit(200),
    Promise.all((["pending", "imported", "rejected"] as const).map((s) => admin.from("listing_import_queue").select("id", { count: "exact", head: true }).eq("status", s))),
    admin.from("listing_import_queue").select("import_source_url, error").eq("status", "rejected").order("created_at", { ascending: false }).limit(5),
    admin.from("listings").select("id", { count: "exact", head: true }).eq("claim_status", "unclaimed").eq("is_published", false).eq("is_test", false),
  ]);

  // Fiches importées dont le CITQ existe déjà chez un vrai compte (importées quand même, à juger)
  const { data: dupes } = await admin
    .from("listings")
    .select("id, title, is_published, import_raw_data")
    .eq("claim_status", "unclaimed")
    .not("import_raw_data->doublon_possible", "is", null)
    .limit(50);

  const sent = (sentData ?? []) as Sent[];
  const invites = sent.filter((s) => s.kind === "invite");
  const stats = {
    invited: invites.length,
    opened: invites.filter((s) => s.opened_at).length,
    claimed: invites.filter((s) => s.claimed_at).length,
    reminders: sent.filter((s) => s.kind === "reminder").length,
  };
  const pct = (n: number) => (stats.invited > 0 ? ` (${Math.round((n / stats.invited) * 100)} %)` : "");

  const toRows = (cands: Awaited<ReturnType<typeof listInvitationCandidates>>): InvitationRow[] =>
    cands.map((c) => ({
      email: c.claimEmail,
      lang: c.lang,
      invitedAt: c.invitedAt,
      titles: c.listings.map((l) => ((c.lang === "en" ? l.title_en : null) || l.title || "(sans titre)") as string),
    }));

  const [{ count: pending }, { count: imported }, { count: rejectedCount }] = queue;

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-charcoal-800">Invitations</h1>
        <p className="text-sm text-charcoal-400 mt-0.5">
          Invitations à activer leur fiche, envoyées aux propriétaires des fiches non revendiquées publiées. L’envoi est automatique chaque jour vers 10 h (invitation, puis une relance après {REMINDER_DELAY_DAYS} jours, une seule de chaque par adresse) ; les boutons ci-dessous permettent d’envoyer à la main avant.
        </p>
      </div>

      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Invitations envoyées", String(stats.invited)],
          ["Ouvertes (indicatif)", `${stats.opened}${pct(stats.opened)}`],
          ["Fiches revendiquées", `${stats.claimed}${pct(stats.claimed)}`],
          ["Relances envoyées", String(stats.reminders)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-[#ebebeb] bg-white p-4">
            <p className="text-xs text-charcoal-400">{label}</p>
            <p className="mt-1 text-xl font-semibold text-charcoal-800">{value}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-heading-3 font-semibold text-charcoal-800">À inviter ({invite.length})</h2>
      <InvitationsClient kind="invite" rows={toRows(invite)} />

      <h2 className="mb-3 mt-10 text-heading-3 font-semibold text-charcoal-800">Relances à envoyer ({reminder.length})</h2>
      <p className="mb-3 text-sm text-charcoal-400">Invités il y a {REMINDER_DELAY_DAYS} jours ou plus, fiche toujours non revendiquée, jamais relancés.</p>
      <InvitationsClient kind="reminder" rows={toRows(reminder)} />

      <h2 className="mb-3 mt-10 text-heading-3 font-semibold text-charcoal-800">Envois récents</h2>
      {sent.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#ebebeb] p-8 text-center text-charcoal-400 text-sm">Aucun courriel envoyé pour l&apos;instant.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#ebebeb] overflow-hidden divide-y divide-[#ebebeb]">
          {sent.slice(0, 50).map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 text-sm">
              <span className="min-w-0 truncate text-charcoal-800">{s.claim_email}</span>
              <span className="text-charcoal-500">
                {s.kind === "invite" ? "Invitation" : "Relance"} le {fmt(s.sent_at)}
                {s.opened_at ? ` · ouverte le ${fmt(s.opened_at)}` : " · pas ouverte"}
                {s.claimed_at ? ` · revendiquée le ${fmt(s.claimed_at)}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}

      {(dupes ?? []).length > 0 && (
        <>
          <h2 className="mb-3 mt-10 text-heading-3 font-semibold text-charcoal-800">Doublons possibles ({(dupes ?? []).length})</h2>
          <p className="mb-3 text-sm text-charcoal-400">Fiches importées dont le CITQ existe déjà chez un proprio inscrit. Elles sont importées quand même : à vous de juger (un CITQ peut couvrir plusieurs unités).</p>
          <div className="bg-white rounded-2xl border border-[#ebebeb] overflow-hidden divide-y divide-[#ebebeb]">
            {(dupes ?? []).map((d) => {
              const matches = ((d.import_raw_data as { doublon_possible?: { id: string; title: string }[] } | null)?.doublon_possible ?? []);
              return (
                <div key={d.id as string} className="px-6 py-3 text-sm">
                  <p className="text-charcoal-800">
                    <a href={`/dashboard/listings/${d.id}/edit`} className="font-semibold text-primary hover:underline">{(d.title as string) ?? "(sans titre)"}</a>
                    {d.is_published ? " · en ligne" : " · pas encore publiée"}
                  </p>
                  <p className="text-charcoal-500">
                    Même CITQ que : {matches.map((m, i) => (
                      <span key={m.id}>{i > 0 ? ", " : ""}<a href={`/dashboard/listings/${m.id}/edit`} className="hover:underline">{m.title}</a></span>
                    ))}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}

      <h2 className="mb-3 mt-10 text-heading-3 font-semibold text-charcoal-800">File d&apos;import</h2>
      <p className="mb-3 text-sm text-charcoal-500">
        {pending ?? 0} en attente · {imported ?? 0} importée{(imported ?? 0) > 1 ? "s" : ""} · {rejectedCount ?? 0} refusée{(rejectedCount ?? 0) > 1 ? "s" : ""} · {unpublished.count ?? 0} fiche{(unpublished.count ?? 0) > 1 ? "s" : ""} importée{(unpublished.count ?? 0) > 1 ? "s" : ""} pas encore publiée{(unpublished.count ?? 0) > 1 ? "s" : ""} (15 par jour)
      </p>
      {(rejected ?? []).length > 0 && (
        <div className="bg-white rounded-2xl border border-[#ebebeb] overflow-hidden divide-y divide-[#ebebeb]">
          {(rejected ?? []).map((r) => (
            <div key={r.import_source_url as string} className="px-6 py-3 text-sm">
              <p className="truncate text-charcoal-800">{r.import_source_url as string}</p>
              <p className="text-charcoal-500">{(r.error as string) ?? "—"}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
