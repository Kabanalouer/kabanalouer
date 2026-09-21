-- Système de facturation : table invoices + compteur séquentiel sans trou.
-- À exécuter manuellement dans Supabase Dashboard → SQL Editor.
-- NON EXÉCUTÉ AUTOMATIQUEMENT — en attente d'approbation (voir conversation).

-- ── Compteur séquentiel par année ─────────────────────────────────────────
create table if not exists invoice_counters (
  year integer primary key,
  next_number integer not null default 1
);

-- Incrémentation atomique et sans trou : un seul UPDATE ... RETURNING prend
-- un verrou de ligne exclusif sur invoice_counters pendant la durée de la
-- transaction appelante — deux appels concurrents pour la même année se
-- sérialisent automatiquement (le second attend que le premier commit),
-- jamais de doublon ni de trou même sous forte concurrence. Pas besoin d'un
-- SELECT ... FOR UPDATE séparé : l'UPDATE porte déjà le même verrou.
create or replace function get_next_invoice_number(p_year integer)
returns integer
language plpgsql
as $$
declare
  v_number integer;
begin
  insert into invoice_counters (year, next_number)
  values (p_year, 1)
  on conflict (year) do nothing;

  update invoice_counters
  set next_number = next_number + 1
  where year = p_year
  returning next_number - 1 into v_number;

  return v_number;
end;
$$;

-- ── Table des factures ─────────────────────────────────────────────────────
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  year integer not null,
  sequence_number integer not null,
  user_id uuid not null references users(id),
  listing_id uuid references listings(id),
  transaction_type text not null check (transaction_type in ('publication', 'boost_accueil', 'boost_region')),
  transaction_date timestamptz not null default now(),
  amount_before_tax numeric(10,2) not null,
  tps_amount numeric(10,2) not null,
  tvq_amount numeric(10,2) not null,
  total_amount numeric(10,2) not null,
  stripe_payment_id text,
  created_at timestamptz not null default now(),
  unique (year, sequence_number)
);

create index if not exists idx_invoices_user_id on invoices(user_id);
create index if not exists idx_invoices_year on invoices(year);

alter table invoices enable row level security;

-- Un proprio voit uniquement ses propres factures ("Mes factures").
create policy "Les proprios voient leurs propres factures"
  on invoices for select
  using (auth.uid() = user_id);

-- Admin : même modèle que les politiques admin déjà en place sur listings/rooms.
create policy "Les admins voient toutes les factures"
  on invoices for select
  using (exists (
    select 1 from users where users.id = auth.uid() and users.role = 'admin'
  ));

-- Aucune politique INSERT/UPDATE/DELETE pour les utilisateurs authentifiés —
-- les factures ne sont jamais créées/modifiées côté client, uniquement par
-- le webhook Stripe via le client service-role (bypass RLS).
