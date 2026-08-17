-- 1) Empresa nos registros globais
ALTER TABLE public.user_access_logs ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.erros_sistema ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.presenca_usuarios ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

UPDATE public.user_access_logs l
   SET tenant_id = COALESCE((SELECT p.tenant_id FROM public.profiles p WHERE p.id = l.user_id), public.tenant_padrao())
 WHERE l.tenant_id IS NULL;
UPDATE public.erros_sistema e
   SET tenant_id = COALESCE((SELECT p.tenant_id FROM public.profiles p WHERE p.id = e.user_id), public.tenant_padrao())
 WHERE e.tenant_id IS NULL;
UPDATE public.presenca_usuarios s
   SET tenant_id = COALESCE((SELECT p.tenant_id FROM public.profiles p WHERE p.id = s.user_id), public.tenant_padrao())
 WHERE s.tenant_id IS NULL;

ALTER TABLE public.user_access_logs ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.erros_sistema ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.presenca_usuarios ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.user_access_logs ALTER COLUMN tenant_id SET DEFAULT public.tenant_ativo();
ALTER TABLE public.erros_sistema ALTER COLUMN tenant_id SET DEFAULT public.tenant_ativo();
ALTER TABLE public.presenca_usuarios ALTER COLUMN tenant_id SET DEFAULT public.tenant_ativo();

DROP TRIGGER IF EXISTS trg_tenant_user_access_logs ON public.user_access_logs;
CREATE TRIGGER trg_tenant_user_access_logs BEFORE INSERT OR UPDATE ON public.user_access_logs
  FOR EACH ROW EXECUTE FUNCTION public.aplicar_tenant();
DROP TRIGGER IF EXISTS trg_tenant_erros_sistema ON public.erros_sistema;
CREATE TRIGGER trg_tenant_erros_sistema BEFORE INSERT OR UPDATE ON public.erros_sistema
  FOR EACH ROW EXECUTE FUNCTION public.aplicar_tenant();
DROP TRIGGER IF EXISTS trg_tenant_presenca_usuarios ON public.presenca_usuarios;
CREATE TRIGGER trg_tenant_presenca_usuarios BEFORE INSERT OR UPDATE ON public.presenca_usuarios
  FOR EACH ROW EXECUTE FUNCTION public.aplicar_tenant();

DROP POLICY IF EXISTS user_access_logs_isolamento_tenant ON public.user_access_logs;
CREATE POLICY user_access_logs_isolamento_tenant ON public.user_access_logs
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.acesso_tenant(tenant_id)) WITH CHECK (public.acesso_tenant(tenant_id));

DROP POLICY IF EXISTS erros_sistema_isolamento_tenant ON public.erros_sistema;
CREATE POLICY erros_sistema_isolamento_tenant ON public.erros_sistema
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.acesso_tenant(tenant_id)) WITH CHECK (public.acesso_tenant(tenant_id));

DROP POLICY IF EXISTS presenca_usuarios_isolamento_tenant ON public.presenca_usuarios;
CREATE POLICY presenca_usuarios_isolamento_tenant ON public.presenca_usuarios
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.acesso_tenant(tenant_id)) WITH CHECK (public.acesso_tenant(tenant_id));

-- fingerprint agora é único por empresa+usuário
ALTER TABLE public.erros_sistema DROP CONSTRAINT IF EXISTS erros_sistema_fingerprint_user_id_key;
DROP INDEX IF EXISTS public.erros_sistema_fingerprint_user_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS erros_sistema_tenant_fingerprint_uidx
  ON public.erros_sistema (tenant_id, fingerprint, user_id);

CREATE OR REPLACE FUNCTION public.registrar_erro_sistema(_fingerprint text, _pagina text, _componente text, _operacao text, _endpoint text, _codigo_http integer, _categoria text, _mensagem text, _stack text, _navegador text, _sistema_operacional text, _user_agent text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
    user_agent = EXCLUDED.user_agent
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
$function$;

-- 2) Portal público de diárias: qualquer empresa ativa, identificada pelo link
CREATE OR REPLACE FUNCTION public.tenant_publico(_slug text)
 RETURNS TABLE(id uuid, nome text, slug text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT t.id, t.nome, t.slug
  FROM public.tenants t
  WHERE t.ativo AND t.status = 'ativo'
    AND (t.slug = NULLIF(btrim(coalesce(_slug,'')), '') OR NULLIF(btrim(coalesce(_slug,'')), '') IS NULL)
  ORDER BY (t.slug = coalesce(_slug,'')) DESC, t.created_at
  LIMIT 1
$function$;

REVOKE ALL ON FUNCTION public.tenant_publico(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tenant_publico(text) TO anon, authenticated;

DROP POLICY IF EXISTS "Portal publico apenas cadastra" ON public.daily_workers;
CREATE POLICY "Portal publico apenas cadastra" ON public.daily_workers
  AS PERMISSIVE FOR INSERT TO anon
  WITH CHECK (
    consent_accepted
    AND status = 'novo'
    AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.ativo AND t.status = 'ativo')
  );

-- 3) Empresa nova já nasce provisionada
CREATE OR REPLACE FUNCTION public.provisionar_tenant(_nome text, _slug text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _novo uuid;
  _modelo uuid := public.tenant_padrao();
  _nome_limpo text := btrim(coalesce(_nome, ''));
  _slug_limpo text := btrim(lower(coalesce(_slug, '')));
BEGIN
  IF NOT public.eh_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas a CEO pode criar empresas.' USING ERRCODE = '42501';
  END IF;
  IF _nome_limpo = '' OR _slug_limpo = '' THEN
    RAISE EXCEPTION 'Informe nome e identificador da empresa.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.tenants WHERE slug = _slug_limpo) THEN
    RAISE EXCEPTION 'Já existe uma empresa com este identificador.';
  END IF;

  INSERT INTO public.tenants (nome, slug) VALUES (_nome_limpo, _slug_limpo) RETURNING id INTO _novo;

  INSERT INTO public.perfis_acesso (tenant_id, chave, nome, descricao, sistema)
  SELECT _novo, p.chave, p.nome, p.descricao, p.sistema
  FROM public.perfis_acesso p WHERE p.tenant_id = _modelo;

  INSERT INTO public.perfil_permissoes (tenant_id, perfil_id, modulo, acao, permitido)
  SELECT _novo, novo_perfil.id, pp.modulo, pp.acao, pp.permitido
  FROM public.perfil_permissoes pp
  JOIN public.perfis_acesso modelo_perfil ON modelo_perfil.id = pp.perfil_id AND modelo_perfil.tenant_id = _modelo
  JOIN public.perfis_acesso novo_perfil ON novo_perfil.tenant_id = _novo AND novo_perfil.chave = modelo_perfil.chave
  WHERE pp.tenant_id = _modelo;

  INSERT INTO public.configuracoes (tenant_id, chave, valor)
  SELECT _novo, c.chave, c.valor FROM public.configuracoes c WHERE c.tenant_id = _modelo;

  INSERT INTO public.auditoria (tabela, registro_id, acao, descricao, campo, valor_anterior, valor_novo, usuario_id, usuario_nome, tenant_id)
  VALUES ('tenants', _novo, 'INSERT', format('Empresa criada: %s', _nome_limpo), 'slug', '', _slug_limpo,
          auth.uid(), COALESCE((SELECT nome FROM public.profiles WHERE id = auth.uid()), 'CEO'), _novo);

  RETURN _novo;
END $function$;

REVOKE ALL ON FUNCTION public.provisionar_tenant(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provisionar_tenant(text, text) TO authenticated;

-- 4) Sem convite com empresa definida, não cria usuário quando há mais de uma empresa
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _tenant uuid;
BEGIN
  BEGIN
    _tenant := NULLIF(NEW.raw_user_meta_data->>'tenant_id','')::uuid;
  EXCEPTION WHEN others THEN _tenant := NULL;
  END;
  IF _tenant IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = _tenant) THEN
    _tenant := NULL;
  END IF;

  IF _tenant IS NULL THEN
    IF (SELECT count(*) FROM public.tenants) > 1 THEN
      RAISE EXCEPTION 'Cadastro sem empresa definida: use um convite válido.' USING ERRCODE = '42501';
    END IF;
    _tenant := public.tenant_padrao();
  END IF;

  INSERT INTO public.profiles (id, nome, email, tenant_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)), NEW.email, _tenant)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN (SELECT count(*) FROM public.user_roles WHERE role='admin') = 0 THEN 'admin'::public.app_role ELSE 'programadora'::public.app_role END)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $function$;