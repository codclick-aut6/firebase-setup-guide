CREATE OR REPLACE FUNCTION public.execute_cron_update(
  cron_expression text,
  function_url text,
  anon_key text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron, extensions
AS $$
BEGIN
  -- Remove o job existente (ignora erro se não existir)
  BEGIN
    PERFORM cron.unschedule('ga4-daily-snapshot');
  EXCEPTION WHEN OTHERS THEN
    -- job não existe, tudo bem
    NULL;
  END;

  -- Cria o novo job com a expressão cron fornecida
  PERFORM cron.schedule(
    'ga4-daily-snapshot',
    cron_expression,
    format(
      $job$
      SELECT net.http_post(
        url := %L,
        headers := %L::jsonb,
        body := '{"mode": "snapshot"}'::jsonb
      ) AS request_id;
      $job$,
      function_url,
      json_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || anon_key)::text
    )
  );
END;
$$;