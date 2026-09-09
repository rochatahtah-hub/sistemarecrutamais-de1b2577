CREATE TABLE public.captacao_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL DEFAULT COALESCE(public.tenant_atual(), public.tenant_padrao()) REFERENCES public.tenants(id) ON DELETE CASCADE,
  diarias_ativa boolean NOT NULL DEFAULT true,
  oportunidades_ativa boolean NOT NULL DEFAULT false,
  clt_ativa boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX captacao_config_tenant_idx ON public.captacao_config(tenant_id);

CREATE TABLE public.captacao_oportunidades (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL DEFAULT COALESCE(public.tenant_atual(), public.tenant_padrao()) REFERENCES public.tenants(id) ON DELETE CASCADE,
  modalidade text NOT NULL CHECK (modalidade IN ('especifica','clt')),
  vaga_id uuid REFERENCES public.vagas(id) ON DELETE SET NULL,
  titulo text NOT NULL DEFAULT '',
  data_oportunidade date,
  descricao text NOT NULL DEFAULT '',
  requisitos text NOT NULL DEFAULT '',
  informacoes_adicionais text NOT NULL DEFAULT '',
  curriculo_obrigatorio boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','arquivada')),
  arquivada_em timestamptz,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_por_nome text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX captacao_oportunidades_tenant_idx ON public.captacao_oportunidades(tenant_id, modalidade, status, created_at DESC);

CREATE TABLE public.captacao_candidaturas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL DEFAULT COALESCE(public.tenant_atual(), public.tenant_padrao()) REFERENCES public.tenants(id) ON DELETE CASCADE,
  oportunidade_id uuid NOT NULL REFERENCES public.captacao_oportunidades(id) ON DELETE CASCADE,
  daily_worker_id uuid REFERENCES public.daily_workers(id) ON DELETE SET NULL,
  nome text NOT NULL DEFAULT '',
  cpf text NOT NULL DEFAULT '',
  telefone text NOT NULL DEFAULT '',
  observacao text NOT NULL DEFAULT '',
  curriculo_path text NOT NULL DEFAULT '',
  curriculo_nome text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','arquivada')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX captacao_candidaturas_unica_idx ON public.captacao_candidaturas(oportunidade_id, daily_worker_id) WHERE daily_worker_id IS NOT NULL;
CREATE INDEX captacao_candidaturas_oportunidade_idx ON public.captacao_candidaturas(oportunidade_id, status, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.captacao_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.captacao_oportunidades TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.captacao_candidaturas TO authenticated;
GRANT ALL ON public.captacao_config TO service_role;
GRANT ALL ON public.captacao_oportunidades TO service_role;
GRANT ALL ON public.captacao_candidaturas TO service_role;

ALTER TABLE public.captacao_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.captacao_oportunidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.captacao_candidaturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY captacao_config_isolamento_tenant ON public.captacao_config AS RESTRICTIVE FOR ALL TO authenticated USING (public.acesso_tenant(tenant_id)) WITH CHECK (public.acesso_tenant(tenant_id));
CREATE POLICY captacao_config_select ON public.captacao_config FOR SELECT TO authenticated USING (public.tem_permissao(auth.uid(), 'captacao', 'visualizar'));
CREATE POLICY captacao_config_insert ON public.captacao_config FOR INSERT TO authenticated WITH CHECK (public.tem_permissao(auth.uid(), 'captacao', 'administrar'));
CREATE POLICY captacao_config_update ON public.captacao_config FOR UPDATE TO authenticated USING (public.tem_permissao(auth.uid(), 'captacao', 'administrar')) WITH CHECK (public.tem_permissao(auth.uid(), 'captacao', 'administrar'));

CREATE POLICY captacao_oportunidades_isolamento_tenant ON public.captacao_oportunidades AS RESTRICTIVE FOR ALL TO authenticated USING (public.acesso_tenant(tenant_id)) WITH CHECK (public.acesso_tenant(tenant_id));
CREATE POLICY captacao_oportunidades_select ON public.captacao_oportunidades FOR SELECT TO authenticated USING (public.tem_permissao(auth.uid(), 'captacao', 'visualizar'));
CREATE POLICY captacao_oportunidades_insert ON public.captacao_oportunidades FOR INSERT TO authenticated WITH CHECK (public.tem_permissao(auth.uid(), 'captacao', 'criar'));
CREATE POLICY captacao_oportunidades_update ON public.captacao_oportunidades FOR UPDATE TO authenticated USING (
  public.tem_permissao(auth.uid(), 'captacao', 'editar')
  OR public.tem_permissao(auth.uid(), 'captacao', 'arquivar')
  OR public.tem_permissao(auth.uid(), 'captacao', 'restaurar')
) WITH CHECK (
  public.tem_permissao(auth.uid(), 'captacao', 'editar')
  OR public.tem_permissao(auth.uid(), 'captacao', 'arquivar')
  OR public.tem_permissao(auth.uid(), 'captacao', 'restaurar')
);
CREATE POLICY captacao_oportunidades_delete ON public.captacao_oportunidades FOR DELETE TO authenticated USING (public.tem_permissao(auth.uid(), 'captacao', 'excluir'));

CREATE POLICY captacao_candidaturas_isolamento_tenant ON public.captacao_candidaturas AS RESTRICTIVE FOR ALL TO authenticated USING (public.acesso_tenant(tenant_id)) WITH CHECK (public.acesso_tenant(tenant_id));
CREATE POLICY captacao_candidaturas_select ON public.captacao_candidaturas FOR SELECT TO authenticated USING (public.tem_permissao(auth.uid(), 'captacao', 'visualizar'));
CREATE POLICY captacao_candidaturas_insert ON public.captacao_candidaturas FOR INSERT TO authenticated WITH CHECK (public.tem_permissao(auth.uid(), 'captacao', 'criar'));
CREATE POLICY captacao_candidaturas_update ON public.captacao_candidaturas FOR UPDATE TO authenticated USING (
  public.tem_permissao(auth.uid(), 'captacao', 'editar')
  OR public.tem_permissao(auth.uid(), 'captacao', 'arquivar')
  OR public.tem_permissao(auth.uid(), 'captacao', 'restaurar')
) WITH CHECK (
  public.tem_permissao(auth.uid(), 'captacao', 'editar')
  OR public.tem_permissao(auth.uid(), 'captacao', 'arquivar')
  OR public.tem_permissao(auth.uid(), 'captacao', 'restaurar')
);
CREATE POLICY captacao_candidaturas_delete ON public.captacao_candidaturas FOR DELETE TO authenticated USING (public.tem_permissao(auth.uid(), 'captacao', 'excluir'));

CREATE TRIGGER captacao_config_tenant BEFORE INSERT OR UPDATE ON public.captacao_config FOR EACH ROW EXECUTE FUNCTION public.aplicar_tenant();
CREATE TRIGGER captacao_oportunidades_tenant BEFORE INSERT OR UPDATE ON public.captacao_oportunidades FOR EACH ROW EXECUTE FUNCTION public.aplicar_tenant();
CREATE TRIGGER captacao_candidaturas_tenant BEFORE INSERT OR UPDATE ON public.captacao_candidaturas FOR EACH ROW EXECUTE FUNCTION public.aplicar_tenant();

CREATE TRIGGER captacao_config_updated_at BEFORE UPDATE ON public.captacao_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER captacao_oportunidades_updated_at BEFORE UPDATE ON public.captacao_oportunidades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER captacao_candidaturas_updated_at BEFORE UPDATE ON public.captacao_candidaturas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_auditoria_captacao_oportunidades AFTER INSERT OR UPDATE OR DELETE ON public.captacao_oportunidades FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();
CREATE TRIGGER trg_auditoria_captacao_candidaturas AFTER INSERT OR UPDATE OR DELETE ON public.captacao_candidaturas FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();
CREATE TRIGGER trg_auditoria_captacao_config AFTER INSERT OR UPDATE OR DELETE ON public.captacao_config FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();