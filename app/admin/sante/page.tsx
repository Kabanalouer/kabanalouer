import Link from "next/link";
import { getPlatformHealth, type Compared, type FunnelRow } from "@/lib/platformHealth";

export const metadata = { title: "Santé de la plateforme — Administration" };
export const dynamic = "force-dynamic";

const PERIODS = [7, 30, 90] as const;

const nf = new Intl.NumberFormat("fr-CA", { maximumFractionDigits: 1 });

function pct(part: number, total: number): string {
  return total ? `${Math.round((part / total) * 100)} %` : "—";
}

function duration(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${nf.format(Math.round(hours * 10) / 10)} h`;
  return `${Math.round(hours / 24)} jours`;
}

function Delta({ value, days }: { value: Compared; days: number }) {
  const diff = value.current - value.previous;
  if (diff === 0) return <p className="mt-1 text-xs text-charcoal-400">Comme les {days} jours précédents ({value.previous})</p>;
  return (
    <p className="mt-1 text-xs text-charcoal-400">
      <span className={diff > 0 ? "font-semibold text-success-700" : "font-semibold text-charcoal-600"}>
        {diff > 0 ? "+" : "−"}{Math.abs(diff)}
      </span>{" "}
      par rapport aux {days} jours précédents ({value.previous})
    </p>
  );
}

function Stat({ label, value, hint, children }: { label: string; value: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#ebebeb] bg-white p-5">
      <p className="text-sm font-medium text-charcoal-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-charcoal-800">{value}</p>
      {children}
      {hint && <p className="mt-2 text-xs text-charcoal-400">{hint}</p>}
    </div>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-heading-2 font-semibold text-charcoal-800">{title}</h2>
      <p className="mt-1 mb-4 text-sm text-charcoal-500">{description}</p>
      {children}
    </section>
  );
}

function Funnel({ title, rows }: { title: string; rows: FunnelRow[] }) {
  const top = Math.max(rows[0]?.count ?? 0, 1);
  return (
    <div className="rounded-2xl border border-[#ebebeb] bg-white p-5">
      <h3 className="text-base font-semibold text-charcoal-800 mb-4">{title}</h3>
      <ol>
        {rows.map((row, i) => {
          const prev = rows[i - 1];
          return (
            <li key={row.label}>
              {prev && (
                <p className="py-1.5 pl-3 text-xs text-charcoal-400">
                  ↓ {prev.count ? `${Math.round((row.count / prev.count) * 100)}\u00a0% passent à l’étape suivante` : "—"}
                </p>
              )}
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-charcoal-700">{row.label}</span>
                <span className="text-base font-semibold text-charcoal-800">{nf.format(row.count)}</span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-charcoal-100">
                <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, (row.count / top) * 100)}%` }} />
              </div>
              {row.note && <p className="mt-1 text-xs text-charcoal-400">{row.note}</p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function WatchList<T>({ title, empty, items, render }: { title: string; empty: string; items: T[]; render: (item: T) => React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#ebebeb] bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-[#ebebeb] px-5 py-4">
        <h3 className="text-base font-semibold text-charcoal-800">{title}</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${items.length ? "bg-warning-50 text-warning-700" : "bg-success-50 text-success-700"}`}>
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-4 text-sm text-charcoal-400">{empty}</p>
      ) : (
        <ul className="divide-y divide-[#ebebeb]">
          {items.slice(0, 8).map((item, i) => (
            <li key={i} className="px-5 py-3 text-sm">{render(item)}</li>
          ))}
          {items.length > 8 && <li className="px-5 py-3 text-xs text-charcoal-400">et {items.length - 8} autres</li>}
        </ul>
      )}
    </div>
  );
}

export default async function AdminHealthPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p } = await searchParams;
  const days = PERIODS.find((d) => String(d) === p) ?? 30;
  const h = await getPlatformHealth(days);
  const { supply, demand, trust, reviews, watch } = h;

  return (
    <div className="max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-charcoal-800">Santé de la plateforme</h1>
          <p className="mt-2 text-base text-charcoal-500">
            Les signaux à suivre chaque semaine : ce qui coince, ce qui progresse.
          </p>
        </div>
        <nav className="inline-flex self-start rounded-full border border-[#ebebeb] bg-white p-1" aria-label="Période">
          {PERIODS.map((d) => (
            <Link
              key={d}
              href={`/admin/sante?p=${d}`}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                d === days ? "bg-primary text-white" : "text-charcoal-600 hover:text-charcoal-800"
              }`}
            >
              {d} jours
            </Link>
          ))}
        </nav>
      </div>

      <Section title="À surveiller" description="État actuel, quelle que soit la période choisie.">
        <div className="grid gap-4 lg:grid-cols-2">
          <WatchList
            title="Erreurs à régler"
            empty={watch.openErrors === null ? "Suivi des erreurs pas encore activé." : "Aucune erreur à régler."}
            items={watch.openErrors ?? []}
            render={(e) => (
              <>
                <p className="font-medium text-charcoal-800 break-words">{e.message.slice(0, 140)}</p>
                <p className="text-charcoal-500">
                  {e.source === "client" ? "Navigateur" : "Serveur"} · {e.count} fois ·{" "}
                  <Link href="/admin/erreurs" className="text-primary font-medium">voir</Link>
                </p>
              </>
            )}
          />
          <WatchList
            title="Demandes sans réponse"
            empty="Tous les proprios ont répondu aux demandes de plus de 24 h."
            items={watch.unanswered}
            render={(c) => (
              <>
                <p className="font-medium text-charcoal-800">{c.listingTitle}</p>
                <p className="text-charcoal-500">{c.travelerName} attend {c.hostName} depuis {duration(c.ageHours)}</p>
              </>
            )}
          />
          <WatchList
            title="Brouillons abandonnés"
            empty="Aucun brouillon de plus de 48 h jamais publié."
            items={watch.abandonedDrafts}
            render={(d) => (
              <>
                <p className="font-medium text-charcoal-800">{d.title}</p>
                <p className="text-charcoal-500">{d.hostName} · commencé il y a {d.ageDays} jours</p>
              </>
            )}
          />
          <WatchList
            title="Annonces sans demande depuis 30 jours"
            empty="Chaque annonce publiée depuis plus de 14 jours a reçu au moins une demande ce mois-ci."
            items={watch.quietListings}
            render={(l) => (
              <>
                <p className="font-medium text-charcoal-800">{l.title}</p>
                <p className="text-charcoal-500">{l.hostName} · en ligne depuis {l.publishedDays} jours</p>
              </>
            )}
          />
        </div>
      </Section>

      <Section
        title="Tunnels de conversion"
        description="Combien de personnes passent chaque étape sur la période, et où elles décrochent. Visites et clics : comptés une fois par visite, sans cookie ni donnée personnelle."
      >
        {!h.funnels.available ? (
          <p className="rounded-2xl border border-[#ebebeb] bg-white p-5 text-sm text-warning-700">
            Compteurs pas encore activés : exécuter supabase/add-funnel-counts.sql dans Supabase.
          </p>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <Funnel title="Voyageurs : de la visite à la demande" rows={h.funnels.traveler} />
              <Funnel title="Proprios : de la visite à la publication" rows={h.funnels.host} />
            </div>
            <p className="mt-3 text-xs text-charcoal-400">
              {h.funnels.trackingSince
                ? `Compteurs actifs depuis le ${new Date(`${h.funnels.trackingSince}T12:00:00`).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" })}.`
                : "Compteurs activés, aucune visite enregistrée pour l’instant."}{" "}
              Inscriptions, annonces et publications viennent de la base : un proprio peut s’inscrire sans passer par la page Devenir hôte.
            </p>
          </>
        )}
      </Section>

      <Section
        title="Réponse des proprios"
        description="Le cœur de la confiance des voyageurs. Demandes de la période qui ont au moins 24 h (le temps de répondre)."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Taux de réponse" value={pct(trust.replied.current, trust.eligible.current)}>
            <p className="mt-1 text-xs text-charcoal-400">{trust.replied.current} demandes sur {trust.eligible.current}</p>
          </Stat>
          <Stat label="Réponse en moins de 24 h" value={pct(trust.repliedWithin24h.current, trust.eligible.current)}>
            <p className="mt-1 text-xs text-charcoal-400">{trust.repliedWithin24h.current} demandes sur {trust.eligible.current}</p>
          </Stat>
          <Stat
            label="Délai médian de réponse"
            value={trust.medianReplyHours === null ? "—" : duration(trust.medianReplyHours)}
            hint="La moitié des proprios répondent plus vite que ça."
          />
          <Stat label="Relances « pas de réponse »" value={String(trust.nudgesSent.current)}>
            <Delta value={trust.nudgesSent} days={days} />
            {trust.nudgesSkipped.current > 0 && (
              <p className="mt-1 text-xs text-warning-700">
                {trust.nudgesSkipped.current} sautées (aucun chalet semblable ou courriels coupés)
              </p>
            )}
          </Stat>
        </div>
      </Section>

      <Section title="Offre" description="Proprios et annonces.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Nouveaux proprios" value={String(supply.newHosts.current)}><Delta value={supply.newHosts} days={days} /></Stat>
          <Stat label="Annonces commencées" value={String(supply.listingsCreated.current)}><Delta value={supply.listingsCreated} days={days} /></Stat>
          <Stat label="Premières publications" value={String(supply.listingsFirstPublished.current)}>
            <Delta value={supply.listingsFirstPublished} days={days} />
          </Stat>
          <Stat label="Annonces en ligne" value={String(supply.publishedNow)}>
            <p className="mt-1 text-xs text-charcoal-400">
              {supply.byRegion.length ? supply.byRegion.map((r) => `${r.region} ${r.count}`).join(" · ") : "Aucune"}
            </p>
          </Stat>
        </div>
      </Section>

      <Section title="Demande" description="Voyageurs et prises de contact.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Nouveaux voyageurs" value={String(demand.newTravelers.current)}><Delta value={demand.newTravelers} days={days} /></Stat>
          <Stat label="Nouvelles demandes" value={String(demand.newConversations.current)}>
            <Delta value={demand.newConversations} days={days} />
          </Stat>
          <Stat
            label="Demandes par annonce"
            value={demand.conversationsPerListing === null ? "—" : nf.format(demand.conversationsPerListing)}
            hint="Ce qu’un proprio reçoit en moyenne sur la période : la valeur qu’on lui vend."
          />
          <Stat label="Vues de fiches" value={nf.format(demand.viewsAllTime)} hint="Total depuis le lancement." />
        </div>
      </Section>

      <Section title="Avis" description="Après l’échange ou le séjour.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="Demandes d’avis envoyées" value={String(reviews.requested.current)}><Delta value={reviews.requested} days={days} /></Stat>
          <Stat label="Avis reçus" value={String(reviews.received.current)}><Delta value={reviews.received} days={days} /></Stat>
          <Stat label="Note moyenne" value={reviews.averageRating === null ? "—" : `${nf.format(reviews.averageRating)} / 5`} />
        </div>
      </Section>

      <p className="mt-10 text-xs text-charcoal-400">
        Une demande = une conversation lancée par un voyageur sur une annonce. Les comptes de test sont comptés comme les autres.
      </p>
    </div>
  );
}
