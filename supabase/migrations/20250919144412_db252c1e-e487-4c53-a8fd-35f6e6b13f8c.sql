-- Criar tabela para dados dos clientes
CREATE TABLE public.customer_data (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  phone text NOT NULL UNIQUE,
  cep text,
  street text,
  number text,
  complement text,
  neighborhood text,
  city text,
  state text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.customer_data ENABLE ROW LEVEL SECURITY;

-- Criar políticas para permitir leitura e escrita pública (dados de cliente podem ser acessados por qualquer um)
CREATE POLICY "Allow public read access to customer data" 
ON public.customer_data 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert customer data" 
ON public.customer_data 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update customer data" 
ON public.customer_data 
FOR UPDATE 
USING (true);

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_customer_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Criar trigger para atualizar timestamp automaticamente
CREATE TRIGGER update_customer_data_updated_at
  BEFORE UPDATE ON public.customer_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_customer_data_updated_at();