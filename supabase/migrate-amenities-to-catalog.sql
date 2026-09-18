-- Convertit listings.amenities d'un tableau de chaînes françaises (ancien
-- format, lib/amenities.ts, 30 valeurs) vers un tableau d'objets
-- { id, details } (nouveau format, lib/amenities-catalog.ts) — étape 1 de
-- l'enrichissement de la section Caractéristiques (catégories + détails par
-- équipement, façon Airbnb).
--
-- ⚠️ NE PAS EXÉCUTER avant que l'étape 2 (nouvelle UI Caractéristiques,
-- AmenitiesPicker/EditListingForm/AmenitiesSection/filtres publics) soit
-- prête à lire ce nouveau format — tant que ce n'est pas fait, ces
-- composants attendent encore un tableau de chaînes et casseraient sur des
-- objets. Idempotent : une ligne déjà au nouveau format (tableau d'objets)
-- est ignorée si cette migration est relancée par erreur.

-- Nécessaire seulement pour le filet de sécurité ci-dessous (valeur qui ne
-- correspondrait à aucun id du nouveau catalogue) — extension standard,
-- déjà courante sur Supabase.
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Correspondance ancien libellé FR -> nouvel id + détails initiaux. "Piscine
-- intérieure" et "Piscine extérieure" convergent toutes les deux vers l'id
-- unique "piscine" (voir lib/amenities-catalog.ts), avec le sous-détail
-- "emplacement" qui les distingue à nouveau après coup.
WITH mapping(old_label, new_id, new_details) AS (
  VALUES
    ('Bord de l''eau', 'bord-eau', '{}'::jsonb),
    ('Piscine intérieure', 'piscine', '{"emplacement": "Intérieure"}'::jsonb),
    ('Spa', 'spa', '{}'::jsonb),
    ('Sauna', 'sauna', '{}'::jsonb),
    ('Ski in / Ski out', 'ski-in-ski-out', '{}'::jsonb),
    ('Table de billard', 'table-billard', '{}'::jsonb),
    ('Chalet en bois rond', 'chalet-bois-rond', '{}'::jsonb),
    ('Foyer intérieur au bois', 'foyer-interieur-bois', '{}'::jsonb),
    ('Gym', 'gym', '{}'::jsonb),
    ('Foyer extérieur (firepit)', 'foyer-exterieur', '{}'::jsonb),
    ('Piscine extérieure', 'piscine', '{"emplacement": "Extérieure"}'::jsonb),
    ('Module de jeux pour enfant', 'module-jeux-enfant', '{}'::jsonb),
    ('Borne de recharge pour véhicule électrique', 'borne-recharge-vr', '{}'::jsonb),
    ('BBQ', 'bbq', '{}'::jsonb),
    ('Babyfoot', 'babyfoot', '{}'::jsonb),
    ('Table de ping-pong', 'table-ping-pong', '{}'::jsonb),
    ('Arcades', 'arcades', '{}'::jsonb),
    ('Terrasse', 'terrasse', '{}'::jsonb),
    ('Jeux de société', 'jeux-societe', '{}'::jsonb),
    ('Situé sur un resort', 'situe-resort', '{}'::jsonb),
    ('Livres et Revues', 'livres-revues', '{}'::jsonb),
    ('Wifi', 'wifi', '{}'::jsonb),
    ('Espace de travail dédié (télétravail)', 'espace-travail', '{}'::jsonb),
    ('Climatisation', 'climatisation', '{}'::jsonb),
    ('Télévision avec câble', 'tv-cable', '{}'::jsonb),
    ('Télévision intelligente', 'tv-intelligente', '{}'::jsonb),
    ('Système audio (musique)', 'systeme-audio', '{}'::jsonb),
    ('Cuisine complète avec vaisselle et chaudrons', 'cuisine-complete', '{}'::jsonb),
    ('Literie et serviettes incluses', 'literie-serviettes', '{}'::jsonb),
    ('Buanderie', 'buanderie', '{}'::jsonb)
)
UPDATE public.listings
SET amenities = (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', COALESCE(
          mapping.new_id,
          -- Filet de sécurité : aucune ancienne valeur connue ne devrait
          -- tomber ici (les 30 de lib/amenities.ts sont toutes couvertes
          -- ci-dessus), mais une valeur imprévue (import externe, donnée
          -- corrompue) devient un id généré plutôt que d'être perdue.
          trim(both '-' from regexp_replace(lower(unaccent(old_amenity)), '[^a-z0-9]+', '-', 'g'))
        ),
        'details', COALESCE(mapping.new_details, '{}'::jsonb)
      )
    ),
    '[]'::jsonb
  )
  FROM jsonb_array_elements_text(listings.amenities) AS old_amenity
  LEFT JOIN mapping ON mapping.old_label = old_amenity
)
WHERE amenities IS NOT NULL
  AND jsonb_typeof(amenities) = 'array'
  AND (
    jsonb_array_length(amenities) = 0
    OR jsonb_typeof(amenities -> 0) = 'string'
  );
