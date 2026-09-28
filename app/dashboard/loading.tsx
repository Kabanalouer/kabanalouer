// Squelette affiché pendant le chargement des pages du tableau de bord. Rendu
// à l'intérieur de app/dashboard/layout.tsx : la Navbar et la barre du bas
// mobile sont déjà affichées par le layout, seul le contenu est simulé.
export default function DashboardLoading() {
  return (
    <div className="max-w-5xl animate-pulse" aria-busy="true" aria-live="polite">
      <div className="mb-8">
        <div className="h-8 sm:h-9 w-64 max-w-full rounded-lg bg-charcoal-100" />
        <div className="h-4 w-40 rounded bg-charcoal-100 mt-2" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`rounded-2xl bg-white border border-[#ebebeb] p-5 ${i === 2 ? "col-span-2 sm:col-span-1" : ""}`}>
            <div className="h-5 w-5 rounded bg-charcoal-100 mb-4" />
            <div className="h-7 w-16 rounded bg-charcoal-100 mb-2" />
            <div className="h-3 w-24 rounded bg-charcoal-100" />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="h-6 w-40 rounded bg-charcoal-100" />
        <div className="h-9 w-36 rounded-full bg-charcoal-100" />
      </div>

      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-4 rounded-2xl bg-white border border-[#ebebeb] p-4">
            <div className="w-20 h-16 sm:w-28 sm:h-20 rounded-xl bg-charcoal-100 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="h-4 w-3/5 rounded bg-charcoal-100 mb-2" />
              <div className="h-3 w-2/5 rounded bg-charcoal-100 mb-2" />
              <div className="h-3 w-1/4 rounded bg-charcoal-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
