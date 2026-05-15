-- ============================================================
-- KABANALOUER — Migration disponibilités
-- Coller dans SQL Editor → Run
-- ============================================================

-- Distinguer les blocages manuels des imports iCal
ALTER TABLE public.availability
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual'
  CHECK (source IN ('manual', 'ical'));

-- URL iCal externe et timestamp de la dernière synchro
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS ical_url TEXT,
  ADD COLUMN IF NOT EXISTS ical_last_sync TIMESTAMPTZ;

-- Index pour accélérer les requêtes de filtrage par date
CREATE INDEX IF NOT EXISTS idx_availability_date_blocked
  ON public.availability(listing_id, date, is_blocked);
