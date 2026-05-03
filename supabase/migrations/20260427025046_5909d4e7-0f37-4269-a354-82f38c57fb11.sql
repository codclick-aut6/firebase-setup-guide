ALTER TABLE public.product_events
  ADD COLUMN IF NOT EXISTS visitor_id text;

CREATE INDEX IF NOT EXISTS idx_product_events_visitor_session
  ON public.product_events (visitor_id, session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_product_events_event_type_created
  ON public.product_events (event_type, created_at);