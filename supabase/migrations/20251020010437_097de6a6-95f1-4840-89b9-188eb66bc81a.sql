-- Passo 1: Adicionar nova coluna user_id_uuid temporária
ALTER TABLE empresa_info ADD COLUMN user_id_uuid uuid;

-- Passo 2: Atualizar user_id_uuid com base no firebase_id salvo em user_id
-- Se o user_id era o firebase_id, buscamos o UUID correto da tabela users
UPDATE empresa_info
SET user_id_uuid = users.user_id
FROM users
WHERE empresa_info.user_id = users.firebase_id;

-- Passo 3: Deletar registros órfãos (sem correspondência na tabela users)
DELETE FROM empresa_info WHERE user_id_uuid IS NULL;

-- Passo 4: Remover a coluna user_id antiga
ALTER TABLE empresa_info DROP COLUMN user_id;

-- Passo 5: Renomear user_id_uuid para user_id
ALTER TABLE empresa_info RENAME COLUMN user_id_uuid TO user_id;

-- Passo 6: Tornar user_id NOT NULL
ALTER TABLE empresa_info ALTER COLUMN user_id SET NOT NULL;

-- Passo 7: Adicionar RLS policies para empresa_info
ALTER TABLE empresa_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem gerenciar suas próprias informações de empresa"
ON empresa_info
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());