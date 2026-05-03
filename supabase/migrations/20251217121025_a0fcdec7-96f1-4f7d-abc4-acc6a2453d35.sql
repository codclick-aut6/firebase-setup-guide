-- Habilitar RLS na tabela ceps_especiais (caso não esteja)
ALTER TABLE public.ceps_especiais ENABLE ROW LEVEL SECURITY;

-- Criar políticas públicas para ceps_especiais (usamos Firebase auth, não Supabase auth)
CREATE POLICY "Allow public select ceps_especiais"
ON public.ceps_especiais
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert ceps_especiais"
ON public.ceps_especiais
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public delete ceps_especiais"
ON public.ceps_especiais
FOR DELETE
USING (true);