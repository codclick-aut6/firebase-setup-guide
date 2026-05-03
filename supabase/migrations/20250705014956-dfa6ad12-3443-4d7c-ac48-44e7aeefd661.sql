
-- Adicionar nova coluna para status de pagamento
ALTER TABLE public.informacoes_pedido 
ADD COLUMN payment_status TEXT DEFAULT 'a_receber' CHECK (payment_status IN ('a_receber', 'recebido'));

-- Criar índice para melhor performance
CREATE INDEX idx_informacoes_pedido_payment_status ON public.informacoes_pedido(payment_status);

-- Comentários para documentação
COMMENT ON COLUMN public.informacoes_pedido.payment_status IS 'Status de pagamento: a_receber (padrão) ou recebido';
