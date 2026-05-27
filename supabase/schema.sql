-- ============================================================
-- KABANALOUER — Schéma de base de données Supabase
-- Projet : kabanalouer-v2
-- Coller dans : SQL Editor → New query → Run
-- ============================================================


-- ── EXTENSIONS ───────────────────────────────────────────
-- Génération d'UUIDs (activé par défaut sur Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ── TABLE : users ─────────────────────────────────────────
-- Profil public lié à auth.users (créé automatiquement via trigger)

CREATE TABLE public.users (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('host', 'traveler')) DEFAULT 'traveler',
  name        TEXT,
  phone       TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture publique des profils"
  ON public.users FOR SELECT USING (true);

CREATE POLICY "Modification de son propre profil"
  ON public.users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Insertion de son propre profil"
  ON public.users FOR INSERT WITH CHECK (auth.uid() = id);


-- ── TABLE : subscriptions ────────────────────────────────
-- Abonnements Stripe des hôtes (299$/an)

CREATE TABLE public.subscriptions (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                 UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  stripe_subscription_id  TEXT UNIQUE,
  stripe_customer_id      TEXT,
  status                  TEXT NOT NULL DEFAULT 'inactive'
                            CHECK (status IN ('active', 'inactive', 'past_due', 'canceled', 'trialing')),
  expires_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture de son propre abonnement"
  ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);


-- ── TABLE : listings ──────────────────────────────────────
-- Fiches de chalets créées par les hôtes

CREATE TABLE public.listings (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id      UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title        TEXT NOT NULL DEFAULT '',
  description  TEXT NOT NULL DEFAULT '',
  region       TEXT NOT NULL DEFAULT '',
  address      TEXT DEFAULT '',
  capacity     INTEGER NOT NULL DEFAULT 2 CHECK (capacity > 0),
  bedrooms     INTEGER NOT NULL DEFAULT 1 CHECK (bedrooms > 0),
  bathrooms    INTEGER NOT NULL DEFAULT 1 CHECK (bathrooms > 0),
  price_low    INTEGER NOT NULL DEFAULT 0 CHECK (price_low >= 0),   -- saison basse ($/nuit)
  price_high   INTEGER NOT NULL DEFAULT 0 CHECK (price_high >= 0),  -- saison haute ($/nuit)
  price_peak   INTEGER NOT NULL DEFAULT 0 CHECK (price_peak >= 0),  -- fêtes/vacances ($/nuit)
  amenities    JSONB DEFAULT '[]',   -- ex: ["Spa", "Foyer", "Piscine", "Ski"]
  photos       JSONB DEFAULT '[]',   -- ex: ["url1", "url2", ...]
  is_published BOOLEAN DEFAULT FALSE,
  score        INTEGER DEFAULT 0 CHECK (score BETWEEN 0 AND 100),   -- score qualité IA
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture des chalets publiés"
  ON public.listings FOR SELECT USING (is_published = true);

CREATE POLICY "Hôte voit ses propres chalets (publiés ou non)"
  ON public.listings FOR SELECT USING (auth.uid() = host_id);

CREATE POLICY "Hôte crée ses chalets"
  ON public.listings FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hôte modifie ses chalets"
  ON public.listings FOR UPDATE USING (auth.uid() = host_id);

CREATE POLICY "Hôte supprime ses chalets"
  ON public.listings FOR DELETE USING (auth.uid() = host_id);

CREATE INDEX idx_listings_host_id     ON public.listings(host_id);
CREATE INDEX idx_listings_region      ON public.listings(region);
CREATE INDEX idx_listings_is_published ON public.listings(is_published);
CREATE INDEX idx_listings_region_published ON public.listings(region, is_published);


-- ── TABLE : availability ──────────────────────────────────
-- Dates bloquées/disponibles pour chaque chalet

CREATE TABLE public.availability (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id  UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  date        DATE NOT NULL,
  is_blocked  BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(listing_id, date)
);

ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture publique des disponibilités"
  ON public.availability FOR SELECT USING (true);

CREATE POLICY "Hôte gère les disponibilités de ses chalets"
  ON public.availability FOR ALL USING (
    auth.uid() = (SELECT host_id FROM public.listings WHERE id = listing_id)
  );

CREATE INDEX idx_availability_listing_date ON public.availability(listing_id, date);


-- ── TABLE : messages ──────────────────────────────────────
-- Messagerie interne entre voyageurs et hôtes

CREATE TABLE public.messages (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id   UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  sender_id    UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id  UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content      TEXT NOT NULL CHECK (length(content) > 0),
  is_read      BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture de ses propres messages"
  ON public.messages FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
  );

CREATE POLICY "Envoi de message (utilisateur connecté)"
  ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Marquer ses messages comme lus"
  ON public.messages FOR UPDATE USING (auth.uid() = receiver_id);

CREATE INDEX idx_messages_sender   ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX idx_messages_listing  ON public.messages(listing_id);
CREATE INDEX idx_messages_conversation ON public.messages(listing_id, sender_id, receiver_id);


-- ── TABLE : reviews ───────────────────────────────────────
-- Avis laissés par les voyageurs (un seul par chalet par utilisateur)

CREATE TABLE public.reviews (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id  UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  author_id   UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  host_reply  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(listing_id, author_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture publique des avis"
  ON public.reviews FOR SELECT USING (true);

CREATE POLICY "Écriture d'un avis (utilisateur connecté)"
  ON public.reviews FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Modification de son propre avis"
  ON public.reviews FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Suppression de son propre avis"
  ON public.reviews FOR DELETE USING (auth.uid() = author_id);

CREATE INDEX idx_reviews_listing_id ON public.reviews(listing_id);
CREATE INDEX idx_reviews_author_id  ON public.reviews(author_id);


-- ── TABLE : favorites ─────────────────────────────────────
-- Chalets mis en favoris par les voyageurs

CREATE TABLE public.favorites (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  listing_id  UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture de ses propres favoris"
  ON public.favorites FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Ajout d'un favori"
  ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Suppression d'un favori"
  ON public.favorites FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_favorites_user_id    ON public.favorites(user_id);
CREATE INDEX idx_favorites_listing_id ON public.favorites(listing_id);


-- ── TRIGGER : mise à jour automatique de updated_at ───────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER listings_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ── TRIGGER : création automatique du profil utilisateur ──
-- S'exécute à chaque nouvel utilisateur (email ou Google OAuth)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(NEW.raw_user_meta_data->>'role', 'traveler'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── VUE : listings avec note moyenne ─────────────────────
-- Pratique pour afficher les chalets avec leur note sans jointure manuelle

CREATE OR REPLACE VIEW public.listings_with_rating AS
SELECT
  l.*,
  u.name    AS host_name,
  u.avatar_url AS host_avatar,
  ROUND(AVG(r.rating), 1) AS avg_rating,
  COUNT(r.id)::INTEGER    AS review_count
FROM public.listings l
LEFT JOIN public.users   u ON u.id = l.host_id
LEFT JOIN public.reviews r ON r.listing_id = l.id
WHERE l.is_published = true
GROUP BY l.id, u.name, u.avatar_url;
