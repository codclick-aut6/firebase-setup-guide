
-- Adiciona suporte ao novo tipo de cupom "compre_e_ganhe"
-- Estrutura JSON em produtos_requeridos: [{ product_id: string, product_name: string, quantidade: number }]
-- Estrutura JSON em produto_brinde: { product_id: string, product_name: string, quantidade: number }

ALTER TABLE public.cupons
  ADD COLUMN IF NOT EXISTS produtos_requeridos jsonb,
  ADD COLUMN IF NOT EXISTS produto_brinde jsonb;

COMMENT ON COLUMN public.cupons.produtos_requeridos IS 'Lista de produtos exigidos para o cupom compre_e_ganhe. Ex: [{"product_id":"abc","product_name":"Pizza","quantidade":2}]';
COMMENT ON COLUMN public.cupons.produto_brinde IS 'Produto oferecido como brinde. Ex: {"product_id":"xyz","product_name":"Refri","quantidade":1}';
