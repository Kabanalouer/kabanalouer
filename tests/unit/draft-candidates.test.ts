// Essais unitaires du mode brouillon : qui reçoit l'invitation et les relances. Faux client en mémoire (aucune base).
// Lancer : npm run test:unit
import assert from "node:assert/strict";
import { test } from "node:test";

process.env.NEXT_PUBLIC_SITE_URL ??= "https://kabanalouer.ca";
process.env.RESEND_API_KEY ??= "re_test";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test";
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";

type Row = Record<string, unknown>;

function value(row: Row, col: string): unknown {
  if (col.includes("->>")) {
    const [a, b] = col.split("->>");
    return (row[a] as Row | null | undefined)?.[b] ?? null;
  }
  return row[col] ?? null;
}

// Imite la partie de PostgREST utilisée par lib/claims/invitations.ts
function fakeAdmin(tables: Record<string, Row[]>) {
  return {
    from(table: string) {
      let rows = [...(tables[table] ?? [])];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const q: any = {
        select: () => q,
        eq: (col: string, val: unknown) => ((rows = rows.filter((r) => value(r, col) === val)), q),
        is: (col: string, val: unknown) => ((rows = rows.filter((r) => value(r, col) === val)), q),
        not: (col: string, _op: string, val: unknown) => ((rows = rows.filter((r) => value(r, col) !== val)), q),
        lt: (col: string, val: number) => ((rows = rows.filter((r) => Number(value(r, col)) < val)), q),
        order: () => q,
        range: (from: number, to: number) => ((rows = rows.slice(from, to + 1)), q),
        then: (resolve: (v: { data: Row[]; error: null }) => unknown) => resolve({ data: rows, error: null }),
      };
      return q;
    },
  };
}

const DAY = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();
let n = 0;
const draft = (email: string, extra: Row = {}): Row => ({
  id: `id-${++n}`, title: `Chalet ${n}`, title_en: null, region: "Laurentides", city: "Mont-Tremblant",
  listing_number: 10000 + n, custom_slug: null, claim_email: email, claim_language: "fr",
  claim_status: "unclaimed", mode_publication: "brouillon", is_test: false, ...extra,
});

async function load() {
  return await import("@/lib/claims/invitations");
}

test("invitation brouillon : une adresse sans ligne en attente reçoit une invitation avec toutes ses fiches", async () => {
  const { listDraftCandidates } = await load();
  const admin = fakeAdmin({
    listings: [
      draft("a@exemple.test"), draft("a@exemple.test"),
      draft("b@exemple.test"), // ligne de la file en attente : exclue
      draft("c@exemple.test"), // déjà invitée : exclue
      draft("d@exemple.test"), // a retiré une fiche : exclue
      { ...draft("d@exemple.test"), claim_status: "removed" },
      { ...draft("e@exemple.test"), mode_publication: null }, // fiche normale : jamais une invitation brouillon
    ],
    listing_import_queue: [{ status: "pending", attempts: 0, payload: { courriel: "B@exemple.test", mode_publication: "brouillon" } }],
    listing_invitations: [{ claim_email: "c@exemple.test", kind: "draft_invite", sent_at: ago(1) }],
  });
  const out = await listDraftCandidates(admin, "draft_invite");
  assert.deepEqual(out.map((c) => c.claimEmail), ["a@exemple.test"]);
  assert.equal(out[0].listings.length, 2);
  assert.equal(out[0].claimed, false);
});

test("relances : fenêtre J+3 (3 à 10 jours) et J+10, jamais si une fiche est activée ou déjà relancée", async () => {
  const { listDraftCandidates } = await load();
  const tables = {
    listings: [
      draft("f@exemple.test"), draft("g@exemple.test"), draft("h@exemple.test"),
      { ...draft("h@exemple.test", { claim_status: "claimed", mode_publication: null }), import_raw_data: { active_le: "2026-11-01" } },
      draft("i@exemple.test"), draft("k@exemple.test"),
      draft("j@exemple.test", { claim_status: "claimed" }),
    ],
    listing_invitations: [
      { claim_email: "f@exemple.test", kind: "draft_invite", sent_at: ago(4) },
      { claim_email: "g@exemple.test", kind: "draft_invite", sent_at: ago(11) },
      { claim_email: "h@exemple.test", kind: "draft_invite", sent_at: ago(4) },
      { claim_email: "i@exemple.test", kind: "draft_invite", sent_at: ago(4) },
      { claim_email: "i@exemple.test", kind: "draft_reminder_3", sent_at: ago(1) },
      { claim_email: "j@exemple.test", kind: "draft_invite", sent_at: ago(5) },
      { claim_email: "k@exemple.test", kind: "draft_invite", sent_at: ago(1) },
    ],
    listing_import_queue: [],
  };
  const admin = fakeAdmin(tables);
  const r3 = await listDraftCandidates(admin, "draft_reminder_3");
  assert.deepEqual(r3.map((c) => c.claimEmail).sort(), ["f@exemple.test", "j@exemple.test"]);
  assert.equal(r3.find((c) => c.claimEmail === "j@exemple.test")?.claimed, true);
  assert.equal(r3.find((c) => c.claimEmail === "f@exemple.test")?.claimed, false);

  const r10 = await listDraftCandidates(admin, "draft_reminder_10");
  assert.deepEqual(r10.map((c) => c.claimEmail), ["g@exemple.test"]);
});

test("interrupteur fermé : aucune invitation brouillon ne part et la base n'est même pas touchée", async () => {
  const { sendDraftInvitation } = await load();
  const { DRAFT_INVITATIONS_ENABLED } = await import("@/lib/draftInvitationsConfig");
  assert.equal(DRAFT_INVITATIONS_ENABLED, false);
  const boom = { from: () => { throw new Error("la base ne doit pas être appelée"); } };
  const candidate = { claimEmail: "a@exemple.test", lang: "fr" as const, listings: [], claimed: false };
  for (const kind of ["draft_invite", "draft_reminder_3", "draft_reminder_10"] as const) {
    assert.equal(await sendDraftInvitation(boom, candidate, kind), "skipped");
  }
});

test("mode_publication : seule la valeur « brouillon » est acceptée", async () => {
  const { readModePublication } = await import("@/lib/importQueue");
  assert.deepEqual(readModePublication({}), { ok: true, mode: null });
  assert.deepEqual(readModePublication({ mode_publication: "" }), { ok: true, mode: null });
  assert.deepEqual(readModePublication({ mode_publication: " Brouillon " }), { ok: true, mode: "brouillon" });
  const bad = readModePublication({ mode_publication: "brouilon" });
  assert.equal(bad.ok, false);
});
