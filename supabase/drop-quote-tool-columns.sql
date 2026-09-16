-- Retire les 3 colonnes de l'ancienne section "Devis" du dashboard
-- (ajoutées par add-quote-tool-columns.sql) — le futur message de devis
-- structuré dans la messagerie ne dépendra plus que du prix (voir
-- lib/quoteMessage.ts, app/api/messages/quote/route.ts). Aucune annonce
-- réelle en production au moment de cette migration — uniquement des
-- données de test, donc aucune perte de données réelle.
--
-- Ne touche pas à messages.check_in/check_out/num_guests/quote_data —
-- toujours utilisés par le flux de devis (prix + dates + nombre de
-- voyageurs).

ALTER TABLE public.listings
  DROP COLUMN IF EXISTS quote_inclusions,
  DROP COLUMN IF EXISTS quote_exclusions,
  DROP COLUMN IF EXISTS quote_booking_instructions;
