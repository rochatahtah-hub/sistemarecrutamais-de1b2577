-- Correções de segurança (auditoria em 3 etapas, achados P0/P1 confirmados).

-- 1) cpf_colaborador_diaria() não filtrava por tenant: um admin de qualquer empresa
--    conseguia ler o CPF completo de um daily_worker de OUTRA empresa (SECURITY DEFINER
--    ignora RLS). Agora só devolve o CPF quando o daily_worker pertence ao tenant ativo
--    do usuário (ou o usuário é super-admin real, via acesso_tenant()).
CREATE OR REPLACE FUNCTION public.cpf_colaborador_diaria(_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN (public.eh_master(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
      AND EXISTS (
        SELECT 1 FROM public.daily_workers d
        WHERE d.id = _id AND public.acesso_tenant(d.tenant_id)
      )
      THEN (SELECT d.cpf FROM public.daily_workers d WHERE d.id = _id)
    ELSE NULL
  END
$$;

-- 2) Contador de tentativas erradas do PIN administrativo não era atômico
--    (ler "falhas", somar 1 em JS, gravar de volta) — permitia furar o limite de 5
--    tentativas disparando requisições em paralelo. Agora o incremento acontece
--    inteiramente dentro de um UPDATE (atômico no Postgres).
CREATE OR REPLACE FUNCTION public.registrar_falha_pin()
RETURNS TABLE(falhas integer, bloqueado_ate timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _falhas integer;
BEGIN
  UPDATE public.admin_pin AS a
  SET falhas = a.falhas + 1
  WHERE a.id = true
  RETURNING a.falhas INTO _falhas;

  RETURN QUERY SELECT _falhas, admin_pin.bloqueado_ate FROM public.admin_pin WHERE id = true;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_falha_pin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_falha_pin() TO service_role;

-- 3) registrar_auditoria() gravava CPF/telefone/Pix/caminho de documento em texto puro
--    em valor_anterior/valor_novo sempre que um desses campos era editado (ex.: correção
--    de telefone via ferramenta de Banco de Dados). Esses valores agora ficam redigidos
--    no histórico — o registro de QUE o campo mudou continua existindo, só o conteúdo some.
CREATE OR REPLACE FUNCTION public.registrar_auditoria()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _nome text;
  _campos text[];
  _campo text;
  _antes text;
  _depois text;
  _rid uuid;
  _desc text;
  _antigo jsonb;
  _novo jsonb;
  _sensiveis text[] := ARRAY['cpf','telefone','phone','pix_chave','documento_path','documento_nome'];
BEGIN
  SELECT coalesce(p.nome, 'Sistema') INTO _nome FROM public.profiles p WHERE p.id = auth.uid();
  _nome := coalesce(_nome, 'Sistema');

  IF TG_OP = 'DELETE' THEN
    _antigo := to_jsonb(OLD); _novo := '{}'::jsonb;
  ELSIF TG_OP = 'INSERT' THEN
    _antigo := '{}'::jsonb; _novo := to_jsonb(NEW);
  ELSE
    _antigo := to_jsonb(OLD); _novo := to_jsonb(NEW);
  END IF;

  _rid := (coalesce(_novo->>'id', _antigo->>'id'))::uuid;
  _desc := coalesce(_novo->>'nome', _antigo->>'nome', _novo->>'descricao', _antigo->>'descricao', '');

  IF TG_OP <> 'UPDATE' THEN
    INSERT INTO public.auditoria (tabela, registro_id, acao, descricao, campo, valor_anterior, valor_novo, usuario_id, usuario_nome)
    VALUES (TG_TABLE_NAME, _rid, TG_OP, left(_desc, 300), '', '', '', auth.uid(), _nome);
    RETURN COALESCE(NEW, OLD);
  END IF;

  _campos := ARRAY(SELECT jsonb_object_keys(_novo));
  FOREACH _campo IN ARRAY _campos LOOP
    IF _campo IN ('updated_at','created_at') THEN CONTINUE; END IF;
    _antes := _antigo->>_campo;
    _depois := _novo->>_campo;
    IF _antes IS DISTINCT FROM _depois THEN
      IF _campo = ANY(_sensiveis) THEN
        _antes := CASE WHEN _antes IS NULL THEN NULL ELSE '[redigido]' END;
        _depois := CASE WHEN _depois IS NULL THEN NULL ELSE '[redigido]' END;
      END IF;
      INSERT INTO public.auditoria (tabela, registro_id, acao, descricao, campo, valor_anterior, valor_novo, usuario_id, usuario_nome)
      VALUES (TG_TABLE_NAME, _rid, 'UPDATE', left(_desc, 300), _campo, left(coalesce(_antes,''), 500), left(coalesce(_depois,''), 500), auth.uid(), _nome);
    END IF;
  END LOOP;
  RETURN NEW;
END; $function$
;
