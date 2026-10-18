-- File d'import automatique et invitations à revendiquer — migration ADDITIVE
-- (deux tables). Annulation : add-import-queue-and-invitations_rollback.sql.
-- Les deux tables sont réservées au serveur (RLS activée, aucune politique).

BEGIN;

-- File d'import : une tâche planifiée y dépose les fiches à importer (une ligne par
-- adresse d'origine), un cron serveur en fait des fiches non revendiquées.
-- attempts : une erreur passagère (photo qui ne se télécharge pas) est retentée,
-- après 3 essais la ligne passe à 'rejected' avec son erreur.
CREATE TABLE IF NOT EXISTS public.listing_import_queue (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_source     text NOT NULL,
  import_source_url text NOT NULL UNIQUE,
  payload           jsonb NOT NULL,
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'imported', 'rejected')),
  error             text,
  attempts          integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  imported_at       timestamptz,
  listing_id        uuid REFERENCES public.listings(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS listing_import_queue_status_idx
  ON public.listing_import_queue (status, created_at);

-- Invitations à revendiquer, envoyées depuis /admin/invitations. Une seule invitation
-- et une seule relance par adresse (clé unique) : deux clics simultanés n'envoient
-- qu'un courriel. opened_at (pixel d'ouverture, indicatif : certains clients
-- préchargent les images) et claimed_at (revendication) alimentent les résultats.
CREATE TABLE IF NOT EXISTS public.listing_invitations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_email text NOT NULL CHECK (claim_email = lower(btrim(claim_email))),
  kind        text NOT NULL CHECK (kind IN ('invite', 'reminder')),
  listing_ids uuid[] NOT NULL,
  track_token text NOT NULL UNIQUE,
  sent_at     timestamptz NOT NULL DEFAULT now(),
  opened_at   timestamptz,
  claimed_at  timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS listing_invitations_one_per_email_kind
  ON public.listing_invitations (claim_email, kind);

ALTER TABLE public.listing_import_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_invitations  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.listing_import_queue FROM anon, authenticated;
REVOKE ALL ON public.listing_invitations  FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
