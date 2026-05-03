-- Criar tabela para informações da empresa
CREATE TABLE IF NOT EXISTS public.empresa_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  endereco text,
  telefone text,
  whatsapp text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.empresa_info ENABLE ROW LEVEL SECURITY;

-- Policy para admins gerenciarem suas próprias informações
CREATE POLICY "Admins podem gerenciar suas informações"
ON public.empresa_info
FOR ALL
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_empresa_info_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_empresa_info_timestamp
BEFORE UPDATE ON public.empresa_info
FOR EACH ROW
EXECUTE FUNCTION update_empresa_info_updated_at();