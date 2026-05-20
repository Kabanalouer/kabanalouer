-- Table pour les messages du formulaire de contact
CREATE TABLE IF NOT EXISTS contact_messages (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text        NOT NULL,
  email      text        NOT NULL,
  subject    text        NOT NULL,
  message    text        NOT NULL,
  is_read    boolean     DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Index pour faciliter la récupération des messages non lus
CREATE INDEX IF NOT EXISTS contact_messages_is_read_idx
  ON contact_messages (is_read, created_at DESC);

-- RLS : désactivé côté public (table interne admin uniquement)
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Aucun accès depuis le client public (insertion via service role key)
