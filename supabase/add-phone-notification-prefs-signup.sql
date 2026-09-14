-- Ajoute la collecte du numéro de cellulaire (optionnel) et des préférences
-- de notification (courriel/texto) à l'inscription.
--
-- `phone` existe déjà sur public.users (utilisé dans le profil dashboard) —
-- on réutilise cette même colonne plutôt que d'en créer une nouvelle, pour
-- ne jamais avoir deux numéros différents pour un même utilisateur.
--
-- notify_email/notify_sms sont de nouvelles colonnes dédiées aux préférences
-- de CANAL de notification (est-ce qu'on a le droit de contacter cet
-- utilisateur par courriel / par texto), distinctes de `notifications_prefs`
-- (jsonb) qui gère déjà des préférences de CONTENU (messages, favoris,
-- rapport mensuel). Les deux dimensions sont indépendantes.
--
-- Aucune logique d'envoi de SMS n'est ajoutée ici — seulement la collecte
-- de la donnée, pour une phase ultérieure.
--
-- Run in Supabase Dashboard → SQL Editor.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS notify_email BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_sms BOOLEAN NOT NULL DEFAULT true;

-- Reprend handle_new_user() en entier (comme fix-handle-new-user-preferred-language.sql
-- l'a fait avant), pour que CREATE OR REPLACE FUNCTION reste la seule source
-- de vérité peu importe la version live en base. Seul ajout : `phone`, lu
-- depuis les métadonnées d'inscription si fourni (NULL sinon — SignupForm.tsx
-- envoie phone: null quand le champ est vide). notify_email/notify_sms ne
-- sont volontairement pas dans cet INSERT : leur défaut de colonne (true)
-- s'applique automatiquement, aucune logique applicative requise.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, avatar_url, preferred_language, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      TRIM(
        COALESCE(NEW.raw_user_meta_data->>'first_name', '') || ' ' ||
        COALESCE(NEW.raw_user_meta_data->>'last_name', '')
      ),
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(NEW.raw_user_meta_data->>'role', 'traveler'),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'fr'),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
