-- Criar tabela para faixas de frete
CREATE TABLE IF NOT EXISTS public.faixas_frete (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  km_inicial numeric NOT NULL,
  km_final numeric NOT NULL,
  valor numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT km_inicial_menor_que_final CHECK (km_inicial < km_final)
);

-- Enable RLS
ALTER TABLE public.faixas_frete ENABLE ROW LEVEL SECURITY;

-- Policy para admins gerenciarem suas faixas
CREATE POLICY "Admins podem gerenciar suas faixas de frete"
ON public.faixas_frete
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);