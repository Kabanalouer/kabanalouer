"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_FEATURED_HOME, MAX_FEATURED_REGION } from "@/lib/featuredConfig";

export type FeaturedRow = {
  id: string;
  listingId: string;
  title: string;
  featuredRegion: string | null;
  type: "home" | "region";
  month: string;
  status: string;
  photoUrl: string | null;
  hostName: string;
};

export type PickableListing = {
  id: string;
  title: string;
  region: string;
  hostName: string;
};

function getMonths(n: number): { value: string; label: string }[] {
  const months: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    const raw = d.toLocaleDateString("fr-CA", { month: "long", year: "numeric" });
    months.push({ value, label: raw.charAt(0).toUpperCase() + raw.slice(1) });
  }
  return months;
}

function fmtMonth(iso: string) {
  const raw = new Date(iso + "T12:00:00").toLocaleDateString("fr-CA", {
    month: "long",
    year: "numeric",
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

const MONTHS = getMonths(12);

function SlotCard({
  row,
  onRemove,
  removing,
}: {
  row: FeaturedRow;
  onRemove: (id: string) => void;
  removing: boolean;
}) {
  return (
    <div className="flex items-center gap-3 bg-white border border-[#ebebeb] rounded-xl p-3">
      {row.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={row.photoUrl}
          alt={row.title}
          className="w-14 h-14 rounded-lg object-cover shrink-0"
        />
      ) : (
        <div className="w-14 h-14 rounded-lg bg-charcoal-100 shrink-0 flex items-center justify-center">
          <svg className="w-5 h-5 text-charcoal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 21h18M3.75 3h16.5c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125H3.75A1.125 1.125 0 012.625 15.375V4.125C2.625 3.504 3.129 3 3.75 3z" />
          </svg>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-charcoal-800 text-sm truncate">{row.title}</p>
        <p className="text-xs text-charcoal-400 truncate">{row.hostName}</p>
        <p className="text-xs text-primary font-medium mt-0.5">{fmtMonth(row.month)}</p>
      </div>
      <button
        onClick={() => onRemove(row.id)}
        disabled={removing}
        className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
      >
        Retirer
      </button>
    </div>
  );
}

function EmptySlot({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      className="flex items-center gap-3 w-full border border-dashed border-[#ebebeb] rounded-xl p-3 hover:border-primary/40 hover:bg-[#f5f6ec]/50 transition-colors group"
    >
      <div className="w-14 h-14 rounded-lg bg-charcoal-50 shrink-0 flex items-center justify-center group-hover:bg-[#f5f6ec]">
        <svg className="w-5 h-5 text-charcoal-300 group-hover:text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </div>
      <span className="text-sm text-charcoal-400 group-hover:text-primary/70">Emplacement libre — Ajouter une vedette</span>
    </button>
  );
}

type ModalState = {
  type: "home" | "region";
  region?: string;
};

export default function AdminFeaturedClient({
  homeRows,
  regionRows,
  listings,
  regions,
}: {
  homeRows: FeaturedRow[];
  regionRows: FeaturedRow[];
  listings: PickableListing[];
  regions: string[];
}) {
  const router = useRouter();
  const [removing, setRemoving] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [selectedListingId, setSelectedListingId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[0].value);
  const [selectedRegion, setSelectedRegion] = useState(regions[0] ?? "");
  const [adding, setAdding] = useState(false);
  const [modalError, setModalError] = useState("");

  async function handleRemove(featuredId: string) {
    setRemoving(featuredId);
    try {
      const res = await fetch("/api/admin/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", featuredId }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        alert(d.error ?? "Erreur lors du retrait");
      } else {
        router.refresh();
      }
    } catch {
      alert("Erreur réseau");
    } finally {
      setRemoving(null);
    }
  }

  function openModal(state: ModalState) {
    setModal(state);
    setSelectedListingId("");
    setSelectedMonth(MONTHS[0].value);
    setModalError("");
    if (state.region) setSelectedRegion(state.region);
  }

  async function handleAdd() {
    if (!selectedListingId) {
      setModalError("Veuillez sélectionner une annonce.");
      return;
    }
    setAdding(true);
    setModalError("");
    try {
      const body = {
        action: "add",
        listingId: selectedListingId,
        type: modal!.type,
        month: selectedMonth,
        ...(modal!.type === "region" ? { region: selectedRegion } : {}),
      };
      const res = await fetch("/api/admin/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setModalError(d.error ?? "Erreur");
      } else {
        setModal(null);
        router.refresh();
      }
    } catch {
      setModalError("Erreur réseau");
    } finally {
      setAdding(false);
    }
  }

  // Group region rows by region name
  const regionMap = new Map<string, FeaturedRow[]>();
  for (const r of regionRows) {
    const key = r.featuredRegion ?? "Autre";
    const arr = regionMap.get(key) ?? [];
    arr.push(r);
    regionMap.set(key, arr);
  }

  // For region sections: include all regions that have at least one active vedette
  // plus allow adding for all known regions
  const regionSections = regions.map((reg) => ({
    region: reg,
    rows: regionMap.get(reg) ?? [],
  }));

  const totalHomeActive = homeRows.length;
  const totalRegionActive = regionRows.length;

  return (
    <div className="space-y-10">
      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 max-w-sm">
        <div className="bg-white rounded-xl border border-[#ebebeb] px-5 py-4">
          <p className="text-xs text-charcoal-400 mb-1">Vedettes accueil actives</p>
          <p className="text-2xl font-bold text-charcoal-800">{totalHomeActive}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#ebebeb] px-5 py-4">
          <p className="text-xs text-charcoal-400 mb-1">Vedettes région actives</p>
          <p className="text-2xl font-bold text-charcoal-800">{totalRegionActive}</p>
        </div>
      </div>

      {/* Section accueil */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-charcoal-800">Page d&apos;accueil</h2>
            <p className="text-sm text-charcoal-400 mt-0.5">
              {totalHomeActive}/{MAX_FEATURED_HOME} emplacement{totalHomeActive !== 1 ? "s" : ""} occupé{totalHomeActive !== 1 ? "s" : ""}
            </p>
          </div>
          <span className="text-sm text-charcoal-400">99 $/mois</span>
        </div>
        <div className="space-y-2.5">
          {homeRows.map((row) => (
            <SlotCard
              key={row.id}
              row={row}
              onRemove={handleRemove}
              removing={removing === row.id}
            />
          ))}
          {Array.from({ length: Math.max(0, MAX_FEATURED_HOME - homeRows.length) }).map((_, i) => (
            <EmptySlot key={i} onAdd={() => openModal({ type: "home" })} />
          ))}
        </div>
      </section>

      {/* Section régions */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-charcoal-800">Par région</h2>
          <p className="text-sm text-charcoal-400 mt-0.5">
            {totalRegionActive} vedette{totalRegionActive !== 1 ? "s" : ""} active{totalRegionActive !== 1 ? "s" : ""} · 49 $/mois
          </p>
        </div>
        <div className="space-y-6">
          {regionSections.map(({ region, rows }) => (
            <div key={region}>
              <p className="text-sm font-semibold text-charcoal-700 mb-2.5">{region}</p>
              <div className="space-y-2">
                {rows.map((row) => (
                  <SlotCard
                    key={row.id}
                    row={row}
                    onRemove={handleRemove}
                    removing={removing === row.id}
                  />
                ))}
                {Array.from({ length: Math.max(0, MAX_FEATURED_REGION - rows.length) }).map((_, i) => (
                  <EmptySlot key={i} onAdd={() => openModal({ type: "region", region })} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Modal ajouter */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-charcoal-800 text-base">
                Ajouter une vedette —{" "}
                {modal.type === "home" ? "Page d'accueil" : modal.region ?? "Région"}
              </h2>
              <button
                onClick={() => setModal(null)}
                className="text-charcoal-300 hover:text-charcoal-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Annonce */}
              <div>
                <label className="block text-xs font-medium text-charcoal-700 mb-1.5">
                  Annonce
                </label>
                <select
                  value={selectedListingId}
                  onChange={(e) => setSelectedListingId(e.target.value)}
                  className="w-full border border-[#ebebeb] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary transition bg-white text-charcoal-700"
                >
                  <option value="">Sélectionner une annonce…</option>
                  {listings.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title} — {l.region} ({l.hostName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Région (si type=region) */}
              {modal.type === "region" && !modal.region && (
                <div>
                  <label className="block text-xs font-medium text-charcoal-700 mb-1.5">
                    Région
                  </label>
                  <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    className="w-full border border-[#ebebeb] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary transition bg-white text-charcoal-700"
                  >
                    {regions.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Mois */}
              <div>
                <label className="block text-xs font-medium text-charcoal-700 mb-1.5">
                  Mois
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full border border-[#ebebeb] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary transition bg-white text-charcoal-700"
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {modalError && (
              <p className="text-sm text-red-600 mt-3">{modalError}</p>
            )}

            <div className="flex flex-col sm:flex-row gap-2 mt-5">
              <button
                onClick={() => setModal(null)}
                className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl border border-[#ebebeb] text-charcoal-600 hover:bg-charcoal-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleAdd}
                disabled={adding}
                className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {adding ? "En cours…" : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
