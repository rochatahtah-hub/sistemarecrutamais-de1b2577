-- ============ LEVANTAMENTO DIÁRIO ============
-- Alteração incremental e aditiva: nenhuma coluna/tabela existente é alterada
-- ou removida. Não afeta os levantamentos de Quinzena/Mês/Ano já existentes.

-- 1) Data de fechamento real da vaga (preenchida só no momento da confirmação,
--    nunca por trigger genérico — não confundir com updated_at/created_at/data).
ALTER TABLE public.vagas ADD COLUMN IF NOT EXISTS confirmado_em timestamptz;
CREATE INDEX IF NOT EXISTS vagas_confirmado_em_idx ON public.vagas (tenant_id, confirmado_em);

-- 2) Tabelas novas
CREATE TABLE public.levantamentos_diarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT COALESCE(public.tenant_atual(), public.tenant_padrao())
    REFERENCES public.tenants(id) ON DELETE CASCADE,
  data_referencia date NOT NULL,
  vagas_fechadas integer NOT NULL DEFAULT 0,
  presencas integer NOT NULL DEFAULT 0,
  faltas integer NOT NULL DEFAULT 0,
  cancelamentos integer NOT NULL DEFAULT 0,
  pct_presenca numeric(5,2) NOT NULL DEFAULT 0,
  pct_falta numeric(5,2) NOT NULL DEFAULT 0,
  pct_cancelamento numeric(5,2) NOT NULL DEFAULT 0,
  origem text NOT NULL DEFAULT 'automatico' CHECK (origem IN ('automatico','manual','reprocessamento')),
  gerado_em timestamptz NOT NULL DEFAULT now(),
  reprocessado_em timestamptz,
  reprocessado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reprocessado_por_nome text NOT NULL DEFAULT '',
  vezes_reprocessado integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX levantamentos_diarios_tenant_data_uidx ON public.levantamentos_diarios (tenant_id, data_referencia);

CREATE TABLE public.levantamento_diario_programadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT COALESCE(public.tenant_atual(), public.tenant_padrao())
    REFERENCES public.tenants(id) ON DELETE CASCADE,
  levantamento_id uuid NOT NULL REFERENCES public.levantamentos_diarios(id) ON DELETE CASCADE,
  programadora_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  programadora_nome text NOT NULL DEFAULT '',
  vagas_fechadas integer NOT NULL DEFAULT 0,
  presencas integer NOT NULL DEFAULT 0,
  faltas integer NOT NULL DEFAULT 0,
  cancelamentos integer NOT NULL DEFAULT 0,
  pct_presenca numeric(5,2) NOT NULL DEFAULT 0,
  pct_falta numeric(5,2) NOT NULL DEFAULT 0,
  pct_cancelamento numeric(5,2) NOT NULL DEFAULT 0,
  vaga_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX levantamento_diario_prog_uidx ON public.levantamento_diario_programadores (levantamento_id, programadora_id);
CREATE INDEX levantamento_diario_prog_tenant_idx ON public.levantamento_diario_programadores (tenant_id, levantamento_id);

CREATE TABLE public.levantamento_diario_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT COALESCE(public.tenant_atual(), public.tenant_padrao())
    REFERENCES public.tenants(id) ON DELETE CASCADE,
  hora_geracao integer NOT NULL DEFAULT 18 CHECK (hora_geracao BETWEEN 0 AND 23),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX levantamento_diario_config_tenant_idx ON public.levantamento_diario_config (tenant_id);

-- 3) GRANT + RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.levantamentos_diarios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.levantamento_diario_programadores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.levantamento_diario_config TO authenticated;
GRANT ALL ON public.levantamentos_diarios TO service_role;
GRANT ALL ON public.levantamento_diario_programadores TO service_role;
GRANT ALL ON public.levantamento_diario_config TO service_role;
ALTER TABLE public.levantamentos_diarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.levantamento_diario_programadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.levantamento_diario_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY levantamentos_diarios_isolamento_tenant ON public.levantamentos_diarios
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.acesso_tenant(tenant_id)) WITH CHECK (public.acesso_tenant(tenant_id));
CREATE POLICY levantamento_diario_prog_isolamento_tenant ON public.levantamento_diario_programadores
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.acesso_tenant(tenant_id)) WITH CHECK (public.acesso_tenant(tenant_id));
CREATE POLICY levantamento_diario_config_isolamento_tenant ON public.levantamento_diario_config
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.acesso_tenant(tenant_id)) WITH CHECK (public.acesso_tenant(tenant_id));

CREATE POLICY levantamentos_diarios_select ON public.levantamentos_diarios FOR SELECT TO authenticated
  USING (public.tem_permissao(auth.uid(), 'levantamento_diario', 'visualizar'));
CREATE POLICY levantamentos_diarios_insert ON public.levantamentos_diarios FOR INSERT TO authenticated
  WITH CHECK (public.tem_permissao(auth.uid(), 'levantamento_diario', 'reprocessar'));
CREATE POLICY levantamentos_diarios_update ON public.levantamentos_diarios FOR UPDATE TO authenticated
  USING (public.tem_permissao(auth.uid(), 'levantamento_diario', 'reprocessar'))
  WITH CHECK (public.tem_permissao(auth.uid(), 'levantamento_diario', 'reprocessar'));

CREATE POLICY levantamento_diario_prog_select ON public.levantamento_diario_programadores FOR SELECT TO authenticated
  USING (public.tem_permissao(auth.uid(), 'levantamento_diario', 'detalhar'));
CREATE POLICY levantamento_diario_prog_insert ON public.levantamento_diario_programadores FOR INSERT TO authenticated
  WITH CHECK (public.tem_permissao(auth.uid(), 'levantamento_diario', 'reprocessar'));
CREATE POLICY levantamento_diario_prog_update ON public.levantamento_diario_programadores FOR UPDATE TO authenticated
  USING (public.tem_permissao(auth.uid(), 'levantamento_diario', 'reprocessar'))
  WITH CHECK (public.tem_permissao(auth.uid(), 'levantamento_diario', 'reprocessar'));
CREATE POLICY levantamento_diario_prog_delete ON public.levantamento_diario_programadores FOR DELETE TO authenticated
  USING (public.tem_permissao(auth.uid(), 'levantamento_diario', 'reprocessar'));

CREATE POLICY levantamento_diario_config_select ON public.levantamento_diario_config FOR SELECT TO authenticated
  USING (public.tem_permissao(auth.uid(), 'levantamento_diario', 'visualizar'));
CREATE POLICY levantamento_diario_config_insert ON public.levantamento_diario_config FOR INSERT TO authenticated
  WITH CHECK (public.tem_permissao(auth.uid(), 'levantamento_diario', 'configurar'));
CREATE POLICY levantamento_diario_config_update ON public.levantamento_diario_config FOR UPDATE TO authenticated
  USING (public.tem_permissao(auth.uid(), 'levantamento_diario', 'configurar'))
  WITH CHECK (public.tem_permissao(auth.uid(), 'levantamento_diario', 'configurar'));

-- 4) Triggers (tenant / updated_at / auditoria)
CREATE TRIGGER levantamentos_diarios_tenant BEFORE INSERT OR UPDATE ON public.levantamentos_diarios
  FOR EACH ROW EXECUTE FUNCTION public.aplicar_tenant();
CREATE TRIGGER levantamento_diario_prog_tenant BEFORE INSERT OR UPDATE ON public.levantamento_diario_programadores
  FOR EACH ROW EXECUTE FUNCTION public.aplicar_tenant();
CREATE TRIGGER levantamento_diario_config_tenant BEFORE INSERT OR UPDATE ON public.levantamento_diario_config
  FOR EACH ROW EXECUTE FUNCTION public.aplicar_tenant();

CREATE TRIGGER levantamentos_diarios_updated_at BEFORE UPDATE ON public.levantamentos_diarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER levantamento_diario_prog_updated_at BEFORE UPDATE ON public.levantamento_diario_programadores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER levantamento_diario_config_updated_at BEFORE UPDATE ON public.levantamento_diario_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- registrar_auditoria() (o trigger genérico usado por vagas/candidatos/etc.) deixa o
-- tenant_id da linha de auditoria por conta do DEFAULT da coluna
-- (COALESCE(tenant_atual(), tenant_padrao())), que só resolve com auth.uid() real.
-- O job automático do Levantamento Diário grava via service_role (sem auth.uid()),
-- então usa esta variante — mesmo princípio já usado por registrar_auditoria_captacao()
-- para as escritas públicas de Captação — que copia o tenant_id da própria linha
-- auditada em vez de depender do usuário logado.
CREATE OR REPLACE FUNCTION public.registrar_auditoria_levantamento_diario()
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
  _tenant uuid;
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
  _tenant := (coalesce(_novo->>'tenant_id', _antigo->>'tenant_id'))::uuid;
  _desc := coalesce(_novo->>'nome', _antigo->>'nome', _novo->>'descricao', _antigo->>'descricao', '');

  IF TG_OP <> 'UPDATE' THEN
    INSERT INTO public.auditoria (tabela, registro_id, acao, descricao, campo, valor_anterior, valor_novo, usuario_id, usuario_nome, tenant_id)
    VALUES (TG_TABLE_NAME, _rid, TG_OP, left(_desc, 300), '', '', '', auth.uid(), _nome, _tenant);
    RETURN COALESCE(NEW, OLD);
  END IF;

  _campos := ARRAY(SELECT jsonb_object_keys(_novo));
  FOREACH _campo IN ARRAY _campos LOOP
    IF _campo IN ('updated_at','created_at') THEN CONTINUE; END IF;
    _antes := _antigo->>_campo;
    _depois := _novo->>_campo;
    IF _antes IS DISTINCT FROM _depois THEN
      INSERT INTO public.auditoria (tabela, registro_id, acao, descricao, campo, valor_anterior, valor_novo, usuario_id, usuario_nome, tenant_id)
      VALUES (TG_TABLE_NAME, _rid, 'UPDATE', left(_desc, 300), _campo, left(coalesce(_antes,''), 500), left(coalesce(_depois,''), 500), auth.uid(), _nome, _tenant);
    END IF;
  END LOOP;
  RETURN NEW;
END; $function$;
REVOKE ALL ON FUNCTION public.registrar_auditoria_levantamento_diario() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_auditoria_levantamentos_diarios AFTER INSERT OR UPDATE OR DELETE ON public.levantamentos_diarios
  FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_levantamento_diario();
CREATE TRIGGER trg_auditoria_levantamento_diario_prog AFTER INSERT OR UPDATE OR DELETE ON public.levantamento_diario_programadores
  FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_levantamento_diario();
CREATE TRIGGER trg_auditoria_levantamento_diario_config AFTER INSERT OR UPDATE OR DELETE ON public.levantamento_diario_config
  FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_levantamento_diario();

-- 5) Seed de permissões — mesmo critério já usado quando "atendimento"/"pagamentos"/
--    "feedback" foram criados: só o perfil "admin" recebe tudo por padrão, replicado
--    para o perfil admin de CADA tenant (perfis são por tenant, não globais).
ALTER TABLE public.perfil_permissoes DISABLE TRIGGER trg_auditoria_perfil_perm;

INSERT INTO public.perfil_permissoes (perfil_id, tenant_id, modulo, acao, permitido)
SELECT pa.id, pa.tenant_id, 'levantamento_diario', a.acao, pa.chave = 'admin'
FROM public.perfis_acesso pa
CROSS JOIN (
  VALUES ('visualizar'),('detalhar'),('configurar'),('reprocessar'),('exportar'),('receber_notificacao')
) AS a(acao)
ON CONFLICT (perfil_id, modulo, acao) DO NOTHING;

ALTER TABLE public.perfil_permissoes ENABLE TRIGGER trg_auditoria_perfil_perm;

-- 6) Config padrão: 1 linha por tenant existente (hora_geracao=18, ativo=true).
INSERT INTO public.levantamento_diario_config (tenant_id)
SELECT id FROM public.tenants
ON CONFLICT (tenant_id) DO NOTHING;

-- 7) Funções auxiliares server-side (service_role apenas — nunca expostas ao
--    cliente, pois recebem _tenant como parâmetro livre e são SECURITY DEFINER).

-- Vagas cuja data de fechamento (convertida para America/Sao_Paulo) cai em
-- _data — única fonte usada pelo job automático e pelo reprocessamento manual,
-- para nunca recalcular a conversão de fuso em JavaScript.
CREATE OR REPLACE FUNCTION public.levantamento_diario_vagas_do_dia(_tenant uuid, _data date)
RETURNS TABLE (
  id uuid,
  data date,
  quantidade integer,
  status text,
  programadora_id uuid,
  colaborador text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT v.id, v.data, v.quantidade, v.status, v.programadora_id, coalesce(c.nome, '') AS colaborador
  FROM public.vagas v
  LEFT JOIN public.colaboradores c ON c.id = v.colaborador_id
  WHERE v.tenant_id = _tenant
    AND v.confirmado_em IS NOT NULL
    AND (v.confirmado_em AT TIME ZONE 'America/Sao_Paulo')::date = _data
$$;
REVOKE ALL ON FUNCTION public.levantamento_diario_vagas_do_dia(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.levantamento_diario_vagas_do_dia(uuid, date) TO service_role;

-- Programadoras habilitadas de um tenant arbitrário (mesmo filtro de
-- `programadoras_da_programacao()`, mas sem depender de auth.uid()/tenant_atual()
-- — só assim o job automático, sem sessão de usuário, consegue montar a lista
-- de qualquer tenant que estiver processando).
CREATE OR REPLACE FUNCTION public.programadoras_habilitadas_do_tenant(_tenant uuid)
RETURNS TABLE (id uuid, nome text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.nome
  FROM public.profiles p
  WHERE p.tenant_id = _tenant
    AND p.ativo = true
    AND public.tem_permissao(p.id, 'programacao', 'visualizar')
  ORDER BY p.nome
$$;
REVOKE ALL ON FUNCTION public.programadoras_habilitadas_do_tenant(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.programadoras_habilitadas_do_tenant(uuid) TO service_role;

-- Usuários do tenant com uma permissão granular concedida — usado para saber
-- quem recebe a notificação automática (nunca broadcast geral).
CREATE OR REPLACE FUNCTION public.usuarios_com_permissao(_tenant uuid, _modulo text, _acao text)
RETURNS TABLE (user_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id FROM public.profiles p
  WHERE p.tenant_id = _tenant AND p.ativo AND public.tem_permissao(p.id, _modulo, _acao)
$$;
REVOKE ALL ON FUNCTION public.usuarios_com_permissao(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.usuarios_com_permissao(uuid, text, text) TO service_role;

-- 8) Segredo do agendador + cron a cada 15 min (cada tenant decide, na hora
--    de rodar, se já passou do seu horário configurado — ver
--    src/lib/levantamento-diario.server.ts).
INSERT INTO public.cron_secrets (nome, valor)
VALUES ('levantamento-diario', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (nome) DO NOTHING;

DO $$
DECLARE _s text;
BEGIN
  SELECT valor INTO _s FROM public.cron_secrets WHERE nome = 'levantamento-diario';
  BEGIN
    PERFORM cron.unschedule('levantamento-diario-horario');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  PERFORM cron.schedule(
    'levantamento-diario-horario',
    '*/15 * * * *',
    'SELECT net.http_post(' ||
    'url := ''https://project--25dd2353-1a07-45dd-a593-d52eec73a397.lovable.app/api/public/hooks/levantamento-diario'', ' ||
    'headers := ' || quote_literal(jsonb_build_object('Content-Type','application/json','x-cron-secret',_s)::text) || '::jsonb, ' ||
    'body := jsonb_build_object()) as request_id;'
  );
END $$;
