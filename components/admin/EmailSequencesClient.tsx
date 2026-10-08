"use client";

import { useEffect, useState } from "react";
import EmailTemplateEditor from "@/components/admin/EmailTemplateEditor";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  EMAIL_CATALOG,
  type CatalogEmail,
  type EmailCategory,
} from "@/lib/adminEmailCatalog";

type Status = { state: "sending" } | { state: "sent"; to: string } | { state: "error"; message: string };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function EmailSequencesClient() {
  const [to, setTo] = useState("info@chaletauthentik.com");
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [runningCategory, setRunningCategory] = useState<EmailCategory | null>(null);
  // Courriels dont le texte est modifiable, et langues déjà modifiées (email_templates).
  const [editable, setEditable] = useState<Set<string>>(new Set());
  const [customized, setCustomized] = useState<Record<string, ("fr" | "en")[]>>({});
  const [editing, setEditing] = useState<CatalogEmail | null>(null);

  useEffect(() => {
    fetch("/api/admin/email-templates")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { editable: string[]; customized: Record<string, ("fr" | "en")[]> } | null) => {
        if (!json) return;
        setEditable(new Set(json.editable));
        setCustomized(json.customized);
      })
      .catch(() => {});
  }, []);

  async function sendOne(email: CatalogEmail) {
    setStatuses((s) => ({ ...s, [email.id]: { state: "sending" } }));
    try {
      const res = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: email.id, to, lang }),
      });
      const data = (await res.json().catch(() => ({}))) as { to?: string; error?: string };
      setStatuses((s) => ({
        ...s,
        [email.id]: res.ok
          ? { state: "sent", to: data.to ?? to }
          : { state: "error", message: data.error ?? `Erreur ${res.status}` },
      }));
    } catch {
      setStatuses((s) => ({ ...s, [email.id]: { state: "error", message: "Erreur réseau" } }));
    }
  }

  async function sendCategory(category: EmailCategory) {
    setRunningCategory(category);
    const emails = EMAIL_CATALOG.filter((e) => e.category === category && e.testable);
    for (const email of emails) {
      await sendOne(email);
      await wait(1200); // garde l'ordre dans la boîte de réception, sous la limite d'envoi Resend
    }
    setRunningCategory(null);
  }

  return (
    <div className="mt-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 rounded-2xl border border-[#ebebeb] bg-white p-4 sm:p-5">
        <label className="flex-1">
          <span className="block text-sm font-medium text-charcoal-700 mb-1">Envoyer les tests à</span>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full rounded-xl border border-[#ebebeb] px-4 py-2.5 text-base text-charcoal-800 focus:outline-none focus:border-primary"
          />
        </label>
        <div>
          <span className="block text-sm font-medium text-charcoal-700 mb-1">Langue</span>
          <div className="inline-flex rounded-full border border-[#ebebeb] p-1">
            {(["fr", "en"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  lang === l ? "bg-primary text-white" : "text-charcoal-600 hover:text-charcoal-800"
                }`}
              >
                {l === "fr" ? "Français" : "English"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {CATEGORY_ORDER.map((category) => {
        const emails = EMAIL_CATALOG.filter((e) => e.category === category);
        const label = CATEGORY_LABELS[category];
        const hasTestable = emails.some((e) => e.testable);
        const running = runningCategory === category;
        return (
          <section key={category}>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-3">
              <div>
                <h2 className="text-heading-2 font-semibold text-charcoal-800">
                  {label.title} <span className="text-charcoal-400 font-normal">({emails.length})</span>
                </h2>
                <p className="text-sm text-charcoal-500 mt-1">{label.description}</p>
              </div>
              {hasTestable && (
                <button
                  type="button"
                  onClick={() => sendCategory(category)}
                  disabled={runningCategory !== null}
                  className="self-start sm:self-auto shrink-0 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:bg-charcoal-200 disabled:text-charcoal-400 transition-colors"
                >
                  {running ? "Envoi en cours…" : "Envoyer toute la séquence"}
                </button>
              )}
            </div>

            <ol className="divide-y divide-[#ebebeb] rounded-2xl border border-[#ebebeb] bg-white">
              {emails.map((email, i) => {
                const status = statuses[email.id];
                return (
                  <li key={email.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
                    <span className="hidden sm:flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-charcoal-100 text-xs font-bold text-charcoal-600">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-medium text-charcoal-800">{email.name}</p>
                      <p className="text-sm text-charcoal-500">{email.trigger}</p>
                      {customized[email.id]?.length ? (
                        <p className="text-xs font-medium text-primary mt-1">
                          Texte modifié ({customized[email.id].map((l) => (l === "fr" ? "français" : "anglais")).join(" et ")})
                        </p>
                      ) : null}
                      {email.fixedRecipient && (
                        <p className="text-xs text-charcoal-400 mt-1">Toujours envoyé à {email.fixedRecipient}</p>
                      )}
                      {status?.state === "sent" && (
                        <p className="text-sm text-success-600 mt-1">Envoyé à {status.to}</p>
                      )}
                      {status?.state === "error" && (
                        <p className="text-sm text-error-600 mt-1">{status.message}</p>
                      )}
                    </div>
                    {editable.has(email.id) && (
                      <button
                        type="button"
                        onClick={() => setEditing(email)}
                        className="self-start sm:self-auto shrink-0 rounded-full border border-primary/40 bg-white px-4 py-2 text-sm font-medium text-primary hover:bg-[#f5f6ec] transition-colors"
                      >
                        Modifier le texte
                      </button>
                    )}
                    {email.testable ? (
                      <button
                        type="button"
                        onClick={() => sendOne(email)}
                        disabled={status?.state === "sending" || runningCategory !== null}
                        className="self-start sm:self-auto shrink-0 rounded-full border border-[#ebebeb] bg-white px-4 py-2 text-sm font-medium text-charcoal-700 hover:border-charcoal-400 disabled:text-charcoal-400 transition-colors"
                      >
                        {status?.state === "sending" ? "Envoi…" : "Envoyer un test"}
                      </button>
                    ) : (
                      <span className="self-start sm:self-auto shrink-0 text-xs text-charcoal-400">Test par le vrai parcours</span>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}

      {editing && (
        <EmailTemplateEditor
          emailId={editing.id}
          emailName={editing.name}
          initialLang={lang}
          onClose={() => setEditing(null)}
          onChanged={(langs) => setCustomized((c) => ({ ...c, [editing.id]: langs }))}
        />
      )}
    </div>
  );
}
