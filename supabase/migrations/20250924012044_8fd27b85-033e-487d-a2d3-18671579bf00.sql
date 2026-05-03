-- Criar função para buscar role do usuário
CREATE OR REPLACE FUNCTION public.get_user_role(user_uid uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM users WHERE user_id = user_uid LIMIT 1;
$$;