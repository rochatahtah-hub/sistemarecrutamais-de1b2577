DROP POLICY IF EXISTS "daily_workers_isolamento_tenant" ON public.daily_workers;

-- Visitante do link público: só pode gravar em empresa ativa para captação.
CREATE POLICY "daily_workers_isolamento_publico"
  ON public.daily_workers
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (public.tenant_ativo_para_captacao(tenant_id))
  WITH CHECK (public.tenant_ativo_para_captacao(tenant_id));

-- Usuário logado: restrito à empresa ativa da sessão.
CREATE POLICY "daily_workers_isolamento_tenant"
  ON public.daily_workers
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (public.acesso_tenant(tenant_id))
  WITH CHECK (public.acesso_tenant(tenant_id));