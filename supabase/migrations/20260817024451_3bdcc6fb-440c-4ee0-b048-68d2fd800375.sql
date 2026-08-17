-- Helper de acesso por tenant
CREATE OR REPLACE FUNCTION public.acesso_tenant(_tenant uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _tenant IS NULL
      OR _tenant = COALESCE(public.tenant_do_usuario(auth.uid()), public.tenant_padrao())
      OR public.eh_super_admin(auth.uid())
$$;
REVOKE EXECUTE ON FUNCTION public.acesso_tenant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.acesso_tenant(uuid) TO authenticated, anon;

-- Trigger que define/protege o tenant_id em toda gravação
CREATE OR REPLACE FUNCTION public.aplicar_tenant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE _meu uuid := COALESCE(public.tenant_do_usuario(auth.uid()), public.tenant_padrao());
BEGIN
  IF public.eh_super_admin(auth.uid()) THEN
    IF TG_OP = 'INSERT' AND NEW.tenant_id IS NULL THEN NEW.tenant_id := _meu; END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.tenant_id := _meu;
  ELSE
    IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
      RAISE EXCEPTION 'Acesso negado: não é permitido alterar a empresa do registro.' USING ERRCODE = '42501';
    END IF;
    IF OLD.tenant_id IS DISTINCT FROM _meu THEN
      RAISE EXCEPTION 'Acesso negado: registro pertence a outra empresa.' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $fn$;

DO $do$
DECLARE
  _t text;
  _tabelas text[] := ARRAY[
    'profiles','empresas','colaboradores','candidatos','vagas','colaboradores_bloqueados',
    'daily_workers','importacoes','quinzenas_historico','alertas_operacao','configuracoes',
    'perfis_acesso','perfil_permissoes','permissoes_usuario','rs_empresas','rs_candidatos',
    'rs_cargos','rs_historico','notificacoes','auditoria','conversas','backups','backup_agendamento'
  ];
BEGIN
  FOREACH _t IN ARRAY _tabelas LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', _t||'_isolamento_tenant', _t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL USING (public.acesso_tenant(tenant_id)) WITH CHECK (public.acesso_tenant(tenant_id))',
      _t||'_isolamento_tenant', _t);
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'trg_tenant_'||_t, _t);
    EXECUTE format('CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.aplicar_tenant()', 'trg_tenant_'||_t, _t);
  END LOOP;
END
$do$;

-- Chat: herda o tenant da conversa
CREATE OR REPLACE FUNCTION public.acesso_tenant_conversa(_conversa uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.acesso_tenant((SELECT c.tenant_id FROM public.conversas c WHERE c.id = _conversa))
$$;
REVOKE EXECUTE ON FUNCTION public.acesso_tenant_conversa(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.acesso_tenant_conversa(uuid) TO authenticated;

DROP POLICY IF EXISTS conversa_participantes_isolamento_tenant ON public.conversa_participantes;
CREATE POLICY conversa_participantes_isolamento_tenant ON public.conversa_participantes AS RESTRICTIVE FOR ALL
  USING (public.acesso_tenant_conversa(conversa_id)) WITH CHECK (public.acesso_tenant_conversa(conversa_id));

DROP POLICY IF EXISTS mensagens_isolamento_tenant ON public.mensagens;
CREATE POLICY mensagens_isolamento_tenant ON public.mensagens AS RESTRICTIVE FOR ALL
  USING (public.acesso_tenant_conversa(conversa_id)) WITH CHECK (public.acesso_tenant_conversa(conversa_id));

DROP POLICY IF EXISTS reacoes_isolamento_tenant ON public.reacoes_mensagem;
CREATE POLICY reacoes_isolamento_tenant ON public.reacoes_mensagem AS RESTRICTIVE FOR ALL
  USING (public.acesso_tenant_conversa(conversa_id)) WITH CHECK (public.acesso_tenant_conversa(conversa_id));