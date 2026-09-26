-- « Animaux acceptés » devient « Chiens acceptés », avec des détails (2026-09-26).
-- Cutover propre : pets_allowed est renommée (une seule annonce test en base).
-- Les détails ne sont remplis que si dogs_allowed = true (sinon NULL).

ALTER TABLE listings RENAME COLUMN pets_allowed TO dogs_allowed;

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS dogs_max        smallint,
  ADD COLUMN IF NOT EXISTS dogs_size_limit text,
  ADD COLUMN IF NOT EXISTS dogs_fee_type   text,
  ADD COLUMN IF NOT EXISTS dogs_fee_amount integer;

ALTER TABLE listings
  ADD CONSTRAINT listings_dogs_max_check        CHECK (dogs_max BETWEEN 1 AND 5),
  ADD CONSTRAINT listings_dogs_size_limit_check CHECK (dogs_size_limit IN ('small', 'medium', 'all')),
  ADD CONSTRAINT listings_dogs_fee_type_check   CHECK (dogs_fee_type IN ('free', 'per_night', 'per_stay')),
  ADD CONSTRAINT listings_dogs_fee_amount_check CHECK (dogs_fee_amount > 0 AND dogs_fee_amount <= 10000);

-- Filtre « Chiens acceptés » de la recherche et page /chalets/chiens-acceptes.
CREATE INDEX IF NOT EXISTS listings_dogs_allowed_published_idx
  ON listings (dogs_allowed)
  WHERE is_published = true AND dogs_allowed = true;

-- L'annonce test acceptait déjà les animaux : détails par défaut pour
-- qu'elle reste cohérente (à ajuster ensuite dans le dashboard).
UPDATE listings
SET dogs_max = 2, dogs_size_limit = 'all', dogs_fee_type = 'free'
WHERE dogs_allowed = true AND dogs_max IS NULL;
