-- Ajouter le type 'lastminute_amount' à la table promotions
-- À exécuter dans l'éditeur SQL de Supabase

ALTER TABLE public.promotions DROP CONSTRAINT IF EXISTS promotions_type_check;
ALTER TABLE public.promotions ADD CONSTRAINT promotions_type_check
  CHECK (type IN ('percent', 'amount', 'duration', 'lastminute', 'lastminute_amount'));
