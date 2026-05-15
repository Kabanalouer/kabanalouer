"use client";

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const DAY_NAMES = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

type BlockedEntry = { date: string; source: "manual" | "ical" };

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function MonthGrid({
  year,
  month,
  blockedDates,
  icalDates,
  today,
}: {
  year: number;
  month: number;
  blockedDates: Set<string>;
  icalDates: Set<string>;
  today: string;
}) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  return (
    <div className="flex-1 min-w-[200px]">
      <h3 className="text-sm font-semibold text-gray-700 text-center mb-3">
        {MONTH_NAMES[month]} {year}
      </h3>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-0.5">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-gray-300 py-0.5">{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = toDateStr(year, month, day);
          const isPast = dateStr < today;
          const isManual = blockedDates.has(dateStr);
          const isIcal = icalDates.has(dateStr);

          let cls = "aspect-square rounded-md text-[11px] flex items-center justify-center ";
          if (isPast) cls += "text-gray-200";
          else if (isManual) cls += "bg-red-100 text-red-600 font-semibold";
          else if (isIcal) cls += "bg-amber-100 text-amber-600 font-semibold";
          else cls += "text-gray-600";

          return (
            <div key={day} className={cls}>
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AvailabilityView({ blocked }: { blocked: BlockedEntry[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();

  const blockedDates = new Set(
    blocked.filter((e) => e.source === "manual").map((e) => e.date)
  );
  const icalDates = new Set(
    blocked.filter((e) => e.source === "ical").map((e) => e.date)
  );

  // Show 3 months: current + next 2
  const months = [0, 1, 2].map((offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const hasAnyBlocked = blocked.length > 0;

  return (
    <div>
      <div className="flex flex-wrap gap-6 justify-between">
        {months.map(({ year, month }) => (
          <MonthGrid
            key={`${year}-${month}`}
            year={year}
            month={month}
            blockedDates={blockedDates}
            icalDates={icalDates}
            today={today}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-white border border-gray-200" />
          Disponible
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-100" />
          Indisponible
        </div>
        {icalDates.size > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-100" />
            Réservé (calendrier ext.)
          </div>
        )}
      </div>

      {!hasAnyBlocked && (
        <p className="text-xs text-primary mt-3 font-medium">
          Ce chalet est disponible pour toutes les dates — contactez l&apos;hôte pour confirmer.
        </p>
      )}
    </div>
  );
}
