-- Textes des courriels modifiés dans Admin → Séquences courriel.
-- Une ligne par courriel et par langue ; absence de ligne = texte par défaut du code.
-- Exécutée en prod le 2026-10-08 (migration MCP add_email_templates).
create table if not exists public.email_templates (
  email_id text not null,
  lang text not null check (lang in ('fr', 'en')),
  subject text not null default '',
  greeting text not null default '',
  heading text not null default '',
  body text not null default '',
  button_label text not null default '',
  footer_note text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id) on delete set null,
  primary key (email_id, lang)
);

-- Lecture et écriture uniquement côté serveur (clé service) : RLS activée sans
-- aucune politique, donc aucun accès par les clés anon/authenticated.
alter table public.email_templates enable row level security;
