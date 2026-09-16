-- Ajoute bio_en à la vue public_profiles pour l'affichage bilingue de la bio
-- proprio sur la fiche publique (HostCard.tsx). Voir create-public-profiles-view.sql
-- pour le contexte de sécurité original de cette vue (audit du 2026-09-04) —
-- toujours seulement des colonnes non sensibles, bio_en suit la même logique
-- que bio.
--
-- bio_en est ajoutée à la FIN de la liste de colonnes (après created_at), pas
-- entre bio et avatar_url — CREATE OR REPLACE VIEW ne permet d'ajouter des
-- colonnes qu'à la fin ; l'insérer au milieu décale le nom des colonnes
-- suivantes et Postgres l'interprète comme un renommage de colonne existante
-- (erreur 42P16, rencontrée lors d'une première tentative avec bio_en placé
-- après bio).

CREATE OR REPLACE VIEW public.public_profiles AS
SELECT id, name, bio, avatar_url, created_at, bio_en
FROM public.users;
