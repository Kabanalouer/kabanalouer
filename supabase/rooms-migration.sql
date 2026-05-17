-- Migration: table rooms
-- À exécuter dans Supabase SQL Editor

CREATE TABLE IF NOT EXISTS rooms (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id   uuid        NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  type         text        NOT NULL CHECK (type IN ('bedroom', 'living_room')),
  name         text        NOT NULL DEFAULT '',
  capacity     integer     NOT NULL DEFAULT 1,
  beds         jsonb       NOT NULL DEFAULT '[]',
  photos       jsonb       NOT NULL DEFAULT '[]',
  sort_order   integer     NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rooms_listing_id_idx ON rooms(listing_id);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Lecture publique pour les listings publiés
CREATE POLICY "Rooms lisibles pour listings publiés" ON rooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = rooms.listing_id
        AND listings.is_published = true
    )
  );

-- Hôte : lecture de ses propres rooms (même brouillon)
CREATE POLICY "Hôte lit ses rooms" ON rooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = rooms.listing_id
        AND listings.host_id = auth.uid()
    )
  );

-- Hôte : écriture sur ses propres listings
CREATE POLICY "Hôte gère ses rooms" ON rooms
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = rooms.listing_id
        AND listings.host_id = auth.uid()
    )
  );
