-- Adicionar coluna para tipo de modelo de frete na tabela empresa_info
ALTER TABLE empresa_info 
ADD COLUMN modelo_frete text DEFAULT 'km_direto' CHECK (modelo_frete IN ('km_direto', 'cep_distancia'));

-- Comentário explicativo
COMMENT ON COLUMN empresa_info.modelo_frete IS 'Tipo de modelo de frete: km_direto (cobrança por quilometragem direta) ou cep_distancia (cobrança por distância entre CEPs)';
