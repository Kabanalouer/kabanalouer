"use client";

import { useEffect, useState } from "react";
import EmailTemplateEditor from "@/components/admin/EmailTemplateEditor";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  EMAIL_CATALOG,
  MECHANISM_LABELS,
  type CatalogEmail,
  type EmailCategory,
} from "@/lib/adminEmailCatalog";

type Status = { state: "sending" } | { state: "sent"; to: string } | { state: "error"; message: string };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Filter = "all" | "active" | "paused";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "active", label: "Actifs" },
  { value: "paused", label: "En pause" },
];

function timingLabel(email: CatalogEmail): string {
  const base = MECHANISM_LABELS[email.mechanism];
  return (email.mechanism === "daily" || email.mechanism === "weekly") && email.dailyAt ? `${base}, vers ${email.dailyAt}` : base;
}

// Objet tel qu'écrit dans le gabarit : les repères {prenom}… sont remplis à l'envoi.
function SubjectText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\{[a-zA-Z][a-zA-Z0-9]*\})/).map((part, i) =>
        /^\{[a-zA-Z][a-zA-Z0-9]*\}$/.test(part) ? (
          <span key={i} className="rounded bg-charcoal-100 px-1 text-charcoal-600">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function StatusPill({ paused }: { paused?: boolean }) {
  return paused ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-50 px-2.5 py-0.5 text-xs font-semibold text-warning-700">
      <span className="h-1.5 w-1.5 rounded-full bg-warning-600" aria-hidden="true" />
      En pause
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-success-50 px-2.5 py-0.5 text-xs font-semibold text-success-700">
      <span className="h-1.5 w-1.5 rounded-full bg-success-600" aria-hidden="true" />
      Actif
    </span>
  );
}

export default function EmailSequencesClient() {
  const [to, setTo] = useState("info@chaletauthentik.com");
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [runningCategory, setRunningCategory] = useState<EmailCategory | null>(null);
  // Courriels dont le texte est modifiable, et langues déjà modifiées (email_templates).
  const [editable, setEditable] = useState<Set<string>>(new Set());
  const [customized, setCustomized] = useState<Record<string, ("fr" | "en")[]>>({});
  const [editing, setEditing] = useState<CatalogEmail | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const pausedCount = EMAIL_CATALOG.filter((e) => e.paused).length;
  const activeCount = EMAIL_CATALOG.length - pausedCount;
  const visible = (e: CatalogEmail) => filter === "all" || (filter === "paused" ? !!e.paused : !e.paused);

  // Objets des courriels modifiables (version modifiée comprise), rechargés après une modification.
  const [subjects, setSubjects] = useState<Record<string, Record<"fr" | "en", string>>>({});

  function loadTemplates() {
    fetch("/api/admin/email-templates")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: {
        editable: string[];
        customized: Record<string, ("fr" | "en")[]>;
        subjects?: Record<string, Record<"fr" | "en", string>>;
      } | null) => {
        if (!json) return;
        setEditable(new Set(json.editable));
        setCustomized(json.customized);
        setSubjects(json.subjects ?? {});
      })
      .catch(() => {});
  }

  useEffect(loadTemplates, []);

  function subjectOf(email: CatalogEmail): string | null {
    return subjects[email.id]?.[lang] ?? (lang === "en" ? email.subject?.en : null) ?? email.subject?.fr ?? null;
  }

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
    const emails = EMAIL_CATALOG.filter((e) => e.category === category && e.testable && !e.paused);
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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-base text-charcoal-700">
          <span className="font-semibold text-charcoal-800">{activeCount} actifs</span>
          {pausedCount > 0 && <span className="text-charcoal-500"> · {pausedCount} en pause</span>}
        </p>
        <div className="inline-flex self-start rounded-full border border-[#ebebeb] bg-white p-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === f.value ? "bg-primary text-white" : "text-charcoal-600 hover:text-charcoal-800"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {CATEGORY_ORDER.map((category) => {
        const all = EMAIL_CATALOG.filter((e) => e.category === category);
        const emails = all.filter(visible);
        if (emails.length === 0) return null;
        const groups = [...new Set(emails.map((e) => e.group))];
        const showGroups = new Set(all.map((e) => e.group)).size > 1;
        const label = CATEGORY_LABELS[category];
        const categoryPaused = all.filter((e) => e.paused).length;
        const hasTestable = all.some((e) => e.testable && !e.paused);
        const running = runningCategory === category;
        return (
          <section key={category}>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-heading-2 font-semibold text-charcoal-800">
                  {label.title}{" "}
                  <span className="text-charcoal-400 font-normal">
                    ({all.length - categoryPaused} actifs{categoryPaused > 0 ? `, ${categoryPaused} en pause` : ""})
                  </span>
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

            <div className="space-y-5">
              {groups.map((group) => (
                <div key={group}>
                  {showGroups ? (
                    <h3 className="text-sm font-semibold text-charcoal-500 mb-2">{group}</h3>
                  ) : null}
                  <ul className="divide-y divide-[#ebebeb] rounded-2xl border border-[#ebebeb] bg-white">
                    {emails.filter((e) => e.group === group).map((email) => {
                      const status = statuses[email.id];
                      return (
                        <li key={email.id} className={`flex flex-col sm:flex-row sm:items-start gap-3 p-4 ${email.paused ? "bg-charcoal-50" : ""}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusPill paused={email.paused} />
                              <p className={`text-base font-medium ${email.paused ? "text-charcoal-500" : "text-charcoal-800"}`}>{email.name}</p>
                            </div>
                            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                              {subjectOf(email) && (
                                <>
                                  <dt className="text-charcoal-400">Objet</dt>
                                  <dd className="font-medium text-charcoal-800"><SubjectText text={subjectOf(email)!} /></dd>
                                </>
                              )}
                              <dt className="text-charcoal-400">Quand</dt>
                              <dd className="text-charcoal-700">{email.when}</dd>
                              {email.conditions && (
                                <>
                                  <dt className="text-charcoal-400">Règles</dt>
                                  <dd className="text-charcoal-700">{email.conditions}</dd>
                                </>
                              )}
                              <dt className="text-charcoal-400">Envoi</dt>
                              <dd className="text-charcoal-700">{timingLabel(email)}</dd>
                              {email.fixedRecipient && (
                                <>
                                  <dt className="text-charcoal-400">À</dt>
                                  <dd className="text-charcoal-700">{email.fixedRecipient}</dd>
                                </>
                              )}
                            </dl>
                            {email.paused && email.pausedReason && (
                              <p className="mt-2 text-sm text-warning-700">{email.pausedReason}</p>
                            )}
                            {customized[email.id]?.length ? (
                              <p className="text-xs font-medium text-primary mt-2">
                                Texte modifié ({customized[email.id].map((l) => (l === "fr" ? "français" : "anglais")).join(" et ")})
                              </p>
                            ) : null}
                            {status?.state === "sent" && (
                              <p className="text-sm text-success-600 mt-1">Envoyé à {status.to}</p>
                            )}
                            {status?.state === "error" && (
                              <p className="text-sm text-error-600 mt-1">{status.message}</p>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end shrink-0">
                            {editable.has(email.id) && (
                              <button
                                type="button"
                                onClick={() => setEditing(email)}
                                className="rounded-full border border-primary/40 bg-white px-4 py-2 text-sm font-medium text-primary hover:bg-[#f5f6ec] transition-colors"
                              >
                                Modifier le texte
                              </button>
                            )}
                            {email.testable ? (
                              <button
                                type="button"
                                onClick={() => sendOne(email)}
                                disabled={status?.state === "sending" || runningCategory !== null}
                                className="rounded-full border border-[#ebebeb] bg-white px-4 py-2 text-sm font-medium text-charcoal-700 hover:border-charcoal-400 disabled:text-charcoal-400 transition-colors"
                              >
                                {status?.state === "sending" ? "Envoi…" : "Envoyer un test"}
                              </button>
                            ) : (
                              <span className="text-xs text-charcoal-400">Test par le vrai parcours</span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {editing && (
        <EmailTemplateEditor
          emailId={editing.id}
          emailName={editing.name}
          initialLang={lang}
          onClose={() => setEditing(null)}
          onChanged={(langs) => {
            setCustomized((c) => ({ ...c, [editing.id]: langs }));
            loadTemplates();
          }}
        />
      )}
    </div>
  );
}
