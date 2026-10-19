-- Journal des demandes de prix envoyées sans compte visible (POST /api/messages/guest).
-- Sert seulement aux plafonds anti-abus (par adresse IP et par courriel) : l'IP n'est jamais
-- gardée en clair, seulement son empreinte. Serveur seulement : RLS sans politique.
-- Migration ADDITIVE. Annulation : add-guest-request-log_rollback.sql.

BEGIN;

CREATE TABLE IF NOT EXISTS public.guest_request_log (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip_hash     text NOT NULL,
  email       text NOT NULL,
  listing_id  uuid REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS guest_request_log_ip_idx ON public.guest_request_log (ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS guest_request_log_email_idx ON public.guest_request_log (email, created_at DESC);

ALTER TABLE public.guest_request_log ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';

COMMIT;
