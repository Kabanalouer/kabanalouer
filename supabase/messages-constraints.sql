-- Contrainte longueur sur les messages directs (5000 chars max)
-- NOT VALID = s'applique aux nouvelles lignes uniquement, pas aux données existantes
ALTER TABLE public.messages
  ADD CONSTRAINT messages_content_max_length
  CHECK (char_length(content) <= 5000) NOT VALID;
