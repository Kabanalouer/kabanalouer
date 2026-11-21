"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { DraftOwnerRow, DraftOwnerStatus, DraftReminderKind, SentInfo } from "@/lib/claims/draftTable";
import { DRAFT_TABS, DRAFT_TAB_INFO, draftTab, parseDraftTab, type DraftTab } from "@/lib/claims/draftTabs";

// Table d'Admin → Brouillons : une carte par propriétaire. Rien ne part sans un clic ici, un courriel à la fois.

type Kind = "draft_invite" | DraftReminderKind;

const STATUS_LABEL: Record<DraftOwnerStatus, { label: string; tone: string }> = {
  pret: { label: "Prêt à envoyer", tone: "bg-success-50 text-success-700" },
  import: { label: "Import en cours", tone: "bg-warning-50 text-warning-700" },
  sans_fiche: { label: "Aucune fiche créée (import refusé, retiré ou en échec)", tone: "bg-error-50 text-error-600" },
  invite: { label: "Invitation envoyée", tone: "bg-primary/10 text-primary" },
  revendique: { label: "Revendiquée, pas encore activée", tone: "bg-warning-50 text-warning-700" },
  actif: { label: "Activée", tone: "bg-success-50 text-success-700" },
  retire: { label: "Retirée par le propriétaire", tone: "bg-charcoal-100 text-charcoal-600" },
};

const KIND_LABEL: Record<Kind, string> = {
  draft_invite: "l’invitation",
  draft_reminder_3: "la relance J+3",
  draft_reminder_10: "la relance J+10",
};

const fmt = (iso: string) => new Date(iso).toLocaleDateString("fr-CA", { month: "short", day: "numeric" });

function sentLine(label: string, s: SentInfo | null): string | null {
  if (!s) return null;
  return `${label} le ${fmt(s.sentAt)}${s.openedAt ? `, ouverte le ${fmt(s.openedAt)}` : ", pas ouverte"}${s.claimedAt ? `, revendiquée le ${fmt(s.claimedAt)}` : ""}`;
}

function OwnerCard({ row }: { row: DraftOwnerRow }) {
  const router = useRouter();
  const en = row.lang === "en";
  const [site, setSite] = useState(row.siteUrl ?? "");
  const [name, setName] = useState(row.displayName);
  const [subject, setSubject] = useState(row.customSubject);
  const [greeting, setGreeting] = useState(row.customGreeting);
  const [heading, setHeading] = useState(row.customHeading);
  const [text, setText] = useState(row.customBody);
  const [base, setBase] = useState<{ subject: string; greeting: string; heading: string; body: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [preview, setPreview] = useState<{ kind: Kind; subject: string; html: string } | null>(null);
  // Une fois l'invitation envoyée (ou le propriétaire retiré), la carte est pliée : seul le statut reste visible. Une relance due la garde ouverte.
  const [open, setOpen] = useState(() => !(row.invite || row.status === "retire") || !!row.due);

  const status = STATUS_LABEL[row.status];
  const incomplete = row.listings.some((l) => l.issues.length > 0 && l.state === "brouillon");

  async function call(method: "POST" | "PUT", body: Record<string, unknown>): Promise<{ ok: boolean; data: Record<string, unknown> }> {
    try {
      const res = await fetch("/api/admin/draft-invitations", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      return { ok: res.ok, data };
    } catch {
      return { ok: false, data: { error: "Erreur réseau" } };
    }
  }

  // Texte inchangé par rapport au modèle = rien d'enregistré : le modèle reste la référence
  const sameAsBase = base !== null && subject === base.subject && greeting === base.greeting && heading === base.heading && text === base.body;
  const customCleared = subject.trim() === "" && greeting.trim() === "" && heading.trim() === "" && text.trim() === "";
  const customPayload =
    sameAsBase || customCleared
      ? { custom_subject: null, custom_greeting: null, custom_heading: null, custom_body: null }
      : { custom_subject: subject, custom_greeting: greeting, custom_heading: heading, custom_body: text };

  async function save(): Promise<boolean> {
    setBusy("save");
    setMessage(null);
    const { ok, data } = await call("PUT", { email: row.email, site_url: site, display_name: name, ...(editing || row.customBody || row.customHeading ? customPayload : {}) });
    setBusy(null);
    if (!ok) {
      setMessage({ ok: false, text: String(data.error ?? "Enregistrement impossible") });
      return false;
    }
    setSaved(true);
    setMessage({ ok: true, text: "Enregistré." });
    router.refresh();
    return true;
  }

  async function showPreview(kind: Kind) {
    setBusy(`preview-${kind}`);
    setMessage(null);
    const custom = kind === "draft_invite" && !sameAsBase && !customCleared ? { customSubject: subject, customGreeting: greeting, customHeading: heading, customBody: text } : {};
    const { ok, data } = await call("POST", { action: "preview", email: row.email, kind, displayName: name, ...custom });
    setBusy(null);
    if (!ok) return setMessage({ ok: false, text: String(data.error ?? "Aperçu impossible") });
    setPreview({ kind, subject: String(data.subject ?? ""), html: String(data.html ?? "") });
  }

  async function openTextEditor() {
    if (editing) return setEditing(false);
    setMessage(null);
    setBusy("base");
    const { ok, data } = await call("POST", { action: "base", email: row.email, kind: "draft_invite" });
    setBusy(null);
    if (!ok) return setMessage({ ok: false, text: String(data.error ?? "Texte du modèle introuvable") });
    const b = { subject: String(data.subject ?? ""), greeting: String(data.greeting ?? ""), heading: String(data.heading ?? ""), body: String(data.body ?? "") };
    setBase(b);
    if (!subject.trim() && !greeting.trim() && !heading.trim() && !text.trim()) {
      setSubject(b.subject);
      setGreeting(b.greeting);
      setHeading(b.heading);
      setText(b.body);
    }
    setEditing(true);
  }

  async function backToModel() {
    if (!window.confirm("Revenir au texte du modèle ? Le texte écrit pour ce propriétaire sera effacé.")) return;
    setBusy("save");
    setMessage(null);
    const { ok, data } = await call("PUT", { email: row.email, custom_subject: null, custom_greeting: null, custom_heading: null, custom_body: null });
    setBusy(null);
    if (!ok) return setMessage({ ok: false, text: String(data.error ?? "Enregistrement impossible") });
    setSubject("");
    setGreeting("");
    setHeading("");
    setText("");
    setEditing(false);
    setMessage({ ok: true, text: "Texte du modèle rétabli." });
    router.refresh();
  }

  async function send(kind: Kind) {
    if (!saved && !(await save())) return;
    if (!window.confirm(`Envoyer ${KIND_LABEL[kind]} à ${row.email} ?\n\nLe courriel part tout de suite, depuis info@kabanalouer.ca.`)) return;
    setBusy(`send-${kind}`);
    setMessage(null);
    const res = await call("POST", { action: "send", email: row.email, kind });
    setBusy(null);
    if (!res.ok) return setMessage({ ok: false, text: String(res.data.error ?? "Échec de l’envoi") });
    setMessage({ ok: true, text: "Envoyé." });
    setPreview(null);
    setOpen(false);
    router.refresh();
  }

  const history = [sentLine("Invitation envoyée", row.invite), sentLine("Relance J+3 envoyée", row.reminder3), sentLine("Relance J+10 envoyée", row.reminder10)].filter(Boolean);
  const dueLabel = row.due === "draft_reminder_3" ? "J+3" : "J+10";
  // Fiches activées ou propriétaire retiré : plus aucune relance possible, on n'affiche pas de relances « à venir »
  const finished = row.status === "actif" || row.status === "retire";
  const chips = [
    { label: "Invitation", sent: row.invite, due: false },
    { label: "Relance J+3", sent: row.reminder3, due: row.due === "draft_reminder_3" },
    { label: "Relance J+10", sent: row.reminder10, due: row.due === "draft_reminder_10" },
  ].filter((c) => (finished ? c.sent : true));

  return (
    <li className={`rounded-2xl border bg-white p-5 ${row.due ? "border-accent/40" : "border-[#ebebeb]"}`}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-start justify-between gap-3 text-left">
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold text-charcoal-800">{row.displayName || row.email}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.tone}`}>{status.label}</span>
            <span className="rounded-full bg-charcoal-100 px-2.5 py-0.5 text-xs font-medium text-charcoal-600">{en ? "Anglais" : "Français"}</span>
            {row.due && <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">Relance {dueLabel} due</span>}
          </span>
          {(row.displayName || !open) && (
            <span className="mt-1 block truncate text-sm font-normal text-charcoal-500">
              {row.displayName ? row.email : ""}
              {row.displayName && !open ? " · " : ""}
              {!open ? `${row.listings.length} chalet${row.listings.length > 1 ? "s" : ""}` : ""}
            </span>
          )}
          {!open && (
            <>
              <span className="mt-1.5 flex flex-wrap gap-1.5">
                {finished && (
                  <span className="rounded-full bg-charcoal-100 px-2.5 py-0.5 text-xs font-medium text-charcoal-500">
                    Relances : aucune prévue ({row.status === "actif" ? "fiches activées" : "propriétaire retiré"})
                  </span>
                )}
                {chips.map(({ label, sent, due }) => (
                  <span
                    key={label}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${sent ? (sent.openedAt ? "bg-success-50 text-success-700" : "bg-warning-50 text-warning-700") : due ? "bg-accent/10 text-accent" : "bg-charcoal-100 text-charcoal-500"}`}
                  >
                    {label} : {sent ? `envoyée le ${fmt(sent.sentAt)}, ${sent.openedAt ? `ouverte le ${fmt(sent.openedAt)}` : "pas ouverte"}` : due ? "à envoyer" : "pas envoyée"}
                  </span>
                ))}
              </span>
            </>
          )}
        </span>
        <span className="mt-0.5 flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
          {open ? "Replier" : "Déplier"}
          <svg className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </span>
      </button>

      {open && (
        <>
        <ul className="mt-3 divide-y divide-[#ebebeb] rounded-xl border border-[#ebebeb]">
          {row.listings.length === 0 && <li className="p-3 text-sm text-charcoal-500">Aucune fiche importée pour l’instant.</li>}
          {row.listings.map((l) => (
            <li key={l.id} className="flex items-center gap-3 p-3">
              <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-charcoal-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {l.photoUrl && <img src={l.photoUrl} alt="" className="h-full w-full object-cover" loading="lazy" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-charcoal-800">{l.title}</p>
                <p className="truncate text-xs text-charcoal-500">
                  {[l.city, l.region].filter(Boolean).join(", ") || "Lieu inconnu"} · {l.photoCount} photo{l.photoCount > 1 ? "s" : ""}
                  {l.state !== "brouillon" ? ` · ${l.state === "en_ligne" ? "en ligne" : "revendiquée"}` : ""}
                </p>
                {l.issues.length > 0 && <p className="text-xs font-medium text-warning-700">À compléter avant la mise en ligne automatique : {l.issues.join(", ")}</p>}
              </div>
              {l.state === "brouillon" && (
                <a href={`/apercu/admin/${l.id}`} target="_blank" rel="noopener noreferrer" className="shrink-0 text-sm font-medium text-primary hover:underline">
                  Voir la fiche
                </a>
              )}
            </li>
          ))}
        </ul>

        {row.pendingImports > 0 && (
          <p className="mt-2 text-sm text-warning-700">
            {row.pendingImports} fiche{row.pendingImports > 1 ? "s" : ""} encore en cours d’import (une toutes les 5 minutes). L’invitation sera possible quand tout sera importé.
          </p>
        )}
        {row.stuckImports > 0 && (
          <p className="mt-2 text-sm font-medium text-error-600">
            {row.stuckImports} fiche{row.stuckImports > 1 ? "s" : ""} n’a pas pu être importée{row.stuckImports > 1 ? "s" : ""} après plusieurs essais (voir Admin, Invitations, file d’import, pour l’erreur).
          </p>
        )}
        {row.rejectedImports > 0 && (
          <p className="mt-2 text-sm text-charcoal-500">
            {row.rejectedImports} ligne{row.rejectedImports > 1 ? "s" : ""} de la file d’import refusée{row.rejectedImports > 1 ? "s" : ""} ou en pause, non comptée{row.rejectedImports > 1 ? "s" : ""} dans les fiches ci-dessus (détail dans Admin, Invitations, file d’import).
          </p>
        )}
        {incomplete && row.status !== "actif" && (
          <p className="mt-2 text-sm text-charcoal-500">
            Une fiche à compléter reste en brouillon après la revendication : le propriétaire la complète puis l’active dans Mes chalets.
          </p>
        )}

        {row.status !== "retire" && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="contents">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-charcoal-700">Nom du chalet ou du site (objet et titre)</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setSaved(false);
                  }}
                  maxLength={120}
                  placeholder={row.listings.length > 1 ? "Chalets Exemple" : row.listings[0]?.title ?? "Nom du chalet"}
                  className="w-full rounded-xl border border-[#ebebeb] px-3 py-2 text-sm text-charcoal-800 focus:border-primary focus:outline-none"
                />
                <span className="mt-1 block text-xs text-charcoal-400">Vide : le titre du chalet (ou « Titre et N autres chalets »).</span>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-charcoal-700">Site du propriétaire</span>
                <input
                  type="text"
                  value={site}
                  onChange={(e) => {
                    setSite(e.target.value);
                    setSaved(false);
                  }}
                  placeholder="exemple.ca"
                  className="w-full rounded-xl border border-[#ebebeb] px-3 py-2 text-sm text-charcoal-800 focus:border-primary focus:outline-none"
                />
                {row.siteUrl && (
                  <a href={row.siteUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block truncate text-xs text-primary hover:underline">
                    Ouvrir le site
                  </a>
                )}
              </label>
            </div>
          </div>
        )}

        {row.status !== "retire" && !row.invite && row.listings.some((l) => l.state === "brouillon") && (
          <div className="mt-4">
            <button type="button" onClick={openTextEditor} disabled={busy !== null} className="text-sm font-medium text-primary hover:underline disabled:text-charcoal-400">
              {editing ? "Fermer le texte du courriel" : row.customBody || row.customHeading ? "Modifier le texte de ce courriel (texte personnalisé)" : "Modifier le texte de ce courriel"}
            </button>
            {editing && (
              <div className="mt-2 space-y-3 rounded-xl border border-[#ebebeb] bg-charcoal-50 p-3">
                <p className="text-xs text-charcoal-500">
                  Ce texte ne sert que pour ce propriétaire : le modèle d’Admin → Séquences courriel n’est pas modifié. Gardez les mots entre accolades ({"{nom}"}, {"{fiches}"}, {"{nombre}"}, {"{offre}"}) : ils sont remplacés à l’envoi. Gras : **comme ceci**. Une ligne vide sépare deux paragraphes.
                </p>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-charcoal-700">Objet</span>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => {
                      setSubject(e.target.value);
                      setSaved(false);
                    }}
                    maxLength={200}
                    className="w-full rounded-xl border border-[#ebebeb] bg-white px-3 py-2 text-sm text-charcoal-800 focus:border-primary focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-charcoal-700">Salutation (le « Bonjour, » du début)</span>
                  <input
                    type="text"
                    value={greeting}
                    onChange={(e) => {
                      setGreeting(e.target.value);
                      setSaved(false);
                    }}
                    maxLength={200}
                    className="w-full rounded-xl border border-[#ebebeb] bg-white px-3 py-2 text-sm text-charcoal-800 focus:border-primary focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-charcoal-700">Titre du courriel (le grand titre, sous le logo)</span>
                  <input
                    type="text"
                    value={heading}
                    onChange={(e) => {
                      setHeading(e.target.value);
                      setSaved(false);
                    }}
                    maxLength={200}
                    className="w-full rounded-xl border border-[#ebebeb] bg-white px-3 py-2 text-sm text-charcoal-800 focus:border-primary focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-charcoal-700">Texte</span>
                  <textarea
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      setSaved(false);
                    }}
                    maxLength={5000}
                    rows={14}
                    className="w-full rounded-xl border border-[#ebebeb] bg-white px-3 py-2 text-sm text-charcoal-800 focus:border-primary focus:outline-none"
                  />
                </label>
                <p className="text-xs text-charcoal-400">Le bouton et le lien « Retirer » viennent du modèle. Cliquez sur « Enregistrer » plus bas, puis « Voir le courriel d’invitation ».</p>
                <button type="button" onClick={backToModel} disabled={busy !== null} className="text-sm font-medium text-charcoal-600 hover:underline disabled:text-charcoal-400">
                  Revenir au texte du modèle
                </button>
              </div>
            )}
          </div>
        )}

        {history.length > 0 && (
          <ul className="mt-3 space-y-0.5 text-sm text-charcoal-500">
            {history.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {row.status !== "retire" && (
            <button
              type="button"
              onClick={save}
              disabled={saved || busy !== null}
              className="rounded-full border border-[#ebebeb] bg-white px-4 py-2 text-sm font-medium text-charcoal-700 hover:border-charcoal-400 disabled:text-charcoal-400 transition-colors"
            >
              {busy === "save" ? "Enregistrement…" : "Enregistrer"}
            </button>
          )}
          {row.listings.some((l) => l.state === "brouillon") && (
            <button
              type="button"
              onClick={() => showPreview("draft_invite")}
              disabled={busy !== null}
              className="rounded-full border border-primary/40 bg-white px-4 py-2 text-sm font-medium text-primary hover:bg-[#f5f6ec] disabled:text-charcoal-400 transition-colors"
            >
              {busy === "preview-draft_invite" ? "Chargement…" : "Voir le courriel d’invitation"}
            </button>
          )}
          {row.status === "pret" && (
            <button
              type="button"
              onClick={() => send("draft_invite")}
              disabled={busy !== null}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-600 disabled:bg-charcoal-200 disabled:text-charcoal-400 transition-colors"
            >
              {busy === "send-draft_invite" ? "Envoi…" : "Envoyer l’invitation"}
            </button>
          )}
          {row.due && (
            <>
              <button
                type="button"
                onClick={() => showPreview(row.due as Kind)}
                disabled={busy !== null}
                className="rounded-full border border-primary/40 bg-white px-4 py-2 text-sm font-medium text-primary hover:bg-[#f5f6ec] disabled:text-charcoal-400 transition-colors"
              >
                Voir le courriel de relance
              </button>
              <button
                type="button"
                onClick={() => send(row.due as Kind)}
                disabled={busy !== null}
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-600 disabled:bg-charcoal-200 disabled:text-charcoal-400 transition-colors"
              >
                {busy === `send-${row.due}` ? "Envoi…" : `Envoyer la relance ${dueLabel}`}
              </button>
            </>
          )}
        </div>

        {message && <p className={`mt-2 text-sm ${message.ok ? "text-success-600" : "text-error-600"}`}>{message.text}</p>}

        {preview && (
          <div className="mt-4 rounded-xl border border-[#ebebeb] bg-charcoal-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-charcoal-700">
                <span className="text-charcoal-400">Objet </span>
                <span className="font-medium">{preview.subject}</span>
              </p>
              <button type="button" onClick={() => setPreview(null)} className="text-sm text-charcoal-500 hover:text-charcoal-800">
                Fermer
              </button>
            </div>
            <p className="mt-1 text-xs text-charcoal-400">Aperçu avec des liens d’exemple : les vrais liens sont créés à l’envoi.</p>
            <iframe title="Aperçu du courriel" sandbox="" srcDoc={preview.html} className="mt-2 h-[560px] w-full rounded-lg border border-[#ebebeb] bg-white" />
          </div>
        )}
        </>
      )}
    </li>
  );
}

export default function DraftInvitationsClient({ rows, initialTab }: { rows: DraftOwnerRow[]; initialTab: string | null }) {
  const byTab = useMemo(() => {
    const map = new Map<DraftTab, DraftOwnerRow[]>(DRAFT_TABS.map((t) => [t, []]));
    for (const r of rows) map.get(draftTab(r))?.push(r);
    return map;
  }, [rows]);
  const count = (t: DraftTab) => byTab.get(t)?.length ?? 0;

  // Onglet de départ : celui de l'adresse, sinon le premier où il y a quelque chose à faire
  const [tab, setTab] = useState<DraftTab>(() => parseDraftTab(initialTab) ?? DRAFT_TABS.find((t) => (t === "invitations" || t === "relances") && count(t) > 0) ?? "ouverts");
  const [search, setSearch] = useState("");
  const router = useRouter();
  const [bulk, setBulk] = useState<{ running: boolean; done: number; total: number; sent: number; skipped: number; failed: string[]; stopped: boolean } | null>(null);
  const stopRef = useRef(false);

  // « Tout envoyer » : rejoue l'envoi d'une carte, un propriétaire à la fois, avec les mêmes contrôles côté serveur
  // (prêt, relance due, pas déjà envoyé). Les textes non enregistrés d'une carte ne sont pas envoyés.
  async function sendAll(targets: DraftOwnerRow[]) {
    const kindOf = (r: DraftOwnerRow): Kind | null => (tab === "invitations" ? "draft_invite" : r.due);
    const what = tab === "invitations" ? "l’invitation" : "la relance";
    if (
      !window.confirm(
        `Envoyer ${what} à ${targets.length} propriétaire${targets.length > 1 ? "s" : ""} ?\n\nLes courriels partent tout de suite, un à la fois, depuis info@kabanalouer.ca. Le texte enregistré de chaque propriétaire est utilisé (un texte modifié dans une carte mais pas enregistré n’est pas envoyé). Vous pouvez arrêter en cours de route.`
      )
    )
      return;
    stopRef.current = false;
    const state = { running: true, done: 0, total: targets.length, sent: 0, skipped: 0, failed: [] as string[], stopped: false };
    setBulk({ ...state });
    for (const row of targets) {
      if (stopRef.current) {
        state.stopped = true;
        break;
      }
      const kind = kindOf(row);
      if (!kind) {
        state.skipped += 1;
      } else {
        try {
          const res = await fetch("/api/admin/draft-invitations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "send", email: row.email, kind }) });
          if (res.ok) state.sent += 1;
          else if (res.status === 409) state.skipped += 1; // déjà envoyé ou plus à envoyer : rien n'est parti
          else state.failed.push(row.displayName || row.email);
        } catch {
          state.failed.push(row.displayName || row.email);
        }
      }
      state.done += 1;
      setBulk({ ...state, failed: [...state.failed] });
      await new Promise((r) => setTimeout(r, 700));
    }
    setBulk({ ...state, running: false, failed: [...state.failed] });
    router.refresh();
  }

  function chooseTab(t: DraftTab) {
    setTab(t);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("onglet", t);
      window.history.replaceState(null, "", url);
    } catch {
      // L'adresse n'est qu'un confort (retrouver l'onglet après un rechargement)
    }
  }

  const q = search.trim().toLowerCase();
  const matches = (r: DraftOwnerRow) => r.email.toLowerCase().includes(q) || r.displayName.toLowerCase().includes(q) || r.listings.some((l) => l.title.toLowerCase().includes(q));
  const list = (byTab.get(tab) ?? []).filter((r) => !q || matches(r));
  // Une recherche regarde tous les onglets : on montre où se trouvent les autres résultats
  const elsewhere = q ? DRAFT_TABS.filter((t) => t !== tab && (byTab.get(t) ?? []).some(matches)) : [];
  const info = DRAFT_TAB_INFO[tab];

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-[#ebebeb] bg-white p-8 text-center text-sm text-charcoal-400">
        Aucun propriétaire en brouillon pour l’instant.
      </div>
    );
  }

  return (
    <div>
      <div role="tablist" aria-label="Brouillons" className="mb-4 flex flex-wrap gap-2">
        {DRAFT_TABS.map((t) => {
          const n = count(t);
          const active = tab === t;
          // « À envoyer » en accent quand il y a du travail : seules ces deux pastilles demandent un geste de Simon
          const todo = (t === "invitations" || t === "relances") && n > 0;
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => chooseTab(t)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                active ? "border-charcoal-800 bg-charcoal-800 text-white" : "border-[#ebebeb] bg-white text-charcoal-700 hover:border-charcoal-300"
              }`}
            >
              {DRAFT_TAB_INFO[t].label}{" "}
              <span
                className={
                  active ? "text-white/70" : todo ? "rounded-full bg-accent px-1.5 py-0.5 text-xs font-semibold text-white" : "text-charcoal-400"
                }
              >
                {n}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, courriel ou chalet…"
            aria-label="Rechercher un propriétaire"
            className="rounded-full border border-[#ebebeb] bg-white py-1.5 pl-9 pr-4 text-base text-charcoal-700 placeholder-charcoal-300 hover:border-charcoal-300 focus:border-primary focus:outline-none"
          />
        </div>
        <span className="text-xs text-charcoal-400">
          {list.length} propriétaire{list.length > 1 ? "s" : ""}
        </span>
        {(tab === "invitations" || tab === "relances") && list.length > 0 && !bulk?.running && (
          <button
            type="button"
            onClick={() => sendAll(list)}
            className="ml-auto rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
          >
            Tout envoyer ({list.length})
          </button>
        )}
      </div>

      {bulk && (
        <div className="mb-4 rounded-xl border border-[#ebebeb] bg-charcoal-50 p-3 text-sm text-charcoal-700" role="status">
          {bulk.running ? (
            <div className="flex items-center justify-between gap-3">
              <span>
                Envoi en cours : {bulk.done} sur {bulk.total}. Ne fermez pas la page.
              </span>
              <button type="button" onClick={() => (stopRef.current = true)} className="font-medium text-primary hover:underline">
                Arrêter
              </button>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <span>
                {bulk.stopped ? "Arrêté : " : "Terminé : "}
                {bulk.sent} envoyé{bulk.sent > 1 ? "s" : ""}
                {bulk.skipped > 0 ? `, ${bulk.skipped} ignoré${bulk.skipped > 1 ? "s" : ""} (déjà envoyé ou plus à envoyer)` : ""}
                {bulk.failed.length > 0 ? `, ${bulk.failed.length} en échec, rien n’est parti pour : ${bulk.failed.join(", ")}` : ""}.
              </span>
              <button type="button" onClick={() => setBulk(null)} className="shrink-0 text-charcoal-500 hover:text-charcoal-800">
                Fermer
              </button>
            </div>
          )}
        </div>
      )}

      <p className="mb-4 text-sm text-charcoal-500">{info.hint}</p>

      {elsewhere.length > 0 && (
        <p className="mb-4 text-sm text-charcoal-500">
          Aussi trouvé dans :{" "}
          {elsewhere.map((t, i) => (
            <span key={t}>
              {i > 0 && ", "}
              <button type="button" onClick={() => chooseTab(t)} className="font-medium text-primary hover:underline">
                {DRAFT_TAB_INFO[t].label}
              </button>
            </span>
          ))}
        </p>
      )}

      {list.length === 0 ? (
        <div className="rounded-2xl border border-[#ebebeb] bg-white p-8 text-center text-sm text-charcoal-400">{q ? "Aucun résultat dans cet onglet." : info.empty}</div>
      ) : (
        <ul className="space-y-4">
          {list.map((row) => (
            <OwnerCard key={row.email} row={row} />
          ))}
        </ul>
      )}
    </div>
  );
}
