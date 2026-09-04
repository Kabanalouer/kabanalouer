-- Vue publique exposant uniquement les colonnes non sensibles de public.users
-- (id, name, bio, avatar_url, created_at) — jamais email, phone, role,
-- stripe_customer_id, free_launch_claimed_at, etc. Contourne intentionnellement
-- la RLS de public.users (comportement par défaut d'une vue : elle s'exécute
-- avec les privilèges de son propriétaire, qui possède aussi la table) —
-- c'est voulu, remplace la politique "Lecture publique des profils" retirée
-- de public.users (voir fix-users-public-select-policy.sql).
--
-- Utilisée par la fiche publique d'un chalet (nom/bio/avatar du proprio) et
-- par l'affichage des auteurs d'avis (voyageurs), sans restriction de ligne —
-- tout le monde peut y lire n'importe quel profil, seulement ces 5 colonnes.
--
-- Exécuté et confirmé en production le 2026-09-04 (audit de sécurité).

CREATE VIEW public.public_profiles AS
SELECT id, name, bio, avatar_url, created_at
FROM public.users;

GRANT SELECT ON public.public_profiles TO anon, authenticated;
