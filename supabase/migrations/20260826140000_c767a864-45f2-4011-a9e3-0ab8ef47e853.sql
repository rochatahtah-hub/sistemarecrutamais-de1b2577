-- Fluxo Atendimento: conferência operacional entre Programação e Financeiro.
-- Aditivo: cria duas tabelas novas, adiciona um travamento mínimo em pagamentos()
-- e não altera nenhum dado ou comportamento existente para vagas já registradas.

CREATE TABLE public.atendimento_conferencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vaga_id uuid NOT NULL UNIQUE REFERENCES public.vagas(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL DEFAULT COALESCE(public.tenant_atual(), public.tenant_padrao()) REFERENCES public.tenants(id),

  status_validacao text NOT NULL DEFAULT 'PENDENTE',
  validado_por uuid REFERENCES auth.users(id),
  validado_por_nome text NOT NULL DEFAULT '',
  validado_em timestamptz,

  horario_realizado_entrada text NOT NULL DEFAULT '',
  horario_realizado_saida text NOT NULL DEFAULT '',
  jornada_completa text,
  horas_trabalhadas numeric(6,2),
  motivo_jornada_parcial text NOT NULL DEFAULT '',

  valor_diaria numeric(10,2),
  tem_ajuda_custo boolean NOT NULL DEFAULT false,
  ajuda_custo_valor numeric(10,2) NOT NULL DEFAULT 0,
  tipo_adicional text NOT NULL DEFAULT 'NENHUM',
  adicional_percentual numeric(5,2) NOT NULL DEFAULT 0,
  adicional_motivo text NOT NULL DEFAULT '',
  total_estimado numeric(10,2),

  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  observacao text NOT NULL DEFAULT '',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT atendimento_conferencias_status_valido
    CHECK (status_validacao IN ('PENDENTE','VALIDADO','DIVERGENCIA','HISTORICO_NAO_AVALIADO')),
  CONSTRAINT atendimento_conferencias_jornada_valida
    CHECK (jornada_completa IS NULL OR jornada_completa IN ('SIM','NAO','PARCIAL')),
  CONSTRAINT atendimento_conferencias_adicional_valido
    CHECK (tipo_adicional IN ('NENHUM','SABADO','DOMINGO','FERIADO','OUTRO'))
);

CREATE INDEX atendimento_conferencias_tenant_status_idx
  ON public.atendimento_conferencias (tenant_id, status_validacao);

GRANT SELECT, INSERT, UPDATE ON public.atendimento_conferencias TO authenticated;
GRANT ALL ON public.atendimento_conferencias TO service_role;

ALTER TABLE public.atendimento_conferencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY atendimento_conferencias_isolamento_tenant ON public.atendimento_conferencias
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.acesso_tenant(tenant_id))
  WITH CHECK (public.acesso_tenant(tenant_id));

CREATE POLICY atendimento_conferencias_select ON public.atendimento_conferencias
  FOR SELECT TO authenticated
  USING (public.tem_permissao(auth.uid(), 'atendimento', 'visualizar'));

CREATE POLICY atendimento_conferencias_insert ON public.atendimento_conferencias
  FOR INSERT TO authenticated
  WITH CHECK (public.tem_permissao(auth.uid(), 'atendimento', 'conferir'));

CREATE POLICY atendimento_conferencias_update ON public.atendimento_conferencias
  FOR UPDATE TO authenticated
  USING (
    public.tem_permissao(auth.uid(), 'atendimento', 'conferir')
    OR public.tem_permissao(auth.uid(), 'atendimento', 'validar')
    OR public.tem_permissao(auth.uid(), 'atendimento', 'resolver_divergencia')
  )
  WITH CHECK (
    public.tem_permissao(auth.uid(), 'atendimento', 'conferir')
    OR public.tem_permissao(auth.uid(), 'atendimento', 'validar')
    OR public.tem_permissao(auth.uid(), 'atendimento', 'resolver_divergencia')
  );
-- Sem policy de DELETE: nenhuma ficha de conferência pode ser apagada (regra 6 do pedido).

CREATE TRIGGER atendimento_conferencias_tenant BEFORE INSERT OR UPDATE ON public.atendimento_conferencias
  FOR EACH ROW EXECUTE FUNCTION public.aplicar_tenant();

CREATE TRIGGER atendimento_conferencias_updated_at BEFORE UPDATE ON public.atendimento_conferencias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_auditoria_atendimento_conferencias
  AFTER INSERT OR UPDATE OR DELETE ON public.atendimento_conferencias
  FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();

-- Guarda quem validou e bloqueia edição de valores/validação sem a permissão específica,
-- mesmo que a chamada venha direto da API (regra 38/50 do pedido).
CREATE OR REPLACE FUNCTION public.validar_atendimento_conferencia()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_nome text;
  v_alterou_valores boolean;
BEGIN
  v_alterou_valores := CASE
    WHEN TG_OP = 'INSERT' THEN
      COALESCE(NEW.valor_diaria, 0) <> 0
      OR COALESCE(NEW.ajuda_custo_valor, 0) <> 0
      OR COALESCE(NEW.adicional_percentual, 0) <> 0
    ELSE
      NEW.valor_diaria IS DISTINCT FROM OLD.valor_diaria
      OR NEW.ajuda_custo_valor IS DISTINCT FROM OLD.ajuda_custo_valor
      OR NEW.tem_ajuda_custo IS DISTINCT FROM OLD.tem_ajuda_custo
      OR NEW.adicional_percentual IS DISTINCT FROM OLD.adicional_percentual
      OR NEW.tipo_adicional IS DISTINCT FROM OLD.tipo_adicional
  END;

  IF v_alterou_valores AND NOT public.tem_permissao(v_uid, 'atendimento_valores', 'editar') THEN
    RAISE EXCEPTION 'Sem permissão para alterar valores da conferência.' USING ERRCODE = '42501';
  END IF;

  IF NEW.status_validacao = 'VALIDADO'
     AND (TG_OP = 'INSERT' OR OLD.status_validacao IS DISTINCT FROM 'VALIDADO') THEN
    IF EXISTS (
      SELECT 1 FROM public.atendimento_divergencias d
      WHERE d.conferencia_id = NEW.id AND d.status = 'ABERTA'
    ) THEN
      RAISE EXCEPTION 'Não é possível validar: existe divergência aberta para esta ficha.';
    END IF;
    IF NOT public.tem_permissao(v_uid, 'atendimento', 'validar') THEN
      RAISE EXCEPTION 'Sem permissão para validar.' USING ERRCODE = '42501';
    END IF;
    SELECT p.nome INTO v_nome FROM public.profiles p WHERE p.id = v_uid;
    NEW.validado_por := v_uid;
    NEW.validado_por_nome := COALESCE(v_nome, '');
    NEW.validado_em := now();
  ELSIF NEW.status_validacao <> 'VALIDADO' THEN
    NEW.validado_por := NULL;
    NEW.validado_por_nome := '';
    NEW.validado_em := NULL;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validar_atendimento_conferencia() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER atendimento_conferencias_validar BEFORE INSERT OR UPDATE ON public.atendimento_conferencias
  FOR EACH ROW EXECUTE FUNCTION public.validar_atendimento_conferencia();

-- Histórico de divergências: nunca apagado, pode ter vários ciclos por ficha.
CREATE TABLE public.atendimento_divergencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conferencia_id uuid NOT NULL REFERENCES public.atendimento_conferencias(id) ON DELETE CASCADE,
  vaga_id uuid NOT NULL REFERENCES public.vagas(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL DEFAULT COALESCE(public.tenant_atual(), public.tenant_padrao()) REFERENCES public.tenants(id),

  tipo text NOT NULL DEFAULT '',
  observacao text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'ABERTA',

  aberta_por uuid REFERENCES auth.users(id),
  aberta_por_nome text NOT NULL DEFAULT '',
  aberta_em timestamptz NOT NULL DEFAULT now(),

  resolvida_por uuid REFERENCES auth.users(id),
  resolvida_por_nome text NOT NULL DEFAULT '',
  resolvida_em timestamptz,
  resultado text NOT NULL DEFAULT '',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT atendimento_divergencias_status_valido CHECK (status IN ('ABERTA','RESOLVIDA'))
);

CREATE INDEX atendimento_divergencias_conferencia_idx ON public.atendimento_divergencias (conferencia_id);
CREATE INDEX atendimento_divergencias_tenant_status_idx ON public.atendimento_divergencias (tenant_id, status);

GRANT SELECT, INSERT, UPDATE ON public.atendimento_divergencias TO authenticated;
GRANT ALL ON public.atendimento_divergencias TO service_role;

ALTER TABLE public.atendimento_divergencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY atendimento_divergencias_isolamento_tenant ON public.atendimento_divergencias
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.acesso_tenant(tenant_id))
  WITH CHECK (public.acesso_tenant(tenant_id));

CREATE POLICY atendimento_divergencias_select ON public.atendimento_divergencias
  FOR SELECT TO authenticated
  USING (public.tem_permissao(auth.uid(), 'atendimento', 'visualizar'));

CREATE POLICY atendimento_divergencias_insert ON public.atendimento_divergencias
  FOR INSERT TO authenticated
  WITH CHECK (public.tem_permissao(auth.uid(), 'atendimento', 'apontar_divergencia'));

CREATE POLICY atendimento_divergencias_update ON public.atendimento_divergencias
  FOR UPDATE TO authenticated
  USING (public.tem_permissao(auth.uid(), 'atendimento', 'resolver_divergencia'))
  WITH CHECK (public.tem_permissao(auth.uid(), 'atendimento', 'resolver_divergencia'));
-- Sem policy de DELETE: divergência nunca é apagada, só resolvida (regra 15 do pedido).

CREATE TRIGGER atendimento_divergencias_tenant BEFORE INSERT OR UPDATE ON public.atendimento_divergencias
  FOR EACH ROW EXECUTE FUNCTION public.aplicar_tenant();

CREATE TRIGGER atendimento_divergencias_updated_at BEFORE UPDATE ON public.atendimento_divergencias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_auditoria_atendimento_divergencias
  AFTER INSERT OR UPDATE OR DELETE ON public.atendimento_divergencias
  FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();

-- Carimba quem abriu/resolveu a divergência a partir da sessão autenticada (não confia no
-- que o cliente manda), mesmo padrão de pago_por/pago_por_nome em validar_pagamento().
CREATE OR REPLACE FUNCTION public.carimbar_divergencia()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_nome text;
BEGIN
  SELECT p.nome INTO v_nome FROM public.profiles p WHERE p.id = v_uid;

  IF TG_OP = 'INSERT' THEN
    NEW.aberta_por := v_uid;
    NEW.aberta_por_nome := COALESCE(v_nome, '');
    NEW.aberta_em := now();
    NEW.status := 'ABERTA';
    NEW.resolvida_por := NULL;
    NEW.resolvida_por_nome := '';
    NEW.resolvida_em := NULL;
  ELSIF NEW.status = 'RESOLVIDA' AND OLD.status = 'ABERTA' THEN
    NEW.resolvida_por := v_uid;
    NEW.resolvida_por_nome := COALESCE(v_nome, '');
    NEW.resolvida_em := now();
  ELSIF NEW.status = 'ABERTA' AND OLD.status = 'RESOLVIDA' THEN
    RAISE EXCEPTION 'Uma divergência resolvida não pode voltar a ficar aberta. Abra uma nova divergência.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.carimbar_divergencia() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER atendimento_divergencias_carimba BEFORE INSERT OR UPDATE ON public.atendimento_divergencias
  FOR EACH ROW EXECUTE FUNCTION public.carimbar_divergencia();

-- Mantém o status de validação da ficha sincronizado com o ciclo de divergência:
-- abrir trava em DIVERGENCIA, resolver (sem outra divergência aberta) devolve para
-- PENDENTE — nunca pula direto para VALIDADO (regra 15 do pedido).
CREATE OR REPLACE FUNCTION public.sincronizar_status_divergencia()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'ABERTA' THEN
    UPDATE public.atendimento_conferencias
       SET status_validacao = 'DIVERGENCIA', updated_at = now()
     WHERE id = NEW.conferencia_id AND status_validacao <> 'DIVERGENCIA';
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'ABERTA' AND NEW.status = 'RESOLVIDA' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.atendimento_divergencias d
      WHERE d.conferencia_id = NEW.conferencia_id AND d.status = 'ABERTA' AND d.id <> NEW.id
    ) THEN
      UPDATE public.atendimento_conferencias
         SET status_validacao = 'PENDENTE', updated_at = now()
       WHERE id = NEW.conferencia_id AND status_validacao = 'DIVERGENCIA';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sincronizar_status_divergencia() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER atendimento_divergencias_sincroniza AFTER INSERT OR UPDATE ON public.atendimento_divergencias
  FOR EACH ROW EXECUTE FUNCTION public.sincronizar_status_divergencia();

-- Cria automaticamente a ficha de conferência (estado seguro PENDENTE) assim que uma vaga
-- ganha um resultado definido, daqui para frente. Idempotente: nunca duplica.
CREATE OR REPLACE FUNCTION public.sincronizar_atendimento_vaga()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('PRESENCA','FALTA','CANCELAMENTO')
     AND (TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status) THEN
    INSERT INTO public.atendimento_conferencias (vaga_id, tenant_id, status_validacao)
    VALUES (NEW.id, NEW.tenant_id, 'PENDENTE')
    ON CONFLICT (vaga_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sincronizar_atendimento_vaga() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER vagas_sincronizar_atendimento AFTER INSERT OR UPDATE ON public.vagas
  FOR EACH ROW EXECUTE FUNCTION public.sincronizar_atendimento_vaga();

-- Registro histórico único: vagas com resultado já definido antes desta migração recebem
-- um estado seguro "não avaliado" (nunca "validado"), só para aparecerem no histórico do
-- Atendimento (regra 6/48) — não altera vagas nem pagamentos existentes, e esse estado
-- nunca bloqueia pagamento (ver validar_pagamento() abaixo).
-- O gatilho de auditoria é desligado só durante este lote único: registrar_auditoria()
-- depende do contexto de sessão do usuário logado (tenant_ativo()) para preencher
-- tenant_id, que não existe numa migração rodada manualmente sem sessão.
ALTER TABLE public.atendimento_conferencias DISABLE TRIGGER trg_auditoria_atendimento_conferencias;

INSERT INTO public.atendimento_conferencias (vaga_id, tenant_id, status_validacao)
SELECT v.id, v.tenant_id, 'HISTORICO_NAO_AVALIADO'
FROM public.vagas v
WHERE v.status IN ('PRESENCA','FALTA','CANCELAMENTO')
ON CONFLICT (vaga_id) DO NOTHING;

ALTER TABLE public.atendimento_conferencias ENABLE TRIGGER trg_auditoria_atendimento_conferencias;

-- Extensão mínima do portão de pagamento já existente: só passa a exigir ficha validada
-- para vagas cobertas pelo novo fluxo (PENDENTE/DIVERGENCIA). Ausência de ficha ou ficha
-- HISTORICO_NAO_AVALIADO/VALIDADO continuam liberando o pagamento exatamente como hoje.
CREATE OR REPLACE FUNCTION public.validar_pagamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_uid uuid := auth.uid();
BEGIN
  SELECT v.status INTO v_status FROM public.vagas v WHERE v.id = NEW.vaga_id;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Programação não encontrada para este pagamento.';
  END IF;

  IF v_status <> 'PRESENCA' THEN
    IF NEW.status = 'PAGO' THEN
      RAISE EXCEPTION 'Pagamento bloqueado: a programação não está com presença confirmada.';
    END IF;
    NEW.status := 'BLOQUEADO';
  ELSIF NEW.status = 'BLOQUEADO' THEN
    NEW.status := 'AGUARDANDO';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'PAGO' AND NEW.status = 'PAGO' THEN
    RAISE EXCEPTION 'Este pagamento já foi registrado como pago.';
  END IF;

  IF NEW.status = 'PAGO' THEN
    IF EXISTS (
      SELECT 1 FROM public.atendimento_conferencias c
      WHERE c.vaga_id = NEW.vaga_id AND c.status_validacao IN ('PENDENTE','DIVERGENCIA')
    ) THEN
      RAISE EXCEPTION 'Pagamento bloqueado: ficha aguardando validação do Atendimento (ou com divergência aberta).';
    END IF;

    NEW.pago_em := COALESCE(NEW.pago_em, now());
    NEW.pago_por := COALESCE(NEW.pago_por, v_uid);
    IF COALESCE(NEW.pago_por_nome, '') = '' THEN
      NEW.pago_por_nome := COALESCE((SELECT p.nome FROM public.profiles p WHERE p.id = v_uid), '');
    END IF;
  ELSE
    NEW.pago_em := NULL;
    NEW.pago_por := NULL;
    NEW.pago_por_nome := '';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validar_pagamento() FROM PUBLIC, anon, authenticated;

-- Catálogo de permissões: módulos novos, aditivos, concedidos por padrão só a
-- admin/coordenador (mesmo critério usado quando "pagamentos" foi criado).
ALTER TABLE public.perfil_permissoes DISABLE TRIGGER trg_auditoria_perfil_perm;

INSERT INTO public.perfil_permissoes (perfil_id, tenant_id, modulo, acao, permitido)
SELECT pa.id, pa.tenant_id, 'atendimento', a.acao, pa.chave IN ('admin','coordenador')
FROM public.perfis_acesso pa
CROSS JOIN (VALUES
  ('visualizar'),('conferir'),('validar'),('apontar_divergencia'),('resolver_divergencia'),('historico')
) AS a(acao)
ON CONFLICT (perfil_id, modulo, acao) DO NOTHING;

INSERT INTO public.perfil_permissoes (perfil_id, tenant_id, modulo, acao, permitido)
SELECT pa.id, pa.tenant_id, 'atendimento_valores', a.acao, pa.chave IN ('admin','coordenador')
FROM public.perfis_acesso pa
CROSS JOIN (VALUES ('visualizar'),('editar'),('conferir')) AS a(acao)
ON CONFLICT (perfil_id, modulo, acao) DO NOTHING;

INSERT INTO public.perfil_permissoes (perfil_id, tenant_id, modulo, acao, permitido)
SELECT pa.id, pa.tenant_id, 'pagamentos', a.acao, pa.chave IN ('admin','coordenador')
FROM public.perfis_acesso pa
CROSS JOIN (VALUES ('conferir'),('processar')) AS a(acao)
ON CONFLICT (perfil_id, modulo, acao) DO NOTHING;

ALTER TABLE public.perfil_permissoes ENABLE TRIGGER trg_auditoria_perfil_perm;
