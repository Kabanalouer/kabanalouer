-- Durcissement sécurité (audit du 2026-10-08). Les sessions des visiteurs
-- (rôles anon / authenticated de l'API publique Supabase) ne peuvent plus :
-- se donner un rôle, changer leur courriel ou client Stripe, publier une
-- annonce sans abonnement actif, s'ajouter une vedette, insérer un message
-- directement ni réécrire un message reçu. Le serveur (service_role) et les
-- requêtes SQL directes ne sont pas concernés.

-- 1. Inscription : seuls 'host' et 'traveler' sont acceptés depuis les métadonnées
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
    CASE WHEN NEW.raw_user_meta_data->>'role' = 'host' THEN 'host' ELSE 'traveler' END,
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'fr'),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

-- 2. users : colonnes sensibles protégées. Seul changement de rôle permis à
-- l'utilisateur lui-même : voyageur → proprio (inscription Google, bouton
-- « Devenir proprio »).
CREATE OR REPLACE FUNCTION public.protect_users_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF coalesce(auth.role(), '') IN ('anon', 'authenticated') THEN
    IF NEW.role IS DISTINCT FROM OLD.role AND NOT (OLD.role = 'traveler' AND NEW.role = 'host') THEN
      RAISE EXCEPTION 'Changement de rôle non autorisé' USING ERRCODE = '42501';
    END IF;
    IF NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
       OR NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'Modification non autorisée' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_users_sensitive_columns ON public.users;
CREATE TRIGGER protect_users_sensitive_columns
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.protect_users_sensitive_columns();

-- Une ligne users n'est créée que par handle_new_user (service) : plus
-- d'insertion depuis l'API publique (elle aurait pu fixer role = 'admin'
-- si la ligne n'existait pas encore).
DROP POLICY IF EXISTS "Insertion lors de l'inscription" ON public.users;

-- 3. listings : publication seulement avec un abonnement actif
CREATE OR REPLACE FUNCTION public.protect_listing_publication()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(auth.role(), '') IN ('anon', 'authenticated')
     AND NEW.is_published = true
     AND (TG_OP = 'INSERT' OR OLD.is_published IS DISTINCT FROM true)
     AND NOT EXISTS (
       SELECT 1 FROM subscriptions s
       WHERE s.listing_id = NEW.id AND s.status = 'active'
         AND (s.expires_at IS NULL OR s.expires_at > now())
     ) THEN
    RAISE EXCEPTION 'Un abonnement actif est requis pour publier' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.protect_listing_publication() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS protect_listing_publication ON public.listings;
CREATE TRIGGER protect_listing_publication
  BEFORE INSERT OR UPDATE OF is_published ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.protect_listing_publication();

-- 4. featured_listings : lecture publique seulement (écriture : webhook Stripe, admin)
DROP POLICY IF EXISTS "Proprio gère ses vedettes" ON public.featured_listings;

-- 5. messages : envoi uniquement par /api/messages (validation + limites) ;
-- le destinataire ne peut modifier que l'indicateur « lu »
DROP POLICY IF EXISTS "Les utilisateurs envoient des messages" ON public.messages;
REVOKE INSERT, UPDATE ON public.messages FROM anon, authenticated;
GRANT UPDATE (is_read) ON public.messages TO authenticated;
