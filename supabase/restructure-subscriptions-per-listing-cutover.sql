-- Étape 4/10 de la restructuration "abonnement par annonce" — cutover
-- structurel. Prérequis : étape 1 (colonnes additives) et étape 3
-- (backfill) déjà exécutées avec succès.
--
-- Vérification recommandée avant d'exécuter (doit retourner 0) :
--   SELECT count(*) FROM public.subscriptions WHERE listing_id IS NULL;
--
-- Run in Supabase Dashboard → SQL Editor.

-- Retire l'ancienne contrainte : un user_id ne pouvait avoir qu'un seul abonnement.
ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_user_id_key;

-- listing_id devient obligatoire pour toute nouvelle ligne — échoue si une ligne
-- existante a encore listing_id NULL (donc si le backfill de l'étape 3 est incomplet).
ALTER TABLE public.subscriptions ALTER COLUMN listing_id SET NOT NULL;

-- Nouvelle contrainte : chaque annonce ne peut avoir qu'un seul abonnement.
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_listing_id_key UNIQUE (listing_id);
