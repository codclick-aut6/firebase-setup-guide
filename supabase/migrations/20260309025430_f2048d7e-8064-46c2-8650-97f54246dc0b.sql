CREATE TABLE public.ga4_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL,
  report_type text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(snapshot_date, report_type)
);

ALTER TABLE public.ga4_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read ga4_snapshots" ON public.ga4_snapshots
  FOR SELECT USING (true);

CREATE POLICY "Allow service role write ga4_snapshots" ON public.ga4_snapshots
  FOR ALL USING (true) WITH CHECK (true);

-- Add default config for cron schedule time (6:00 AM BRT = 09:00 UTC)
INSERT INTO public.configuracoes (chave, valor)
VALUES ('ga4_cron_horario', '09:00')
ON CONFLICT (chave) DO NOTHING;