-- Remover política existente que usa auth.uid()
DROP POLICY IF EXISTS "Usuários podem gerenciar suas próprias informações de empre" ON public.empresa_info;

-- Criar políticas públicas (necessário porque usamos Firebase auth, não Supabase auth)
CREATE POLICY "Allow public select empresa_info"
ON public.empresa_info
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert empresa_info"
ON public.empresa_info
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update empresa_info"
ON public.empresa_info
FOR UPDATE
USING (true);

CREATE POLICY "Allow public delete empresa_info"
ON public.empresa_info
FOR DELETE
USING (true);