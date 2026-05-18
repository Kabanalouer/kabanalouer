-- Update listing-photos bucket: 2.5 MB limit + WebP support
-- (app-level limit is 2 MB; bucket gets 2.5 MB to give a small buffer)
UPDATE storage.buckets
SET
  file_size_limit  = 2621440,   -- 2.5 MB in bytes
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif'
  ]
WHERE id = 'listing-photos';
