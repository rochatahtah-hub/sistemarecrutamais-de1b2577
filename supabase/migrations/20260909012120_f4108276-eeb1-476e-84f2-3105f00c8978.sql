CREATE OR REPLACE FUNCTION public.registrar_auditoria_captacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _rid uuid;
  _tenant uuid;
  _desc text;
  _nome text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _rid := OLD.id; _tenant := OLD.tenant_id;
  ELSE
    _rid := NEW.id; _tenant := NEW.tenant_id;
  END IF;

  _desc := COALESCE(
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)->>'titulo' ELSE to_jsonb(NEW)->>'titulo' END,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)->>'nome' ELSE to_jsonb(NEW)->>'nome' END,
    TG_TABLE_NAME
  );

  SELECT p.nome INTO _nome FROM public.profiles p WHERE p.id = auth.uid();

  INSERT INTO public.auditoria (
    tabela, registro_id, acao, descricao, campo, valor_anterior, valor_novo,
    usuario_id, usuario_nome, tenant_id
  ) VALUES (
    TG_TABLE_NAME, _rid, TG_OP, left(_desc, 300), '', '', '',
    auth.uid(), COALESCE(_nome, 'Portal público'), _tenant
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_auditoria_captacao() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_auditoria_captacao_candidaturas ON public.captacao_candidaturas;
DROP TRIGGER IF EXISTS trg_auditoria_captacao_oportunidades ON public.captacao_oportunidades;
DROP TRIGGER IF EXISTS trg_auditoria_captacao_config ON public.captacao_config;

CREATE TRIGGER trg_auditoria_captacao_candidaturas
AFTER INSERT OR UPDATE OR DELETE ON public.captacao_candidaturas
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_captacao();

CREATE TRIGGER trg_auditoria_captacao_oportunidades
AFTER INSERT OR UPDATE OR DELETE ON public.captacao_oportunidades
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_captacao();