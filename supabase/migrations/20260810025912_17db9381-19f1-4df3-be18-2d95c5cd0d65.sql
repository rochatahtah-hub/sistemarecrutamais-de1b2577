CREATE TABLE public.auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela text NOT NULL,
  registro_id uuid,
  acao text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  campo text NOT NULL DEFAULT '',
  valor_anterior text NOT NULL DEFAULT '',
  valor_novo text NOT NULL DEFAULT '',
  usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  usuario_nome text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.auditoria TO authenticated;
GRANT ALL ON public.auditoria TO service_role;

ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY auditoria_select ON public.auditoria FOR SELECT TO authenticated USING (true);
CREATE POLICY auditoria_insert ON public.auditoria FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY auditoria_delete ON public.auditoria FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_auditoria_created_at ON public.auditoria (created_at DESC);
CREATE INDEX idx_auditoria_tabela ON public.auditoria (tabela);

CREATE OR REPLACE FUNCTION public.registrar_auditoria()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      INSERT INTO public.auditoria (tabela, registro_id, acao, descricao, campo, valor_anterior, valor_novo, usuario_id, usuario_nome)
      VALUES (TG_TABLE_NAME, _rid, 'UPDATE', left(_desc, 300), _campo, left(coalesce(_antes,''), 500), left(coalesce(_depois,''), 500), auth.uid(), _nome);
    END IF;
  END LOOP;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_auditoria_vagas AFTER INSERT OR UPDATE OR DELETE ON public.vagas FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();
CREATE TRIGGER trg_auditoria_candidatos AFTER INSERT OR UPDATE OR DELETE ON public.candidatos FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();
CREATE TRIGGER trg_auditoria_empresas AFTER INSERT OR UPDATE OR DELETE ON public.empresas FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();
CREATE TRIGGER trg_auditoria_colaboradores AFTER INSERT OR UPDATE OR DELETE ON public.colaboradores FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();
CREATE TRIGGER trg_auditoria_bloqueados AFTER INSERT OR UPDATE OR DELETE ON public.colaboradores_bloqueados FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();