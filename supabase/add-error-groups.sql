-- Suivi des erreurs (Admin → Erreurs). Une ligne par erreur distincte
-- (empreinte = source + message normalisé) : nombre d'occurrences, première et
-- dernière apparition, réglée ou non. Une erreur « réglée » qui revient est
-- rouverte automatiquement (sauf si elle a été ignorée). Écrit par record_error() avec le client service.
-- RLS activée sans politique : service seulement.
create table if not exists public.error_groups (
  fingerprint text primary key,
  source text not null check (source in ('client', 'server')),
  message text not null,
  path text,
  stack text,
  user_agent text,
  count integer not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  -- Ignorée : erreur sans importance, ne rouvre plus et n'alerte plus
  ignored boolean not null default false,
  notified_at timestamptz
);

create index if not exists error_groups_last_seen_idx on public.error_groups (last_seen_at desc);

alter table public.error_groups enable row level security;

-- Renvoie true quand l'erreur est nouvelle ou revient après avoir été réglée
-- (sert à décider d'envoyer l'alerte courriel).
create or replace function public.record_error(
  p_fingerprint text, p_source text, p_message text, p_path text, p_stack text, p_user_agent text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  was_resolved boolean;
  is_ignored boolean;
begin
  insert into public.error_groups (fingerprint, source, message, path, stack, user_agent)
  values (p_fingerprint, p_source, left(p_message, 1000), left(p_path, 500), left(p_stack, 4000), left(p_user_agent, 300))
  on conflict (fingerprint) do nothing;
  if found then
    return true; -- nouvelle erreur
  end if;

  select resolved_at is not null, ignored into was_resolved, is_ignored
  from public.error_groups where fingerprint = p_fingerprint for update;

  update public.error_groups
  set count = count + 1,
      last_seen_at = now(),
      path = coalesce(left(p_path, 500), path),
      stack = coalesce(left(p_stack, 4000), stack),
      user_agent = coalesce(left(p_user_agent, 300), user_agent),
      resolved_at = case when ignored then resolved_at else null end
  where fingerprint = p_fingerprint;

  return coalesce(was_resolved, false) and not coalesce(is_ignored, false); -- true : erreur réglée qui revient
end;
$$;

revoke all on function public.record_error(text, text, text, text, text, text) from public, anon, authenticated;
