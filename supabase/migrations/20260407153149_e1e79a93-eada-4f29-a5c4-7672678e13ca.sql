
-- Create product_events table
CREATE TABLE public.product_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  price NUMERIC DEFAULT 0,
  category TEXT,
  quantity INTEGER DEFAULT 1,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (frontend tracking)
CREATE POLICY "Anyone can insert product events"
ON public.product_events
FOR INSERT
TO public
WITH CHECK (true);

-- Allow authenticated users to read (admin metrics)
CREATE POLICY "Authenticated users can read product events"
ON public.product_events
FOR SELECT
TO authenticated
USING (true);

-- Also allow anon to read for now (since the app uses anon key for admin)
CREATE POLICY "Anon can read product events"
ON public.product_events
FOR SELECT
TO anon
USING (true);

-- Indexes for fast queries
CREATE INDEX idx_product_events_product_id ON public.product_events (product_id);
CREATE INDEX idx_product_events_event_type ON public.product_events (event_type);
CREATE INDEX idx_product_events_created_at ON public.product_events (created_at);
CREATE INDEX idx_product_events_product_event ON public.product_events (product_id, event_type);
