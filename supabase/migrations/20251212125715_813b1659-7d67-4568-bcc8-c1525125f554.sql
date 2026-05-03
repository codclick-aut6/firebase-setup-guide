-- Remover política existente de INSERT
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;

-- Criar nova política que permite INSERT público (necessário porque usamos Firebase auth, não Supabase auth)
CREATE POLICY "Allow public insert for users" 
ON public.users 
FOR INSERT 
WITH CHECK (true);

-- Também precisamos permitir UPDATE para usuários atualizarem seus próprios registros
DROP POLICY IF EXISTS "Enable update for users" ON public.users;

CREATE POLICY "Allow public update for users" 
ON public.users 
FOR UPDATE 
USING (true);