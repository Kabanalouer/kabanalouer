-- Retours des proprios (bouton « Une idée ou un problème ? » du tableau de
-- bord, Admin → Retours des proprios). triage = analyse de Claude (JSON :
-- catégorie, priorité, résumé, action recommandée). Écrit et lu par le
-- client service seulement (RLS activée sans politique).
create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid references public.users(id) on delete set null,
  kind text not null check (kind in ('probleme', 'idee', 'autre')),
  message text not null check (char_length(message) between 1 and 3000),
  page text,
  user_agent text,
  triage jsonb,
  status text not null default 'nouveau' check (status in ('nouveau', 'en_cours', 'regle', 'ferme'))
);

create index if not exists feedback_created_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;
