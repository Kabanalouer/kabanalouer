-- Le trigger handle_new_user() n'insérait jamais preferred_language, même si
-- app/(auth)/signup/page.tsx l'envoie dans les métadonnées à l'inscription.
-- Résultat : les comptes créés par email/mot de passe restaient bloqués sur
-- la valeur par défaut ('fr') de la colonne, peu importe la langue choisie.
-- (Le flux Google OAuth n'est pas affecté : app/auth/callback/route.ts fait
-- déjà un UPDATE preferred_language après coup.)
--
-- Cette version reprend aussi la logique first_name/last_name de
-- fix-handle-new-user-role.sql, pour que CREATE OR REPLACE FUNCTION
-- redevienne la seule source de vérité peu importe la version live en base.
--
-- Run in Supabase Dashboard → SQL Editor.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, avatar_url, preferred_language)
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
    COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'fr')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
