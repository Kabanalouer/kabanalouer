-- Run this in the Supabase SQL editor to create the featured_listings table.

CREATE TABLE public.featured_listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('home', 'region')),
  region TEXT,
  month DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.featured_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Proprio gère ses vedettes" ON public.featured_listings
  USING (listing_id IN (SELECT id FROM public.listings WHERE host_id = auth.uid()))
  WITH CHECK (listing_id IN (SELECT id FROM public.listings WHERE host_id = auth.uid()));

CREATE POLICY "Lecture publique des vedettes" ON public.featured_listings
  FOR SELECT USING (true);
