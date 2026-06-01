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

const EyeIcon = () => (
  <svg className="w-5 h-5 text-charcoal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const DocIcon = () => (
  <svg className="w-5 h-5 text-charcoal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

const ChatIcon = () => (
  <svg className="w-5 h-5 text-charcoal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="w-5 h-5 text-charcoal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-5 h-5 text-charcoal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
  </svg>
);

const StarOutlineIcon = () => (
  <svg className="w-5 h-5 text-charcoal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
  </svg>
);

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
                : "bg-white text-charcoal-600 border-[#ebebeb] hover:border-charcoal-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Stats grid */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 transition-opacity duration-200 ${loading ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
        <StatCard
          label="Consultations"
          value={viewsUnavailable ? "N/D" : (stats?.totalConsultations ?? 0).toLocaleString("fr-CA")}
          sub={viewsUnavailable ? "Non disponible par période" : "Visites de vos fiches"}
          icon={<DocIcon />}
          unavailable={viewsUnavailable}
        />
        <StatCard
          label="Contacts reçus"
          value={(stats?.totalContacts ?? 0).toLocaleString("fr-CA")}
          sub="Messages de voyageurs"
          icon={<ChatIcon />}
        />
        <StatCard
          label="Taux de réponse"
          value={stats?.responseRate != null ? `${stats.responseRate} %` : "—"}
          sub="Messages avec réponse"
          icon={<CheckCircleIcon />}
        />
        <StatCard
          label="Rapidité"
          value={formatResponseTime(stats?.avgResponseMs ?? null)}
          small
          sub="Temps moyen de réponse"
          icon={<ClockIcon />}
        />

        {/* Reviews card */}
        <div className="bg-white rounded-2xl border border-[#ebebeb] p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-charcoal-400 uppercase tracking-wide">Avis</span>
            <StarOutlineIcon />
          </div>
          {avgRating !== null ? (
            <>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-2xl font-bold text-charcoal-800">{avgRating.toFixed(1)}</span>
                <span className="text-sm text-charcoal-400">/ 5</span>
              </div>
              <div className="flex gap-0.5 mb-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <svg
                    key={i}
                    className={`w-3.5 h-3.5 fill-current ${i <= Math.round(avgRating) ? "text-yellow-400" : "text-[#ebebeb]"}`}
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-xs text-charcoal-400">{stats?.totalReviews} avis</p>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-charcoal-300 mb-1">—</div>
              <p className="text-xs text-charcoal-400">Aucun avis pour l&apos;instant</p>
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
  icon: React.ReactNode;
  small?: boolean;
  unavailable?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#ebebeb] p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-charcoal-400 uppercase tracking-wide">{label}</span>
        {icon}
      </div>
      <div className={`font-bold mb-1 ${unavailable ? "text-charcoal-300" : "text-charcoal-800"} ${small ? "text-base leading-snug" : "text-2xl"}`}>
        {value}
      </div>
      <p className="text-xs text-charcoal-400">{sub}</p>
    </div>
  );
}
