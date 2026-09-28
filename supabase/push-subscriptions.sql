-- À exécuter dans Supabase Dashboard → SQL Editor (projet fgdwhbemzmccchemtzog)
-- Statut : appliquée le 2026-09-28 (migration push_subscriptions)
--
-- Notifications Web Push (PWA) : un abonnement par appareil/navigateur.
-- Écrit par POST /api/push/subscribe (client serveur de l'utilisateur, soumis à la RLS),
-- lu et nettoyé (404/410) par le cron new-message-notifications via le client service-role.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_success_at timestamptz
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Users select own push subscriptions" on public.push_subscriptions;
create policy "Users select own push subscriptions"
  on public.push_subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users insert own push subscriptions" on public.push_subscriptions;
create policy "Users insert own push subscriptions"
  on public.push_subscriptions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own push subscriptions" on public.push_subscriptions;
create policy "Users delete own push subscriptions"
  on public.push_subscriptions for delete
  to authenticated
  using ((select auth.uid()) = user_id);
