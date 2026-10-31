"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DraftOwnerRow, DraftOwnerStatus, DraftReminderKind, SentInfo } from "@/lib/claims/draftTable";

// Table d'Admin → Brouillons : une carte par propriétaire. Rien ne part sans un clic ici, un courriel à la fois.

type Kind = "draft_invite" | DraftReminderKind;

const STATUS_LABEL: Record<DraftOwnerStatus, { label: string; tone: string }> = {
  pret: { label: "Prêt à envoyer", tone: "bg-success-50 text-success-700" },
  import: { label: "Import en cours", tone: "bg-warning-50 text-warning-700" },
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
  const [intro, setIntro] = useState(en ? row.introEn : row.introFr);
  const [site, setSite] = useState(row.siteUrl ?? "");
  const [name, setName] = useState(row.displayName);
  const [saved, setSaved] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [preview, setPreview] = useState<{ kind: Kind; subject: string; html: string } | null>(null);

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

  async function save(): Promise<boolean> {
    setBusy("save");
    setMessage(null);
    const { ok, data } = await call("PUT", { email: row.email, [en ? "intro_en" : "intro_fr"]: intro, site_url: site, display_name: name });
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
    const { ok, data } = await call("POST", { action: "preview", email: row.email, kind, intro, displayName: name });
    setBusy(null);
    if (!ok) return setMessage({ ok: false, text: String(data.error ?? "Aperçu impossible") });
    setPreview({ kind, subject: String(data.subject ?? ""), html: String(data.html ?? "") });
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
    router.refresh();
  }

  const history = [sentLine("Invitation envoyée", row.invite), sentLine("Relance J+3 envoyée", row.reminder3), sentLine("Relance J+10 envoyée", row.reminder10)].filter(Boolean);
  const dueLabel = row.due === "draft_reminder_3" ? "J+3" : "J+10";

  return (
    <li className={`rounded-2xl border bg-white p-5 ${row.due ? "border-accent/40" : "border-[#ebebeb]"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-base font-semibold text-charcoal-800">{row.email}</p>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.tone}`}>{status.label}</span>
        <span className="rounded-full bg-charcoal-100 px-2.5 py-0.5 text-xs font-medium text-charcoal-600">{en ? "Anglais" : "Français"}</span>
        {row.due && <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">Relance {dueLabel} due</span>}
      </div>

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
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_16rem]">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-charcoal-700">
              Première phrase du courriel ({en ? "anglais" : "français"}), selon son site web
            </span>
            <textarea
              value={intro}
              onChange={(e) => {
                setIntro(e.target.value);
                setSaved(false);
              }}
              rows={2}
              maxLength={600}
              placeholder={en ? "We came across your website and loved your cabins." : "Nous avons découvert votre site et adoré vos chalets."}
              className="w-full rounded-xl border border-[#ebebeb] px-3 py-2 text-sm text-charcoal-800 focus:border-primary focus:outline-none"
            />
          </label>
          <div className="space-y-3">
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
    </li>
  );
}

export default function DraftInvitationsClient({ rows }: { rows: DraftOwnerRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-[#ebebeb] bg-white p-8 text-center text-sm text-charcoal-400">
        Aucun propriétaire en brouillon pour l’instant.
      </div>
    );
  }
  return (
    <ul className="space-y-4">
      {rows.map((row) => (
        <OwnerCard key={row.email} row={row} />
      ))}
    </ul>
  );
}
