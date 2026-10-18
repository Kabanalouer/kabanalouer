"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Listes d'Admin → Invitations : aperçu du courriel (cadre isolé), « Envoyer » et « Tout envoyer ».
export type InvitationRow = { email: string; titles: string[]; lang: "fr" | "en"; invitedAt?: string };

type Kind = "invite" | "reminder";

const BUTTON = "rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" });
}

export default function InvitationsClient({ kind, rows }: { kind: Kind; rows: InvitationRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ email: string; subject: string; html: string } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  async function openPreview(email: string) {
    setPreviewError(null);
    setBusy(`preview:${email}`);
    try {
      const res = await fetch(`/api/admin/invitations/preview?kind=${kind}&email=${encodeURIComponent(email)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setPreviewError(data.error ?? "Aperçu impossible");
        return;
      }
      setPreview({ email, subject: decodeURIComponent(res.headers.get("X-Subject") ?? ""), html: await res.text() });
    } finally {
      setBusy(null);
    }
  }

  async function send(emails: string[] | null) {
    const label = emails ? `l'invitation à ${emails[0]}` : `${rows.length} courriel${rows.length > 1 ? "s" : ""} (jusqu'à 40 à la fois)`;
    const what = kind === "invite" ? "Envoyer" : "Envoyer la relance de";
    if (!window.confirm(`${what} ${label} ? Cette action envoie de vrais courriels.`)) return;
    setBusy(emails ? `send:${emails[0]}` : "all");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emails ? { kind, emails } : { kind, all: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error ?? "Erreur");
        return;
      }
      setMessage(
        `${data.sent} envoyé${data.sent > 1 ? "s" : ""}` +
          (data.skipped ? `, ${data.skipped} déjà envoyé${data.skipped > 1 ? "s" : ""}` : "") +
          (data.errors ? `, ${data.errors} échec${data.errors > 1 ? "s" : ""} (à réessayer)` : "") +
          (data.remaining ? ` — il en reste ${data.remaining}, cliquez de nouveau sur « Tout envoyer ».` : ".")
      );
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#ebebeb] p-8 text-center text-charcoal-400 text-sm">
        {kind === "invite" ? "Aucune fiche publiée en attente d'invitation." : "Aucune relance à envoyer pour l'instant."}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <button type="button" disabled={!!busy} onClick={() => send(null)} className={`${BUTTON} bg-primary text-white hover:bg-primary-dark`}>
          {busy === "all" ? "Envoi en cours…" : kind === "invite" ? "Tout envoyer" : "Tout relancer"}
        </button>
        {message && <p className="text-sm text-charcoal-600" role="status">{message}</p>}
      </div>

      <div className="bg-white rounded-2xl border border-[#ebebeb] overflow-hidden divide-y divide-[#ebebeb]">
        {rows.map((r) => (
          <div key={r.email} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-charcoal-800 truncate">{r.email}</p>
              <p className="text-sm text-charcoal-500 truncate">
                {r.titles.join(" · ")}
                {r.invitedAt ? ` — invité le ${formatDate(r.invitedAt)}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" disabled={!!busy} onClick={() => openPreview(r.email)} className={`${BUTTON} border border-charcoal-300 bg-white text-charcoal-800 hover:bg-charcoal-50`}>
                {busy === `preview:${r.email}` ? "Chargement…" : "Aperçu"}
              </button>
              <button type="button" disabled={!!busy} onClick={() => send([r.email])} className={`${BUTTON} border border-primary bg-white text-primary hover:bg-primary/5`}>
                {busy === `send:${r.email}` ? "Envoi…" : "Envoyer"}
              </button>
            </div>
          </div>
        ))}
      </div>
      {previewError && <p className="mt-3 text-sm text-error-600" role="alert">{previewError}</p>}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) setPreview(null); }}>
          <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl bg-white p-5">
            <p className="text-xs text-charcoal-400">À : {preview.email}</p>
            <p className="mb-3 text-sm font-semibold text-charcoal-800">Objet : {preview.subject}</p>
            <iframe title="Aperçu du courriel" sandbox="" srcDoc={preview.html} className="min-h-[60vh] w-full flex-1 rounded-xl border border-[#ebebeb]" />
            <p className="mt-2 text-xs text-charcoal-400">Les liens de cet aperçu sont des exemples ; le courriel envoyé contient les vrais liens personnels.</p>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setPreview(null)} className={`${BUTTON} border border-charcoal-300 bg-white text-charcoal-800 hover:bg-charcoal-50`}>Fermer</button>
              <button type="button" disabled={!!busy} onClick={() => { const e = preview.email; setPreview(null); void send([e]); }} className={`${BUTTON} bg-primary text-white hover:bg-primary-dark`}>Envoyer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
