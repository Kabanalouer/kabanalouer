-- Restreindre le bucket "avatars" aux types image uniquement
-- (comme le bucket "listing-photos")
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif'
]
WHERE id = 'avatars';
