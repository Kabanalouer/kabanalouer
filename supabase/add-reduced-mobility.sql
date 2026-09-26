-- « Accessible aux personnes à mobilité réduite » avec détails (2026-09-26).
-- accessibility_features : sous-ensemble fixe d'identifiants (voir
-- lib/accessibility.ts) ; vidé à la sauvegarde si reduced_mobility = false.

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS reduced_mobility       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accessibility_features text[]  NOT NULL DEFAULT '{}';

ALTER TABLE listings
  ADD CONSTRAINT listings_accessibility_features_check CHECK (
    accessibility_features <@ ARRAY[
      'step_free_entrance', 'wide_entrance_door', 'flat_threshold',
      'step_free_shower', 'grab_bars', 'turning_space',
      'ground_floor_living', 'bed_clearance', 'wide_hallways'
    ]::text[]
  );

-- Filtre de recherche et page /chalets/accessible-mobilite-reduite.
CREATE INDEX IF NOT EXISTS listings_reduced_mobility_published_idx
  ON listings (reduced_mobility)
  WHERE is_published = true AND reduced_mobility = true;
