DO $$
DECLARE
  v_tenant_padrao uuid;
BEGIN
  SELECT id INTO v_tenant_padrao
  FROM public.tenants
  WHERE slug = 'operacao-atual';

  IF v_tenant_padrao IS NULL THEN
    RAISE EXCEPTION 'Tenant inicial operacao-atual não encontrado';
  END IF;

  DROP POLICY IF EXISTS "daily_workers_isolamento_tenant" ON public.daily_workers;
  CREATE POLICY "daily_workers_isolamento_tenant"
    ON public.daily_workers
    AS RESTRICTIVE
    FOR ALL
    TO authenticated
    USING (public.acesso_tenant(tenant_id))
    WITH CHECK (public.acesso_tenant(tenant_id));

  DROP POLICY IF EXISTS "Portal publico apenas cadastra" ON public.daily_workers;
  EXECUTE format(
    'CREATE POLICY "Portal publico apenas cadastra" ON public.daily_workers FOR INSERT TO anon WITH CHECK (consent_accepted AND status = ''novo'' AND tenant_id = %L::uuid)',
    v_tenant_padrao
  );
END
$$;

DROP POLICY IF EXISTS "colaboradores_select" ON public.colaboradores;
CREATE POLICY "colaboradores_select"
  ON public.colaboradores
  FOR SELECT
  TO authenticated
  USING (
    public.tem_permissao(auth.uid(), 'equipe', 'visualizar')
    OR public.tem_permissao(auth.uid(), 'programacao', 'visualizar')
    OR public.tem_permissao(auth.uid(), 'programadoras', 'visualizar')
    OR public.tem_permissao(auth.uid(), 'vagas', 'visualizar')
  );

DROP POLICY IF EXISTS "empresas_select" ON public.empresas;
CREATE POLICY "empresas_select"
  ON public.empresas
  FOR SELECT
  TO authenticated
  USING (
    public.tem_permissao(auth.uid(), 'empresas', 'visualizar')
    OR public.tem_permissao(auth.uid(), 'programacao', 'visualizar')
    OR public.tem_permissao(auth.uid(), 'programadoras', 'visualizar')
    OR public.tem_permissao(auth.uid(), 'vagas', 'visualizar')
    OR public.tem_permissao(auth.uid(), 'dashboard', 'visualizar')
  );

DROP POLICY IF EXISTS "vagas_select" ON public.vagas;
CREATE POLICY "vagas_select"
  ON public.vagas
  FOR SELECT
  TO authenticated
  USING (
    public.tem_permissao(auth.uid(), 'vagas', 'visualizar')
    OR public.tem_permissao(auth.uid(), 'programacao', 'visualizar')
    OR public.tem_permissao(auth.uid(), 'programadoras', 'visualizar')
    OR public.tem_permissao(auth.uid(), 'dashboard', 'visualizar')
    OR public.tem_permissao(auth.uid(), 'confirmacoes', 'visualizar')
    OR public.tem_permissao(auth.uid(), 'performance', 'visualizar')
    OR public.tem_permissao(auth.uid(), 'analise', 'visualizar')
    OR public.tem_permissao(auth.uid(), 'radar', 'visualizar')
    OR public.tem_permissao(auth.uid(), 'comparar', 'visualizar')
    OR public.tem_permissao(auth.uid(), 'relatorios', 'visualizar')
  );

DROP POLICY IF EXISTS "Autenticados leem perfis" ON public.perfis_acesso;
CREATE POLICY "Administradores leem perfis"
  ON public.perfis_acesso
  FOR SELECT
  TO authenticated
  USING (
    public.tem_permissao(auth.uid(), 'perfis', 'visualizar')
    OR public.tem_permissao(auth.uid(), 'administracao', 'administrar')
  );

DROP POLICY IF EXISTS "Autenticados leem permissoes de perfil" ON public.perfil_permissoes;
CREATE POLICY "Administradores leem permissoes de perfil"
  ON public.perfil_permissoes
  FOR SELECT
  TO authenticated
  USING (
    public.tem_permissao(auth.uid(), 'perfis', 'visualizar')
    OR public.tem_permissao(auth.uid(), 'administracao', 'administrar')
  );

DO $$
DECLARE
  fn regprocedure;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', fn);
  END LOOP;
END
$$;