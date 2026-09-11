----------------------------------------------------
**V.1.104.1 - pizza-qr-menu - 11/09/2026**
----------------------------------------------------
- marketing-metrics agora calcula a duração média por sessão, limita em 30 minutos, respeita origem/campanha e compara com o período anterior.

SQL's necessários:


-- DURAÇÃO MÉDIA DA SESSÃO
-- Adiciona um cálculo otimizado da duração média das visitas usando os eventos de cada sessão.
-- Respeita período, origem e campanha selecionados.
-- Limita visitas longas a 30 minutos para evitar distorções.
-- Disponibiliza somente o resultado agregado para usuários autenticados e serviços internos.


CREATE OR REPLACE FUNCTION public.mkt_avg_visit_duration(
  p_start timestamp with time zone,
  p_end timestamp with time zone,
  p_source text DEFAULT NULL,
  p_campaign text DEFAULT NULL
)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH session_durations AS (
    SELECT
      pe.session_id,
      LEAST(
        EXTRACT(EPOCH FROM (MAX(pe.created_at) - MIN(pe.created_at))),
        1800::numeric
      ) AS duration_seconds
    FROM public.product_events pe
    WHERE pe.created_at >= p_start
      AND pe.created_at <= p_end
      AND pe.session_id IS NOT NULL
      AND (p_source IS NULL OR pe.utm_source = p_source)
      AND (p_campaign IS NULL OR pe.utm_campaign = p_campaign)
    GROUP BY pe.session_id
  )
  SELECT COALESCE(AVG(duration_seconds), 0)::numeric
  FROM session_durations;
$$;

REVOKE ALL ON FUNCTION public.mkt_avg_visit_duration(timestamp with time zone, timestamp with time zone, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mkt_avg_visit_duration(timestamp with time zone, timestamp with time zone, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mkt_avg_visit_duration(timestamp with time zone, timestamp with time zone, text, text) TO service_role;

-- Permite que a página administrativa consulte somente o valor agregado da duração média usando a conexão pública já adotada pelo projeto.
-- Os eventos individuais continuam protegidos pelas regras existentes.
GRANT EXECUTE ON FUNCTION public.mkt_avg_visit_duration(timestamp with time zone, timestamp with time zone, text, text) TO anon;
