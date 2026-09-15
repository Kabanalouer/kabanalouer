-- Complète la politique RLS admin déjà en place sur `listings`
-- (add-listings-admin-rls-policy.sql) — le même compromis accepté sciemment
-- à l'époque (voir ce fichier pour le contexte complet) n'avait pas été
-- étendu à `rooms`, alors que le formulaire d'édition d'annonce
-- (EditListingForm.tsx → RoomsSection.tsx) écrit aussi directement dans
-- cette table côté client.
--
-- Conséquence du trou : un admin qui révise une annonce importée (ex. un
-- import Airbnb en attente) et tente d'ajouter/modifier/supprimer une
-- chambre ou un salon se fait rejeter silencieusement par RLS (l'annonce
-- n'est pas la sienne) — confirmé le 2026-09-15 via les logs Postgres
-- ("new row violates row-level security policy for table \"rooms\"") et
-- reproduit directement en base (INSERT en tant qu'admin échoue, le même
-- INSERT en tant que vrai propriétaire de l'annonce réussit).
--
-- Additive : les règles existantes pour les propriétaires ("Hôte gère ses
-- rooms", "Hôte lit ses rooms") et la lecture publique des annonces publiées
-- ("Rooms lisibles pour listings publiés") restent intactes et inchangées.

CREATE POLICY "Les admins gèrent tous les rooms"
ON public.rooms
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);
