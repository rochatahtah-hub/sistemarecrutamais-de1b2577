-- 1) Exclusão de empresa: somente quando estiver INATIVA
CREATE OR REPLACE FUNCTION public.excluir_tenant(_tenant uuid, _confirmacao text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _t record; _bloqueios text;
BEGIN
  IF NOT public.eh_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas a CEO pode excluir empresas.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO _t FROM public.tenants WHERE id = _tenant;
  IF NOT FOUND THEN RAISE EXCEPTION 'Empresa não encontrada.'; END IF;

  IF _t.ativo OR _t.status = 'ativo' THEN
    RAISE EXCEPTION 'Empresa ativa não pode ser excluída. Inative a empresa antes de excluir.' USING ERRCODE = '42501';
  END IF;

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

  PERFORM public.registrar_log_tenant(_tenant, 'excluir', 'Empresa excluída (inativa e sem dados operacionais vinculados).');

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
END $function$;

-- 2) Cadastro público de diárias: a empresa é validada no banco, nunca pelo navegador
CREATE OR REPLACE FUNCTION public.validar_tenant_publico_diaria()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.tenant_id IS NULL
     OR NOT EXISTS (SELECT 1 FROM public.tenants t
                     WHERE t.id = NEW.tenant_id AND t.ativo AND t.status = 'ativo') THEN
    RAISE EXCEPTION 'Cadastro indisponível: o link não pertence a uma empresa ativa.' USING ERRCODE = '42501';
  END IF;
  -- Visitante não define status administrativo.
  NEW.status := 'novo';
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_validar_tenant_publico_diaria ON public.daily_workers;
CREATE TRIGGER trg_validar_tenant_publico_diaria
BEFORE INSERT ON public.daily_workers
FOR EACH ROW EXECUTE FUNCTION public.validar_tenant_publico_diaria();

REVOKE EXECUTE ON FUNCTION public.validar_tenant_publico_diaria() FROM PUBLIC, anon, authenticated;