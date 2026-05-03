-- Fixar relacionamento de cupons_usos com tabela correta de usuários (Firebase -> public.users)

ALTER TABLE public.cupons_usos
  DROP CONSTRAINT IF EXISTS cupons_usos_user_id_fkey;

ALTER TABLE public.cupons_usos
  ADD CONSTRAINT cupons_usos_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE SET NULL;

-- Indexes para validações rápidas de limite
CREATE INDEX IF NOT EXISTS idx_cupons_usos_cupom_id ON public.cupons_usos (cupom_id);
CREATE INDEX IF NOT EXISTS idx_cupons_usos_user_id ON public.cupons_usos (user_id);
CREATE INDEX IF NOT EXISTS idx_cupons_usos_cupom_user ON public.cupons_usos (cupom_id, user_id);