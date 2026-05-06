
CREATE OR REPLACE FUNCTION public.get_ltv_by_utm_campaign(
  start_date timestamptz DEFAULT NULL,
  end_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
  utm_campaign text,
  customer_count bigint,
  total_revenue numeric,
  avg_ltv numeric
)
LANGUAGE sql
STABLE
AS $$
  WITH pedidos_filtrados AS (
    SELECT p.firebase_id, p.user_email, p.valor_total
    FROM public.pedidos_sabor_delivery p
    WHERE COALESCE(p.valor_total, 0) > 0
      AND (p.status_atual IS NULL OR p.status_atual NOT IN ('cancelado', 'Cancelado'))
      AND (start_date IS NULL OR p.criado_em >= start_date)
      AND (end_date IS NULL OR p.criado_em <= end_date)
  ),
  por_cliente AS (
    SELECT
      COALESCE(u.first_utm_campaign, '(sem campanha)') AS utm_campaign,
      COALESCE(u.id::text, pf.firebase_id, pf.user_email) AS customer_key,
      SUM(pf.valor_total) AS ltv
    FROM pedidos_filtrados pf
    LEFT JOIN public.users u
      ON (pf.firebase_id IS NOT NULL AND u.firebase_id = pf.firebase_id)
      OR (pf.firebase_id IS NULL AND pf.user_email IS NOT NULL AND u.email = pf.user_email)
    WHERE COALESCE(u.id::text, pf.firebase_id, pf.user_email) IS NOT NULL
    GROUP BY 1, 2
  )
  SELECT
    utm_campaign,
    COUNT(*)::bigint,
    SUM(ltv)::numeric,
    ROUND(AVG(ltv)::numeric, 2)
  FROM por_cliente
  GROUP BY utm_campaign
  ORDER BY 4 DESC;
$$;
