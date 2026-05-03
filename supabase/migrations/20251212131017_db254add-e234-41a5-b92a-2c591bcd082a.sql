-- Ajustar políticas de SELECT na tabela users para permitir acesso público (anon)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.users;

CREATE POLICY "Allow public read for users"
ON public.users
FOR SELECT
USING (true);