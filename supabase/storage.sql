-- ============================================================
-- KABANALOUER — Supabase Storage : bucket photos
-- Coller dans SQL Editor → Run (après le schema.sql initial)
-- ============================================================

-- Créer le bucket public pour les photos de chalets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-photos',
  'listing-photos',
  true,
  5242880,  -- 5 Mo max par fichier
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Permettre aux utilisateurs connectés d'uploader des photos
CREATE POLICY "Upload de photos (connecté)"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'listing-photos');

-- Lecture publique des photos
CREATE POLICY "Lecture publique des photos"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'listing-photos');

-- Mise à jour des propres photos
CREATE POLICY "Mise à jour de ses photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'listing-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Suppression des propres photos
CREATE POLICY "Suppression de ses photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'listing-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
