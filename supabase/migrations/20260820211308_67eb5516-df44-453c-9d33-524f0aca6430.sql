CREATE TABLE public.pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vaga_id uuid NOT NULL UNIQUE REFERENCES public.vagas(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'AGUARDANDO',
  observacao text NOT NULL DEFAULT '',
  pago_em timestamptz,
  pago_por uuid REFERENCES auth.users(id),
  pago_por_nome text NOT NULL DEFAULT '',
  tenant_id uuid NOT NULL DEFAULT COALESCE(public.tenant_atual(), public.tenant_padrao()) REFERENCES public.tenants(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pagamentos_status_valido CHECK (status IN ('AGUARDANDO','PAGO','PROBLEMA','BLOQUEADO'))
);

CREATE INDEX pagamentos_tenant_status_idx ON public.pagamentos (tenant_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pagamentos TO authenticated;
GRANT ALL ON public.pagamentos TO service_role;

ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY pagamentos_isolamento_tenant ON public.pagamentos
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.acesso_tenant(tenant_id))
  WITH CHECK (public.acesso_tenant(tenant_id));

CREATE POLICY pagamentos_select ON public.pagamentos
  FOR SELECT TO authenticated
  USING (public.tem_permissao(auth.uid(), 'pagamentos', 'visualizar'));

CREATE POLICY pagamentos_insert ON public.pagamentos
  FOR INSERT TO authenticated
  WITH CHECK (public.tem_permissao(auth.uid(), 'pagamentos', 'editar'));

CREATE POLICY pagamentos_update ON public.pagamentos
  FOR UPDATE TO authenticated
  USING (public.tem_permissao(auth.uid(), 'pagamentos', 'editar'))
  WITH CHECK (public.tem_permissao(auth.uid(), 'pagamentos', 'editar'));

CREATE POLICY pagamentos_delete ON public.pagamentos
  FOR DELETE TO authenticated
  USING (public.tem_permissao(auth.uid(), 'pagamentos', 'excluir'));

CREATE TRIGGER pagamentos_tenant BEFORE INSERT OR UPDATE ON public.pagamentos
  FOR EACH ROW EXECUTE FUNCTION public.aplicar_tenant();

CREATE TRIGGER pagamentos_updated_at BEFORE UPDATE ON public.pagamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

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

CREATE TRIGGER pagamentos_validar BEFORE INSERT OR UPDATE ON public.pagamentos
  FOR EACH ROW EXECUTE FUNCTION public.validar_pagamento();

CREATE OR REPLACE FUNCTION public.sincronizar_pagamento_vaga()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'PRESENCA' THEN
      UPDATE public.pagamentos SET status = 'AGUARDANDO', updated_at = now()
        WHERE vaga_id = NEW.id AND status = 'BLOQUEADO';
    ELSE
      UPDATE public.pagamentos SET status = 'BLOQUEADO', pago_em = NULL, pago_por = NULL,
             pago_por_nome = '', updated_at = now()
        WHERE vaga_id = NEW.id AND status <> 'PAGO';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sincronizar_pagamento_vaga() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER vagas_sincronizar_pagamento AFTER UPDATE ON public.vagas
  FOR EACH ROW EXECUTE FUNCTION public.sincronizar_pagamento_vaga();

ALTER TABLE public.perfil_permissoes DISABLE TRIGGER trg_auditoria_perfil_perm;

INSERT INTO public.perfil_permissoes (perfil_id, tenant_id, modulo, acao, permitido)
SELECT pa.id, pa.tenant_id, 'pagamentos', a.acao,
       pa.chave IN ('admin','coordenador')
FROM public.perfis_acesso pa
CROSS JOIN (VALUES ('visualizar'),('editar'),('exportar')) AS a(acao)
ON CONFLICT (perfil_id, modulo, acao) DO NOTHING;

ALTER TABLE public.perfil_permissoes ENABLE TRIGGER trg_auditoria_perfil_perm;

DROP POLICY IF EXISTS funcoes_write ON public.funcoes;
CREATE POLICY funcoes_write ON public.funcoes
  FOR ALL TO authenticated
  USING (
    public.tem_permissao(auth.uid(), 'administracao', 'administrar')
    OR public.tem_permissao(auth.uid(), 'configuracoes', 'editar')
    OR public.tem_permissao(auth.uid(), 'equipe', 'editar')
  )
  WITH CHECK (
    public.tem_permissao(auth.uid(), 'administracao', 'administrar')
    OR public.tem_permissao(auth.uid(), 'configuracoes', 'editar')
    OR public.tem_permissao(auth.uid(), 'equipe', 'editar')
  );