-- Compteurs anonymes des tunnels de conversion (Admin → Santé de la plateforme).
-- Un total par jour (heure du Québec) et par étape : aucun identifiant,
-- aucune donnée personnelle. Chaque étape est comptée une fois par visite
-- côté navigateur (sessionStorage), puis incrémentée par /api/funnel avec
-- le client service. RLS activée sans politique : service seulement.
create table if not exists public.funnel_counts (
  day date not null,
  step text not null,
  count integer not null default 0,
  primary key (day, step)
);

alter table public.funnel_counts enable row level security;

create or replace function public.increment_funnel_step(p_step text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.funnel_counts (day, step, count)
  values ((now() at time zone 'America/Toronto')::date, p_step, 1)
  on conflict (day, step) do update set count = public.funnel_counts.count + 1;
$$;

revoke all on function public.increment_funnel_step(text) from public, anon, authenticated;
