"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FIELD_KEYS,
  FIELD_LABELS,
  validateFields,
  type EmailTemplateDef,
  type Lang,
  type PlaceholderDef,
  type TemplateFields,
} from "@/lib/emailTemplates/types";

// Éditeur des textes d'un courriel (Admin → Séquences courriel) : textes FR/EN,
// repères à insérer, aperçu en direct avec les données d'exemple. Enregistré
// dans email_templates via /api/admin/email-templates.

type Loaded = {
  placeholders: PlaceholderDef[];
  defaults: Record<Lang, TemplateFields>;
  saved: Record<Lang, TemplateFields | null>;
  updatedAt: Record<Lang, string | null>;
};

type FieldKey = keyof TemplateFields;

const MULTILINE: FieldKey[] = ["body", "footerNote"];
const LANG_NAME: Record<Lang, string> = { fr: "français", en: "anglais" };

function sameFields(a: TemplateFields, b: TemplateFields): boolean {
  return FIELD_KEYS.every((k) => a[k] === b[k]);
}

export default function EmailTemplateEditor({
  emailId,
  emailName,
  initialLang,
  onClose,
  onChanged,
}: {
  emailId: string;
  emailName: string;
  initialLang: Lang;
  onClose: () => void;
  onChanged: (customized: Lang[]) => void;
}) {
  const [data, setData] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState("");
  const [lang, setLang] = useState<Lang>(initialLang);
  const [drafts, setDrafts] = useState<Record<Lang, TemplateFields> | null>(null);
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const lastField = useRef<{ key: FieldKey; el: HTMLInputElement | HTMLTextAreaElement } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/email-templates?id=${encodeURIComponent(emailId)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Erreur de chargement");
        return json as Loaded;
      })
      .then((json) => {
        if (cancelled) return;
        setData(json);
        setDrafts({ fr: json.saved.fr ?? json.defaults.fr, en: json.saved.en ?? json.defaults.en });
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message);
      });
    return () => { cancelled = true; };
  }, [emailId]);

  const current = drafts?.[lang];

  // Aperçu : 700 ms après la dernière frappe.
  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/admin/email-templates/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: emailId, lang, fields: current }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "L’aperçu a échoué.");
        setPreview(json);
        setPreviewError("");
      } catch (err) {
        setPreviewError((err as Error).message);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [current, emailId, lang]);

  const setField = useCallback((key: FieldKey, value: string) => {
    setDrafts((d) => (d ? { ...d, [lang]: { ...d[lang], [key]: value } } : d));
    setMessage(null);
  }, [lang]);

  if (loadError || !data || !drafts || !current) {
    return (
      <Shell emailName={emailName} onClose={onClose}>
        <p className={`m-5 text-sm ${loadError ? "text-error-600" : "text-charcoal-500"}`}>{loadError || "Chargement…"}</p>
      </Shell>
    );
  }

  const def: EmailTemplateDef = { id: emailId, placeholders: data.placeholders, defaults: data.defaults };
  const errors = validateFields(def, current);
  const reference = (l: Lang) => data.saved[l] ?? data.defaults[l];
  const dirty = !sameFields(current, reference(lang));
  const anyDirty = (["fr", "en"] as const).some((l) => !sameFields(drafts[l], reference(l)));
  const isCustomized = !!data.saved[lang];
  const updatedAt = data.updatedAt[lang];

  function insertPlaceholder(key: string) {
    const token = `{${key}}`;
    const target = lastField.current;
    if (!target) {
      setField("body", `${current!.body}${token}`);
      return;
    }
    const el = target.el;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    setField(target.key, el.value.slice(0, start) + token + el.value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  const customizedLangs = (saved: Record<Lang, TemplateFields | null>): Lang[] => (["fr", "en"] as const).filter((l) => saved[l]);

  async function save() {
    if (errors.length) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: emailId, lang, fields: current }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "L’enregistrement a échoué.");
      const saved = { ...data!.saved, [lang]: current! };
      setData({ ...data!, saved, updatedAt: { ...data!.updatedAt, [lang]: new Date().toISOString() } });
      onChanged(customizedLangs(saved));
      setMessage({ kind: "ok", text: `Enregistré. Les prochains courriels en ${LANG_NAME[lang]} utiliseront ce texte.` });
    } catch (err) {
      setMessage({ kind: "error", text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    if (!window.confirm(`Revenir au texte d’origine en ${LANG_NAME[lang]} ? Tes modifications seront perdues.`)) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: emailId, lang }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "La réinitialisation a échoué.");
      const saved = { ...data!.saved, [lang]: null };
      setData({ ...data!, saved, updatedAt: { ...data!.updatedAt, [lang]: null } });
      setDrafts({ ...drafts!, [lang]: data!.defaults[lang] });
      onChanged(customizedLangs(saved));
      setMessage({ kind: "ok", text: "Texte d’origine rétabli." });
    } catch (err) {
      setMessage({ kind: "error", text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  function close() {
    if (anyDirty && !window.confirm("Fermer sans enregistrer tes modifications ?")) return;
    onClose();
  }

  return (
    <Shell emailName={emailName} onClose={close}>
      <div className="flex-1 overflow-y-auto lg:overflow-hidden lg:grid lg:grid-cols-2">
        <div className="p-5 space-y-4 lg:overflow-y-auto">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-full border border-[#ebebeb] p-1">
              {(["fr", "en"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => { setLang(l); setMessage(null); lastField.current = null; }}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${lang === l ? "bg-primary text-white" : "text-charcoal-600 hover:text-charcoal-800"}`}
                >
                  {l === "fr" ? "Français" : "English"}
                  {data.saved[l] ? " · modifié" : ""}
                </button>
              ))}
            </div>
            <span className="text-sm text-charcoal-500">
              {isCustomized
                ? `Texte modifié${updatedAt ? ` le ${new Date(updatedAt).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" })}` : ""}`
                : "Texte d’origine"}
            </span>
          </div>

          <p className="text-sm text-charcoal-500 bg-charcoal-50 rounded-xl px-4 py-3">
            Ligne vide = nouveau paragraphe · **texte** = <strong>gras</strong> · les repères entre accolades sont remplis
            automatiquement à l’envoi. Le lien du bouton ne change pas.
          </p>

          {FIELD_KEYS.map((key) => {
            const className =
              "w-full rounded-xl border border-[#ebebeb] px-3 py-2.5 text-base text-charcoal-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";
            const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
              lastField.current = { key, el: e.currentTarget };
            };
            return (
              <div key={key}>
                <label htmlFor={`tpl-${key}`} className="block text-sm font-medium text-charcoal-700 mb-1">
                  {FIELD_LABELS[key]}
                  {key === "greeting" && <span className="font-normal text-charcoal-400"> (omise si le prénom est inconnu)</span>}
                </label>
                {MULTILINE.includes(key) ? (
                  <textarea
                    id={`tpl-${key}`}
                    value={current[key]}
                    onFocus={onFocus}
                    onChange={(e) => setField(key, e.target.value)}
                    rows={key === "body" ? 12 : 3}
                    className={`${className} resize-y leading-relaxed`}
                  />
                ) : (
                  <input
                    id={`tpl-${key}`}
                    type="text"
                    value={current[key]}
                    onFocus={onFocus}
                    onChange={(e) => setField(key, e.target.value)}
                    className={className}
                  />
                )}
              </div>
            );
          })}

          {data.placeholders.length > 0 && (
            <div>
              <p className="text-sm font-medium text-charcoal-700 mb-2">Repères disponibles (clique pour insérer à l’endroit du curseur)</p>
              <ul className="space-y-1.5">
                {data.placeholders.map((p) => (
                  <li key={p.key} className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => insertPlaceholder(p.key)}
                      className="shrink-0 rounded-full border border-primary/30 bg-[#f5f6ec] px-2.5 py-0.5 text-sm font-medium text-primary hover:bg-primary/10"
                    >
                      {`{${p.key}}`}
                    </button>
                    <span className="text-sm text-charcoal-500 pt-0.5">{p.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {errors.length > 0 && (
            <ul className="rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600 space-y-1">
              {errors.map((e) => <li key={e}>{e}</li>)}
            </ul>
          )}
          {message && (
            <p className={`text-sm ${message.kind === "ok" ? "text-success-700" : "text-error-600"}`}>{message.text}</p>
          )}

          <div className="flex flex-wrap gap-3 pb-2">
            <button
              type="button"
              onClick={save}
              disabled={saving || !dirty || errors.length > 0}
              className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:bg-charcoal-200 disabled:text-charcoal-400 transition-colors"
            >
              {saving ? "Enregistrement…" : `Enregistrer (${LANG_NAME[lang]})`}
            </button>
            {dirty && (
              <button
                type="button"
                onClick={() => setDrafts({ ...drafts, [lang]: reference(lang) })}
                className="rounded-full border border-[#ebebeb] bg-white px-5 py-2.5 text-sm font-medium text-charcoal-700 hover:border-charcoal-400"
              >
                Annuler mes changements
              </button>
            )}
            {isCustomized && (
              <button
                type="button"
                onClick={reset}
                disabled={saving}
                className="rounded-full px-4 py-2.5 text-sm font-medium text-charcoal-500 hover:text-charcoal-800 underline underline-offset-2 disabled:text-charcoal-300"
              >
                Revenir au texte d’origine
              </button>
            )}
          </div>
        </div>

        <div className="border-t lg:border-t-0 lg:border-l border-[#ebebeb] bg-charcoal-50 p-5 flex flex-col min-h-[560px] lg:min-h-0">
          <p className="text-sm font-medium text-charcoal-700">Aperçu avec des données d’exemple</p>
          {preview && (
            <p className="mt-1 text-sm text-charcoal-500 truncate">
              <span className="text-charcoal-400">Objet : </span>{preview.subject}
            </p>
          )}
          {previewError && <p className="mt-2 text-sm text-error-600">{previewError}</p>}
          {preview ? (
            <iframe
              title="Aperçu du courriel"
              srcDoc={preview.html}
              sandbox=""
              className="mt-3 flex-1 w-full min-h-[480px] rounded-xl border border-[#ebebeb] bg-white"
            />
          ) : (
            !previewError && <p className="mt-3 text-sm text-charcoal-400">Préparation de l’aperçu…</p>
          )}
        </div>
      </div>
    </Shell>
  );
}

function Shell({ emailName, onClose, children }: { emailName: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-stretch sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full max-w-6xl sm:rounded-2xl shadow-xl flex flex-col max-h-full sm:max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Modifier le texte — ${emailName}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#ebebeb] px-5 py-4">
          <div className="min-w-0">
            <p className="text-sm text-charcoal-500">Modifier le texte</p>
            <h2 className="text-heading-3 font-semibold text-charcoal-800 truncate">{emailName}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="text-charcoal-400 hover:text-charcoal-700 shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
