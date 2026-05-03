
-- Função que garante os valores padrão na tabela configuracoes
CREATE OR REPLACE FUNCTION public.ensure_configuracoes_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Reinsere as chaves padrão caso não existam
  INSERT INTO public.configuracoes (chave, valor)
  VALUES
    ('supabase_project_id',      'aealgiyzbenbhhftwkxb'),
    ('supabase_project_url',     'https://aealgiyzbenbhhftwkxb.supabase.co'),
    ('supabase_publishable_key', 'sb_publishable_segSu4lwfe4romisMtKB2g_TqiO70r8'),
    ('firebase_credentials',     '{"apiKey":"AIzaSyB0BSql846hMmBa_WYiwpTdc5MDWEmDHP8","authDomain":"fb-aut6.firebaseapp.com","projectId":"fb-aut6","storageBucket":"fb-aut6.firebasestorage.app","messagingSenderId":"908504345671","appId":"1:908504345671:web:d4d624f3c6a5c4612a5562"}')
  ON CONFLICT (chave) DO NOTHING;

  RETURN OLD;
END;
$$;

-- Trigger que dispara após qualquer DELETE na tabela configuracoes
DROP TRIGGER IF EXISTS trg_restore_configuracoes ON public.configuracoes;

CREATE TRIGGER trg_restore_configuracoes
AFTER DELETE ON public.configuracoes
FOR EACH STATEMENT
EXECUTE FUNCTION public.ensure_configuracoes_defaults();
