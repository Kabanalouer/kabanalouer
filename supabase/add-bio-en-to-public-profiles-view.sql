-- Ajoute bio_en à la vue public_profiles pour l'affichage bilingue de la bio
-- proprio sur la fiche publique (HostCard.tsx). Voir create-public-profiles-view.sql
-- pour le contexte de sécurité original de cette vue (audit du 2026-09-04) —
-- toujours seulement des colonnes non sensibles, bio_en suit la même logique
-- que bio.

CREATE OR REPLACE VIEW public.public_profiles AS
SELECT id, name, bio, bio_en, avatar_url, created_at
FROM public.users;
