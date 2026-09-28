-- Appliquée le 2026-09-28 (migration reviews_add_translation_columns).
-- Traduction automatique FR⇆EN des avis et des réponses des proprios
-- (lib/googleTranslate.ts detectAndTranslate, rattrapage par le cron
-- translate-listings).
ALTER TABLE public.reviews
  ADD COLUMN comment_lang text CHECK (comment_lang IN ('fr','en')),
  ADD COLUMN comment_translated text,
  ADD COLUMN host_reply_lang text CHECK (host_reply_lang IN ('fr','en')),
  ADD COLUMN host_reply_translated text;
