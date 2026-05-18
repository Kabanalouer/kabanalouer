"use client";

import { useEffect, useState, useCallback } from "react";

type Period = "7d" | "30d" | "year" | "all";

const PERIODS: { value: Period; label: string }[] = [
  { value: "7d", label: "7 derniers jours" },
  { value: "30d", label: "30 derniers jours" },
  { value: "year", label: "Cette année" },
  { value: "all", label: "Depuis le début" },
];

interface Stats {
  totalContacts: number;
  responseRate: number | null;
  avgResponseMs: number | null;
  totalReviews: number;
  avgRating: number | null;
  totalImpressions: number | null;
  totalConsultations: number | null;
}

function formatResponseTime(ms: number | null): string {
  if (ms === null) return "—";
  const h = ms / 3_600_000;
  if (h < 1) return "Répond en moins d'1h";
  if (h < 2) return "Répond en moins de 2h";
  if (h < 4) return "Répond en moins de 4h";
  if (h < 24) return "Répond en moins d'un jour";
  const d = Math.round(h / 24);
  return `Répond en ${d} jour${d > 1 ? "s" : ""}`;
}

export default function DashboardStats() {
  const [period, setPeriod] = useState<Period>("all");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async (p: Period) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/stats?period=${p}`);
      if (res.ok) setStats(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchStats(period); }, [period, fetchStats]);

  const viewsUnavailable = period !== "all";
  const avgRating = stats?.avgRating ?? null;

  return (
    <div className="mb-10">
      {/* Period filter */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {PERIODS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            className={`text-sm px-4 py-1.5 rounded-full font-medium transition-colors border ${
              period === opt.value
                ? "bg-primary text-white border-primary"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Stats grid */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 transition-opacity duration-200 ${loading ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
        <StatCard
          label="Impressions"
          value={viewsUnavailable ? "N/D" : (stats?.totalImpressions ?? 0).toLocaleString("fr-CA")}
          sub={viewsUnavailable ? "Non disponible par période" : "Apparitions dans la recherche"}
          icon="👁"
          unavailable={viewsUnavailable}
        />
        <StatCard
          label="Consultations"
          value={viewsUnavailable ? "N/D" : (stats?.totalConsultations ?? 0).toLocaleString("fr-CA")}
          sub={viewsUnavailable ? "Non disponible par période" : "Visites de vos fiches"}
          icon="📄"
          unavailable={viewsUnavailable}
        />
        <StatCard
          label="Contacts reçus"
          value={(stats?.totalContacts ?? 0).toLocaleString("fr-CA")}
          sub="Messages de voyageurs"
          icon="💬"
        />
        <StatCard
          label="Taux de réponse"
          value={stats?.responseRate != null ? `${stats.responseRate} %` : "—"}
          sub="Messages avec réponse"
          icon="✅"
        />
        <StatCard
          label="Rapidité"
          value={formatResponseTime(stats?.avgResponseMs ?? null)}
          small
          sub="Temps moyen de réponse"
          icon="⚡"
        />

        {/* Reviews card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Avis</span>
            <span className="text-lg">⭐</span>
          </div>
          {avgRating !== null ? (
            <>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-2xl font-bold text-gray-900">{avgRating.toFixed(1)}</span>
                <span className="text-sm text-gray-400">/ 5</span>
              </div>
              <div className="flex gap-0.5 mb-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <svg
                    key={i}
                    className={`w-3.5 h-3.5 fill-current ${i <= Math.round(avgRating) ? "text-yellow-400" : "text-gray-200"}`}
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-xs text-gray-400">{stats?.totalReviews} avis</p>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-gray-300 mb-1">—</div>
              <p className="text-xs text-gray-400">Aucun avis pour l&apos;instant</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  small = false,
  unavailable = false,
}: {
  label: string;
  value: string;
  sub: string;
  icon: string;
  small?: boolean;
  unavailable?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className={`font-bold mb-1 ${unavailable ? "text-gray-300" : "text-gray-900"} ${small ? "text-base leading-snug" : "text-2xl"}`}>
        {value}
      </div>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  );
}
