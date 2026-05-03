-- Atualizar o firebase_id do usuário admin
UPDATE users SET firebase_id = 'k5Aq2RQmQIg3vP6F0IyPEMws2o92' WHERE email = 'afonsorickman@gmail.com';

-- Atualizar a função RPC para usar firebase_id em vez de user_id
CREATE OR REPLACE FUNCTION public.get_user_role(user_uid text)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM users WHERE firebase_id = user_uid LIMIT 1;
$$;