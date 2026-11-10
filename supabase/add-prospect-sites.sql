-- Sites de propriétaires à contacter (Admin → Prospects) — migration ADDITIVE.
-- Annulation : add-prospect-sites_rollback.sql.
--
-- Une ligne par site de propriétaire repéré sur le web. Le bouton « Créer brouillon / invitation » de l'admin met la
-- ligne en file d'attente (status « a_creer ») ; la création des fiches en brouillon et de la note d'invitation se fait
-- ensuite à la main, puis la ligne passe à « brouillons_crees » (et « invitation_envoyee » après l'envoi).
-- Table réservée au serveur : RLS activée sans aucune politique, aucun GRANT (jamais lisible avec la clé anon
-- ni une session).

BEGIN;

CREATE TABLE IF NOT EXISTS public.prospect_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text,
  site_url text,
  category text,
  region text,
  is_manager boolean NOT NULL DEFAULT false,
  listings_seen integer,
  sample_url text,
  note text,
  status text NOT NULL DEFAULT 'nouveau',
  requested_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prospect_sites_status_valid CHECK (status IN ('nouveau', 'a_creer', 'brouillons_crees', 'invitation_envoyee', 'ignore')),
  CONSTRAINT prospect_sites_domain_lower CHECK (domain IS NULL OR domain = lower(domain)),
  CONSTRAINT prospect_sites_name_len CHECK (char_length(name) BETWEEN 1 AND 200),
  CONSTRAINT prospect_sites_note_len CHECK (note IS NULL OR char_length(note) <= 1000)
);

CREATE UNIQUE INDEX IF NOT EXISTS prospect_sites_domain_key ON public.prospect_sites (domain) WHERE domain IS NOT NULL;

ALTER TABLE public.prospect_sites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.prospect_sites FROM anon, authenticated;

COMMIT;
