-- Run this in the Supabase SQL editor to create the promotions table.

CREATE TABLE public.promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('percent', 'amount', 'duration', 'lastminute')),
  value INTEGER NOT NULL,
  min_nights INTEGER,
  days_before INTEGER,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Proprio gère ses promos" ON public.promotions
  USING (listing_id IN (SELECT id FROM public.listings WHERE host_id = auth.uid()))
  WITH CHECK (listing_id IN (SELECT id FROM public.listings WHERE host_id = auth.uid()));

CREATE POLICY "Lecture publique des promos actives" ON public.promotions
  FOR SELECT USING (is_active = true);
