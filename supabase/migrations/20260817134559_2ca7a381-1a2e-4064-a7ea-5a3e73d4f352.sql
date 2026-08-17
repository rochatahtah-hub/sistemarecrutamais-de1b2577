
CREATE TABLE IF NOT EXISTS public.tenants_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  tenant_nome text NOT NULL DEFAULT '',
  tenant_slug text NOT NULL DEFAULT '',
  acao text NOT NULL,
  detalhe text NOT NULL DEFAULT '',
  usuario_id uuid,
  usuario_nome text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tenants_log TO authenticated;
GRANT ALL ON public.tenants_log TO service_role;
ALTER TABLE public.tenants_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenants_log_select_super_admin" ON public.tenants_log
  FOR SELECT TO authenticated USING (public.eh_super_admin(auth.uid()));

-- Empresa inativa não permite operações (exceto para a CEO, que administra)
CREATE OR REPLACE FUNCTION public.acesso_tenant(_tenant uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT _tenant IS NOT NULL
     AND _tenant = public.tenant_ativo()
     AND (
       public.eh_super_admin(auth.uid())
       OR EXISTS (SELECT 1 FROM public.tenants t
                   WHERE t.id = _tenant AND t.ativo AND t.status = 'ativo')
     )
$$;

CREATE OR REPLACE FUNCTION public.registrar_log_tenant(_tenant uuid, _acao text, _detalhe text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _t record; _nome text;
BEGIN
  SELECT t.nome, t.slug INTO _t FROM public.tenants t WHERE t.id = _tenant;
  SELECT COALESCE(p.nome, 'Sistema') INTO _nome FROM public.profiles p WHERE p.id = auth.uid();
  INSERT INTO public.tenants_log (tenant_id, tenant_nome, tenant_slug, acao, detalhe, usuario_id, usuario_nome)
  VALUES (_tenant, COALESCE(_t.nome,''), COALESCE(_t.slug,''), _acao, COALESCE(_detalhe,''), auth.uid(), COALESCE(_nome,'Sistema'));
END $$;

CREATE OR REPLACE FUNCTION public.definir_status_tenant(_tenant uuid, _ativo boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _t record;
BEGIN
  IF NOT public.eh_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas a CEO pode ativar ou inativar empresas.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO _t FROM public.tenants WHERE id = _tenant;
  IF NOT FOUND THEN RAISE EXCEPTION 'Empresa não encontrada.'; END IF;

  UPDATE public.tenants
     SET ativo = _ativo, status = CASE WHEN _ativo THEN 'ativo' ELSE 'inativo' END
   WHERE id = _tenant;

  PERFORM public.registrar_log_tenant(_tenant, CASE WHEN _ativo THEN 'ativar' ELSE 'inativar' END,
    CASE WHEN _ativo THEN 'Empresa reativada (dados preservados).' ELSE 'Empresa inativada (dados preservados).' END);

  INSERT INTO public.auditoria (tabela, registro_id, acao, descricao, campo, valor_anterior, valor_novo, usuario_id, usuario_nome, tenant_id)
  VALUES ('tenants', _tenant, CASE WHEN _ativo THEN 'ativar' ELSE 'inativar' END,
          'Empresa ' || _t.nome, 'status', _t.status, CASE WHEN _ativo THEN 'ativo' ELSE 'inativo' END,
          auth.uid(), COALESCE((SELECT nome FROM public.profiles WHERE id = auth.uid()), 'CEO'), _tenant);
END $$;

CREATE OR REPLACE FUNCTION public.renomear_tenant(_tenant uuid, _nome text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _antigo text; _limpo text := btrim(coalesce(_nome,''));
BEGIN
  IF NOT public.eh_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas a CEO pode editar empresas.' USING ERRCODE = '42501';
  END IF;
  IF length(_limpo) < 2 THEN RAISE EXCEPTION 'Informe o nome da empresa.'; END IF;
  SELECT nome INTO _antigo FROM public.tenants WHERE id = _tenant;
  IF _antigo IS NULL THEN RAISE EXCEPTION 'Empresa não encontrada.'; END IF;

  UPDATE public.tenants SET nome = _limpo WHERE id = _tenant;
  PERFORM public.registrar_log_tenant(_tenant, 'editar', format('Nome alterado de "%s" para "%s".', _antigo, _limpo));
  INSERT INTO public.auditoria (tabela, registro_id, acao, descricao, campo, valor_anterior, valor_novo, usuario_id, usuario_nome, tenant_id)
  VALUES ('tenants', _tenant, 'UPDATE', 'Empresa renomeada', 'nome', _antigo, _limpo,
          auth.uid(), COALESCE((SELECT nome FROM public.profiles WHERE id = auth.uid()), 'CEO'), _tenant);
END $$;

CREATE OR REPLACE FUNCTION public.dependencias_tenant(_tenant uuid)
RETURNS TABLE(entidade text, total bigint, bloqueia boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT * FROM (
    SELECT 'Usuários'::text, (SELECT count(*) FROM public.profiles WHERE tenant_id = _tenant), true
    UNION ALL SELECT 'Candidatos', (SELECT count(*) FROM public.candidatos WHERE tenant_id = _tenant), true
    UNION ALL SELECT 'Vagas', (SELECT count(*) FROM public.vagas WHERE tenant_id = _tenant), true
    UNION ALL SELECT 'Colaboradores', (SELECT count(*) FROM public.colaboradores WHERE tenant_id = _tenant), true
    UNION ALL SELECT 'Empresas parceiras', (SELECT count(*) FROM public.empresas WHERE tenant_id = _tenant), true
    UNION ALL SELECT 'Banco de diárias', (SELECT count(*) FROM public.daily_workers WHERE tenant_id = _tenant), true
    UNION ALL SELECT 'Bloqueios', (SELECT count(*) FROM public.colaboradores_bloqueados WHERE tenant_id = _tenant), true
    UNION ALL SELECT 'R&S — candidatos', (SELECT count(*) FROM public.rs_candidatos WHERE tenant_id = _tenant), true
    UNION ALL SELECT 'R&S — empresas', (SELECT count(*) FROM public.rs_empresas WHERE tenant_id = _tenant), true
    UNION ALL SELECT 'Importações', (SELECT count(*) FROM public.importacoes WHERE tenant_id = _tenant), true
    UNION ALL SELECT 'Histórico de quinzenas', (SELECT count(*) FROM public.quinzenas_historico WHERE tenant_id = _tenant), true
    UNION ALL SELECT 'Backups', (SELECT count(*) FROM public.backups WHERE tenant_id = _tenant), true
    UNION ALL SELECT 'Conversas do chat', (SELECT count(*) FROM public.conversas WHERE tenant_id = _tenant), true
    UNION ALL SELECT 'Auditoria', (SELECT count(*) FROM public.auditoria WHERE tenant_id = _tenant), false
    UNION ALL SELECT 'Configurações', (SELECT count(*) FROM public.configuracoes WHERE tenant_id = _tenant), false
    UNION ALL SELECT 'Perfis de acesso', (SELECT count(*) FROM public.perfis_acesso WHERE tenant_id = _tenant), false
  ) d(entidade, total, bloqueia)
  WHERE public.eh_super_admin(auth.uid())
  ORDER BY 2 DESC, 1
$$;

CREATE OR REPLACE FUNCTION public.excluir_tenant(_tenant uuid, _confirmacao text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _t record; _bloqueios text;
BEGIN
  IF NOT public.eh_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas a CEO pode excluir empresas.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO _t FROM public.tenants WHERE id = _tenant;
  IF NOT FOUND THEN RAISE EXCEPTION 'Empresa não encontrada.'; END IF;

  IF lower(btrim(coalesce(_confirmacao,''))) <> lower(_t.nome) THEN
    RAISE EXCEPTION 'Digite exatamente o nome da empresa para confirmar a exclusão.';
  END IF;

  IF _tenant = public.tenant_ativo() THEN
    RAISE EXCEPTION 'Troque para outra empresa antes de excluir esta, que está ativa na sua sessão.';
  END IF;

  IF _t.slug = 'operacao-atual' THEN
    RAISE EXCEPTION 'A empresa principal do sistema não pode ser excluída. Use "Inativar empresa".';
  END IF;

  SELECT string_agg(format('%s (%s)', d.entidade, d.total), ', ')
    INTO _bloqueios
  FROM public.dependencias_tenant(_tenant) d
  WHERE d.bloqueia AND d.total > 0;

  IF _bloqueios IS NOT NULL THEN
    RAISE EXCEPTION 'Exclusão bloqueada: a empresa possui dados vinculados — %. Use "Inativar empresa" para preservar tudo.', _bloqueios;
  END IF;

  PERFORM public.registrar_log_tenant(_tenant, 'excluir', 'Empresa excluída (sem dados operacionais vinculados).');

  DELETE FROM public.tenant_contexto WHERE tenant_id = _tenant;
  DELETE FROM public.notificacoes WHERE tenant_id = _tenant;
  DELETE FROM public.alertas_operacao WHERE tenant_id = _tenant;
  DELETE FROM public.erros_sistema WHERE tenant_id = _tenant;
  DELETE FROM public.user_access_logs WHERE tenant_id = _tenant;
  DELETE FROM public.presenca_usuarios WHERE tenant_id = _tenant;
  DELETE FROM public.backup_agendamento WHERE tenant_id = _tenant;
  DELETE FROM public.permissoes_usuario WHERE tenant_id = _tenant;
  DELETE FROM public.perfil_permissoes WHERE tenant_id = _tenant;
  DELETE FROM public.perfis_acesso WHERE tenant_id = _tenant;
  DELETE FROM public.configuracoes WHERE tenant_id = _tenant;
  DELETE FROM public.auditoria WHERE tenant_id = _tenant;
  DELETE FROM public.tenants WHERE id = _tenant;
END $$;

REVOKE EXECUTE ON FUNCTION public.registrar_log_tenant(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.definir_status_tenant(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.renomear_tenant(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.dependencias_tenant(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.excluir_tenant(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.definir_status_tenant(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.renomear_tenant(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dependencias_tenant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.excluir_tenant(uuid, text) TO authenticated;
