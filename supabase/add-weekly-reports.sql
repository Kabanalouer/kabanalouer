-- Rapport du lundi (Admin → Rapports, cron /api/cron/weekly-report).
-- Une ligne par rapport : chiffres de la semaine (metrics, JSON brut transmis
-- à l'IA) et analyse rédigée (report, JSON : résumé, problèmes,
-- recommandations, erreurs). RLS activée sans politique : service seulement.
create table if not exists public.weekly_reports (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  period_start timestamptz not null,
  period_end timestamptz not null,
  metrics jsonb not null,
  report jsonb not null,
  model text not null
);

create index if not exists weekly_reports_created_idx on public.weekly_reports (created_at desc);

alter table public.weekly_reports enable row level security;
