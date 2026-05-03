-- Tabela para rastrear progresso de fidelidade por cliente
CREATE TABLE public.fidelidade_progresso (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telefone_cliente TEXT NOT NULL UNIQUE,
  nome_cliente TEXT,
  contagem_pizzas INTEGER NOT NULL DEFAULT 0,
  valor_gasto_pizzas NUMERIC NOT NULL DEFAULT 0,
  ultima_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.fidelidade_progresso ENABLE ROW LEVEL SECURITY;

-- Política permissiva para operações públicas
CREATE POLICY "Acesso público fidelidade_progresso"
ON public.fidelidade_progresso
FOR ALL
USING (true)
WITH CHECK (true);