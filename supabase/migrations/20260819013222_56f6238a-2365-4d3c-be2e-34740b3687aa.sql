CREATE OR REPLACE FUNCTION public.slug_publico(_texto text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT btrim(regexp_replace(
    lower(translate(coalesce(_texto, ''),
      'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäéèêëíìîïóòôõöúùûüçñ',
      'AAAAAEEEEIIIIOOOOOUUUUCNaaaaaeeeeiiiiooooouuuucn')),
    '[^a-z0-9]+', '-', 'g'), '-')
$function$;

REVOKE ALL ON FUNCTION public.slug_publico(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.slug_publico(text) TO authenticated, service_role;

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
  _base text;
  _n int := 1;
BEGIN
  IF NOT public.eh_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas a CEO pode criar empresas.' USING ERRCODE = '42501';
  END IF;
  IF _nome_limpo = '' THEN
    RAISE EXCEPTION 'Informe o nome da empresa.';
  END IF;
  _slug_limpo := public.slug_publico(COALESCE(NULLIF(_slug_limpo, ''), _nome_limpo));
  IF _slug_limpo = '' THEN
    RAISE EXCEPTION 'Informe um identificador válido para a empresa.';
  END IF;
  _base := left(_slug_limpo, 60);
  _slug_limpo := _base;
  WHILE EXISTS (SELECT 1 FROM public.tenants WHERE slug = _slug_limpo) LOOP
    _n := _n + 1;
    _slug_limpo := _base || '-' || _n::text;
  END LOOP;

  INSERT INTO public.tenants (nome, slug) VALUES (_nome_limpo, _slug_limpo) RETURNING id INTO _novo;

  PERFORM set_config('app.provisionando_tenant', _novo::text, true);

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
  VALUES ('tenants', _novo, 'criar', 'Empresa criada: ' || _nome_limpo, 'nome', '', _nome_limpo, auth.uid(),
          COALESCE((SELECT nome FROM public.profiles WHERE id = auth.uid()), 'CEO'), _novo);

  PERFORM set_config('app.provisionando_tenant', '', true);
  RETURN _novo;
END $function$;

CREATE OR REPLACE FUNCTION public.definir_slug_tenant(_tenant uuid, _slug text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _limpo text;
  _antigo text;
BEGIN
  IF NOT public.eh_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas a CEO pode alterar o link público.' USING ERRCODE = '42501';
  END IF;
  _limpo := left(public.slug_publico(_slug), 60);
  IF length(_limpo) < 3 THEN
    RAISE EXCEPTION 'Informe um identificador com pelo menos 3 letras ou números.';
  END IF;
  SELECT slug INTO _antigo FROM public.tenants WHERE id = _tenant;
  IF _antigo IS NULL THEN
    RAISE EXCEPTION 'Empresa não encontrada.';
  END IF;
  IF _limpo = _antigo THEN
    RETURN _antigo;
  END IF;
  IF EXISTS (SELECT 1 FROM public.tenants WHERE slug = _limpo) THEN
    RAISE EXCEPTION 'Já existe uma empresa com este identificador.';
  END IF;
  UPDATE public.tenants SET slug = _limpo, updated_at = now() WHERE id = _tenant;
  PERFORM public.registrar_log_tenant(_tenant, 'renomear',
    'Link público alterado de ' || _antigo || ' para ' || _limpo);
  RETURN _limpo;
END $function$;