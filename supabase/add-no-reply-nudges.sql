-- Relance « le proprio n'a pas encore répondu » (cron /api/cron/no-reply-nudges).
-- Une ligne par conversation (annonce + voyageur) déjà traitée : 'sent' quand
-- le courriel est parti, 'skipped' quand il n'y avait rien à proposer (aucun
-- chalet semblable) ou que le voyageur a coupé les courriels. Sert d'anti-doublon :
-- jamais plus d'une relance par conversation.
-- RLS activée sans politique : lecture et écriture par le client service seulement.
create table if not exists public.no_reply_nudges (
  listing_id uuid not null references public.listings(id) on delete cascade,
  traveler_id uuid not null references public.users(id) on delete cascade,
  status text not null check (status in ('sent', 'skipped')),
  created_at timestamptz not null default now(),
  primary key (listing_id, traveler_id)
);

alter table public.no_reply_nudges enable row level security;
