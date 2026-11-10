"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { safeHttpUrl } from "@/lib/safeUrl";

export type ProspectRow = {
  id: string;
  name: string;
  domain: string | null;
  siteUrl: string | null;
  category: string | null;
  region: string | null;
  isManager: boolean;
  listingsSeen: number | null;
  sampleUrl: string | null;
  note: string | null;
  status: "nouveau" | "a_creer" | "brouillons_crees" | "invitation_envoyee" | "ignore";
};

const STATUS_LABELS: Record<ProspectRow["status"], string> = {
  nouveau: "Nouveau",
  a_creer: "En file d’attente",
  brouillons_crees: "Brouillons créés",
  invitation_envoyee: "Invitation envoyée",
  ignore: "Ignoré",
};

const STATUS_STYLES: Record<ProspectRow["status"], string> = {
  nouveau: "bg-charcoal-50 text-charcoal-600",
  a_creer: "bg-warning-50 text-warning-700",
  brouillons_crees: "bg-[#f5f6ec] text-primary",
  invitation_envoyee: "bg-[#f5f6ec] text-primary",
  ignore: "bg-charcoal-50 text-charcoal-400",
};

// Liste Admin → Prospects : le bouton met le site en file d'attente, la création des fiches se fait ensuite à la demande de Simon.
export default function ProspectsClient({ rows }: { rows: ProspectRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"tous" | ProspectRow["status"]>("tous");
  const [kind, setKind] = useState<"tous" | "proprietaire" | "gestionnaire">("tous");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "tous" && r.status !== status) return false;
      if (kind === "proprietaire" && r.isManager) return false;
      if (kind === "gestionnaire" && !r.isManager) return false;
      if (!q) return true;
      return [r.name, r.domain, r.category, r.region, r.note].some((v) => v?.toLowerCase().includes(q));
    });
  }, [rows, query, status, kind]);

  async function act(id: string, action: "queue" | "unqueue" | "ignore" | "restore") {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Erreur");
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const button = "rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60";
  const field = "rounded-xl border border-[#ebebeb] bg-white px-3 py-2 text-sm text-charcoal-800";

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher (nom, site, région…)"
          aria-label="Rechercher un site"
          className={`${field} min-w-0 flex-1 basis-56`}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Filtrer par état" className={field}>
          <option value="tous">Tous les états</option>
          {(Object.keys(STATUS_LABELS) as ProspectRow["status"][]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} aria-label="Filtrer par type" className={field}>
          <option value="tous">Propriétaires et gestionnaires</option>
          <option value="proprietaire">Propriétaires</option>
          <option value="gestionnaire">Gestionnaires</option>
        </select>
      </div>

      <p className="mb-3 text-xs text-charcoal-400">{visible.length} site{visible.length !== 1 ? "s" : ""} affiché{visible.length !== 1 ? "s" : ""}</p>
      {error && <p className="mb-3 text-sm text-error-600" role="alert">{error}</p>}

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-[#ebebeb] bg-white p-8 text-center text-sm text-charcoal-400">Aucun site ne correspond.</div>
      ) : (
        <div className="divide-y divide-[#ebebeb] overflow-hidden rounded-2xl border border-[#ebebeb] bg-white">
          {visible.map((r) => {
            const url = safeHttpUrl(r.siteUrl);
            const sample = safeHttpUrl(r.sampleUrl);
            const working = busy === r.id;
            return (
              <div key={r.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {url ? (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="truncate text-sm font-semibold text-primary hover:text-primary-700 hover:underline">
                        {r.name}
                      </a>
                    ) : (
                      <span className="truncate text-sm font-semibold text-charcoal-800">{r.name}</span>
                    )}
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status]}`}>{STATUS_LABELS[r.status]}</span>
                    {r.isManager && <span className="rounded-full bg-charcoal-50 px-2.5 py-0.5 text-xs font-medium text-charcoal-600">Gestionnaire</span>}
                  </div>
                  <p className="mt-0.5 text-xs text-charcoal-400">
                    {[r.category, r.region, r.listingsSeen ? `${r.listingsSeen} fiche${r.listingsSeen > 1 ? "s" : ""} vue${r.listingsSeen > 1 ? "s" : ""}` : null].filter(Boolean).join(" · ")}
                    {sample && (
                      <>
                        {" · "}
                        <a href={sample} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:text-primary-700 hover:underline">exemple de fiche</a>
                      </>
                    )}
                  </p>
                  {r.note && <p className="mt-1 text-xs text-charcoal-600">{r.note}</p>}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {r.status === "nouveau" && (
                    <>
                      <button type="button" disabled={working || !url} onClick={() => act(r.id, "queue")} className={`${button} bg-primary text-white hover:bg-primary-dark`} title={url ? undefined : "Site à trouver avant de créer les brouillons"}>
                        {working ? "…" : "Créer brouillon / invitation"}
                      </button>
                      <button type="button" disabled={working} onClick={() => act(r.id, "ignore")} className={`${button} border border-charcoal-300 bg-white text-charcoal-800 hover:bg-charcoal-50`}>
                        Ignorer
                      </button>
                    </>
                  )}
                  {r.status === "a_creer" && (
                    <button type="button" disabled={working} onClick={() => act(r.id, "unqueue")} className={`${button} border border-charcoal-300 bg-white text-charcoal-800 hover:bg-charcoal-50`}>
                      {working ? "…" : "Annuler la demande"}
                    </button>
                  )}
                  {r.status === "ignore" && (
                    <button type="button" disabled={working} onClick={() => act(r.id, "restore")} className={`${button} border border-charcoal-300 bg-white text-charcoal-800 hover:bg-charcoal-50`}>
                      {working ? "…" : "Remettre dans la liste"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
