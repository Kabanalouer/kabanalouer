-- Annulation de add-unclaimed-rank.sql. Le code qui trie par unclaimed_rank
-- doit être retiré avant (sinon les recherches échouent).

BEGIN;

ALTER TABLE public.listings DROP COLUMN IF EXISTS unclaimed_rank;

NOTIFY pgrst, 'reload schema';

COMMIT;
