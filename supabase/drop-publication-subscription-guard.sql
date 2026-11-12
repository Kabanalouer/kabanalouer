-- Le site est toujours gratuit (2026-11-02) : publier ne demande plus d'abonnement actif.
-- Ce déclencheur (security-hardening-2026-10-08.sql, section 3) refusait pourtant toute mise
-- en ligne faite avec la session du proprio sans ligne `subscriptions` active : l'API
-- /api/listings/[id]/publish répondait 500 « Un abonnement actif est requis pour publier ».
-- Les mises en ligne par le serveur (service_role) n'étaient pas touchées.
DROP TRIGGER IF EXISTS protect_listing_publication ON public.listings;
DROP FUNCTION IF EXISTS public.protect_listing_publication();
