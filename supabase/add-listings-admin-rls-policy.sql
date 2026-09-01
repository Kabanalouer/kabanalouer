-- Première politique RLS "admin" de ce projet — partout ailleurs (abonnements,
-- proprios, panneau annonces), l'admin agit toujours via le client
-- service-role côté serveur, jamais via une session RLS élargie.
--
-- Exception faite ici sciemment : le formulaire d'édition d'annonce
-- (EditListingForm.tsx et ses sous-composants — photos, chambres, promotions,
-- calendrier, iCal) fait de nombreuses écritures Supabase DIRECTES côté
-- client, pas via une route API centralisée. Router chacune de ces écritures
-- vers une nouvelle API service-role aurait été un chantier disproportionné
-- pour débloquer la révision des annonces importées. Compromis de rapidité de
-- développement accepté en connaissance de cause — une politique RLS élève
-- les permissions au niveau de LA SESSION admin entière sur toute la table,
-- pas d'une route précise et auditable : si le formulaire d'édition gagnait un
-- jour une faille (ex. un host_id arbitraire injectable côté client), un
-- compte admin serait exposé plus largement que le pattern service-role
-- habituel ne l'aurait permis. À réévaluer si le panneau admin se complexifie.
--
-- Additive : la règle existante pour les proprios ("Les hôtes gèrent leurs
-- listings") reste intacte et inchangée, aucun risque pour eux.

CREATE POLICY "Les admins gèrent tous les listings"
ON public.listings
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
