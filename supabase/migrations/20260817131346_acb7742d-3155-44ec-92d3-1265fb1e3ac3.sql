-- 1) aplicar_tenant respeita o modo de provisionamento (apenas super admin, via função interna)
CREATE OR REPLACE FUNCTION public.aplicar_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _meu uuid := COALESCE(public.tenant_ativo(), public.tenant_padrao());
  _prov uuid;
BEGIN
  BEGIN
    _prov := NULLIF(current_setting('app.provisionando_tenant', true), '')::uuid;
  EXCEPTION WHEN others THEN _prov := NULL;
  END;
  IF _prov IS NOT NULL AND public.eh_super_admin(auth.uid()) THEN
    IF TG_OP = 'INSERT' THEN
      NEW.tenant_id := COALESCE(NEW.tenant_id, _prov);
      RETURN NEW;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NULL THEN
      NEW.tenant_id := COALESCE(NEW.tenant_id, _meu);
    ELSE
      NEW.tenant_id := _meu;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    RAISE EXCEPTION 'Acesso negado: não é permitido alterar a empresa do registro.' USING ERRCODE = '42501';
  END IF;
  IF auth.uid() IS NOT NULL AND OLD.tenant_id IS DISTINCT FROM _meu THEN
    RAISE EXCEPTION 'Acesso negado: registro pertence a outra empresa.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $function$;

-- 2) provisionar_tenant grava tudo na empresa nova
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
  IF _nome_limpo = '' THEN
    RAISE EXCEPTION 'Informe o nome da empresa.';
  END IF;
  IF _slug_limpo = '' THEN
    _slug_limpo := regexp_replace(lower(unaccent_imutavel(_nome_limpo)), '[^a-z0-9]+', '-', 'g');
    _slug_limpo := btrim(_slug_limpo, '-');
  END IF;
  IF _slug_limpo = '' THEN
    RAISE EXCEPTION 'Informe um identificador válido para a empresa.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.tenants WHERE slug = _slug_limpo) THEN
    RAISE EXCEPTION 'Já existe uma empresa com este identificador.';
  END IF;

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

REVOKE EXECUTE ON FUNCTION public.provisionar_tenant(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.provisionar_tenant(text, text) TO authenticated;