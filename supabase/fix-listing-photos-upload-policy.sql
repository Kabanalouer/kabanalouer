-- Corrige la politique INSERT du bucket listing-photos : elle ne vérifiait
-- que bucket_id, jamais le dossier de destination — n'importe quel utilisateur
-- connecté pouvait uploader dans le dossier d'un autre proprio. Contrairement
-- à avatars-storage.sql et aux règles UPDATE/DELETE du même bucket, qui
-- vérifient déjà (storage.foldername(name))[1] = auth.uid()::text.
--
-- Exécuté et confirmé en production le 2026-09-04 (audit de sécurité).

DROP POLICY "Upload de photos (connecté)" ON storage.objects;

CREATE POLICY "Upload de photos (connecté)"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'listing-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
