-- F-3: reduzir superfície — só usuários autenticados executam estas rotinas
REVOKE EXECUTE ON FUNCTION public.resumo_saude_sistema() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.registrar_erro_sistema(text,text,text,text,text,integer,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resumo_saude_sistema() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.registrar_erro_sistema(text,text,text,text,text,integer,text,text,text,text,text,text) TO authenticated, service_role;

-- F-2: uniformizar o isolamento de tenant em daily_workers (estava só para authenticated)
DROP POLICY IF EXISTS "daily_workers_isolamento_tenant" ON public.daily_workers;
CREATE POLICY "daily_workers_isolamento_tenant"
  ON public.daily_workers
  AS RESTRICTIVE
  FOR ALL
  TO public
  USING (
    CASE WHEN auth.uid() IS NULL
      THEN public.tenant_ativo_para_captacao(tenant_id)
      ELSE public.acesso_tenant(tenant_id)
    END
  )
  WITH CHECK (
    CASE WHEN auth.uid() IS NULL
      THEN public.tenant_ativo_para_captacao(tenant_id)
      ELSE public.acesso_tenant(tenant_id)
    END
  );