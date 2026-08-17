CREATE OR REPLACE FUNCTION public.programadoras_da_programacao()
RETURNS TABLE(id uuid, nome text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.nome
  FROM public.profiles p
  WHERE p.tenant_id = public.tenant_atual()
    AND public.acesso_tenant(p.tenant_id)
    AND p.ativo = true
    AND public.tem_permissao(p.id, 'programacao', 'visualizar')
  ORDER BY p.nome;
$$;

REVOKE ALL ON FUNCTION public.programadoras_da_programacao() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.programadoras_da_programacao() TO authenticated, service_role;

ALTER TABLE public.erros_sistema
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS resolvido_por uuid,
  ADD COLUMN IF NOT EXISTS resolvido_por_nome text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS resolvido_em timestamptz,
  ADD COLUMN IF NOT EXISTS arquivado_em timestamptz;

ALTER TABLE public.erros_sistema
  DROP CONSTRAINT IF EXISTS erros_sistema_status_check;
ALTER TABLE public.erros_sistema
  ADD CONSTRAINT erros_sistema_status_check CHECK (status IN ('pendente', 'resolvido'));

CREATE INDEX IF NOT EXISTS erros_sistema_tenant_status_idx
  ON public.erros_sistema (tenant_id, status, arquivado_em, ultima_ocorrencia DESC);

CREATE OR REPLACE FUNCTION public.definir_status_erro_sistema(_id uuid, _resolvido boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant uuid;
  _nome text;
BEGIN
  SELECT tenant_id INTO _tenant FROM public.erros_sistema WHERE id = _id;
  IF _tenant IS NULL OR NOT public.acesso_tenant(_tenant) OR NOT public.eh_master(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
  END IF;

  SELECT nome INTO _nome FROM public.profiles WHERE id = auth.uid();
  UPDATE public.erros_sistema
  SET status = CASE WHEN _resolvido THEN 'resolvido' ELSE 'pendente' END,
      resolvido_por = CASE WHEN _resolvido THEN auth.uid() ELSE NULL END,
      resolvido_por_nome = CASE WHEN _resolvido THEN coalesce(_nome, '') ELSE '' END,
      resolvido_em = CASE WHEN _resolvido THEN now() ELSE NULL END,
      arquivado_em = NULL,
      updated_at = now()
  WHERE id = _id AND tenant_id = _tenant;
END;
$$;

CREATE OR REPLACE FUNCTION public.arquivar_erros_resolvidos(_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant uuid := public.tenant_atual();
  _total integer;
BEGIN
  IF _tenant IS NULL OR NOT public.acesso_tenant(_tenant) OR NOT public.eh_master(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.erros_sistema
  SET arquivado_em = now(), updated_at = now()
  WHERE tenant_id = _tenant
    AND status = 'resolvido'
    AND arquivado_em IS NULL
    AND (_id IS NULL OR id = _id);
  GET DIAGNOSTICS _total = ROW_COUNT;
  RETURN _total;
END;
$$;

REVOKE ALL ON FUNCTION public.definir_status_erro_sistema(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.arquivar_erros_resolvidos(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.definir_status_erro_sistema(uuid, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.arquivar_erros_resolvidos(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.registrar_erro_sistema(_fingerprint text, _pagina text, _componente text, _operacao text, _endpoint text, _codigo_http integer, _categoria text, _mensagem text, _stack text, _navegador text, _sistema_operacional text, _user_agent text)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _id uuid;
  _ocorrencias integer;
BEGIN
  INSERT INTO public.erros_sistema (
    fingerprint, user_id, pagina, componente, operacao, endpoint, codigo_http,
    categoria, mensagem, stack, navegador, sistema_operacional, user_agent
  ) VALUES (
    left(_fingerprint, 160), auth.uid(), left(coalesce(_pagina,''), 500),
    left(coalesce(_componente,''), 160), left(coalesce(_operacao,''), 160),
    left(coalesce(_endpoint,''), 500), _codigo_http,
    CASE WHEN _categoria IN ('frontend','autenticacao','banco','api') THEN _categoria ELSE 'frontend' END,
    left(coalesce(_mensagem,'Erro desconhecido'), 2000), left(coalesce(_stack,''), 8000),
    left(coalesce(_navegador,''), 160), left(coalesce(_sistema_operacional,''), 160),
    left(coalesce(_user_agent,''), 1000)
  )
  ON CONFLICT (tenant_id, fingerprint, user_id) DO UPDATE SET
    ocorrencias = public.erros_sistema.ocorrencias + 1,
    ultima_ocorrencia = now(),
    pagina = EXCLUDED.pagina,
    componente = EXCLUDED.componente,
    operacao = EXCLUDED.operacao,
    endpoint = EXCLUDED.endpoint,
    codigo_http = EXCLUDED.codigo_http,
    categoria = EXCLUDED.categoria,
    mensagem = EXCLUDED.mensagem,
    stack = EXCLUDED.stack,
    navegador = EXCLUDED.navegador,
    sistema_operacional = EXCLUDED.sistema_operacional,
    user_agent = EXCLUDED.user_agent,
    status = 'pendente',
    resolvido_por = NULL,
    resolvido_por_nome = '',
    resolvido_em = NULL,
    arquivado_em = NULL,
    updated_at = now()
  RETURNING id, ocorrencias INTO _id, _ocorrencias;

  IF _ocorrencias IN (5, 10, 25, 50, 100) THEN
    INSERT INTO public.notificacoes (user_id, tipo, titulo, mensagem, para_admin, chave)
    VALUES (
      auth.uid(), 'saude-sistema', 'Aumento de erros no sistema',
      format('A falha em %s atingiu %s ocorrências: %s', coalesce(nullif(_componente,''), _pagina), _ocorrencias, left(_mensagem, 180)),
      true, format('saude-%s-%s', left(_fingerprint, 80), _ocorrencias)
    ) ON CONFLICT DO NOTHING;
  END IF;
  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.tenant_publico(_slug text)
RETURNS TABLE(id uuid, nome text, slug text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.nome, t.slug
  FROM public.tenants t
  WHERE t.ativo
    AND t.status = 'ativo'
    AND NULLIF(btrim(coalesce(_slug, '')), '') IS NOT NULL
    AND t.slug = btrim(_slug)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.tenant_publico(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tenant_publico(text) TO anon, authenticated, service_role;