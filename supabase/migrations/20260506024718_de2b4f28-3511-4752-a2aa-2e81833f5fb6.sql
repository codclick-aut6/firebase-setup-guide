CREATE OR REPLACE FUNCTION public.get_ltv_by_utm_source(start_date timestamp with time zone DEFAULT NULL, end_date timestamp with time zone DEFAULT NULL)
RETURNS TABLE(utm_source text, customer_count bigint, total_revenue numeric, avg_ltv numeric)
LANGUAGE sql STABLE AS $$
  WITH pedidos_filtrados AS (
    SELECT p.firebase_id, LOWER(p.user_email) AS user_email, p.valor_total
    FROM public.pedidos_sabor_delivery p
    WHERE COALESCE(p.valor_total, 0) > 0
      AND (p.status_atual IS NULL OR p.status_atual NOT IN ('cancelado','Cancelado','cancelled'))
      AND (start_date IS NULL OR p.criado_em >= start_date)
      AND (end_date IS NULL OR p.criado_em <= end_date)
  ),
  por_cliente AS (
    SELECT
      COALESCE(u.first_utm_source, '(direto)') AS utm_source,
      u.id AS customer_key,
      SUM(pf.valor_total) AS ltv
    FROM public.users u
    JOIN pedidos_filtrados pf
      ON (u.firebase_id IS NOT NULL AND u.firebase_id = pf.firebase_id)
      OR (u.email IS NOT NULL AND LOWER(u.email) = pf.user_email)
    GROUP BY 1, 2
  )
  SELECT utm_source, COUNT(*)::bigint, SUM(ltv)::numeric, ROUND(AVG(ltv)::numeric, 2)
  FROM por_cliente GROUP BY utm_source ORDER BY 4 DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_ltv_by_utm_campaign(start_date timestamp with time zone DEFAULT NULL, end_date timestamp with time zone DEFAULT NULL)
RETURNS TABLE(utm_campaign text, customer_count bigint, total_revenue numeric, avg_ltv numeric)
LANGUAGE sql STABLE AS $$
  WITH pedidos_filtrados AS (
    SELECT p.firebase_id, LOWER(p.user_email) AS user_email, p.valor_total
    FROM public.pedidos_sabor_delivery p
    WHERE COALESCE(p.valor_total, 0) > 0
      AND (p.status_atual IS NULL OR p.status_atual NOT IN ('cancelado','Cancelado','cancelled'))
      AND (start_date IS NULL OR p.criado_em >= start_date)
      AND (end_date IS NULL OR p.criado_em <= end_date)
  ),
  por_cliente AS (
    SELECT
      COALESCE(u.first_utm_campaign, '(sem campanha)') AS utm_campaign,
      u.id AS customer_key,
      SUM(pf.valor_total) AS ltv
    FROM public.users u
    JOIN pedidos_filtrados pf
      ON (u.firebase_id IS NOT NULL AND u.firebase_id = pf.firebase_id)
      OR (u.email IS NOT NULL AND LOWER(u.email) = pf.user_email)
    GROUP BY 1, 2
  )
  SELECT utm_campaign, COUNT(*)::bigint, SUM(ltv)::numeric, ROUND(AVG(ltv)::numeric, 2)
  FROM por_cliente GROUP BY utm_campaign ORDER BY 4 DESC;
$$;