CREATE TABLE public.feedback_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escopo text NOT NULL,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  rs_empresa_id uuid REFERENCES public.rs_empresas(id) ON DELETE CASCADE,
  ativo boolean NOT NULL DEFAULT false,
  diaria_primeiro_dia boolean NOT NULL DEFAULT false,
  diaria_semanal boolean NOT NULL DEFAULT false,
  clt_entrada boolean NOT NULL DEFAULT false,
  clt_semanal boolean NOT NULL DEFAULT false,
  clt_prazo_dias integer NOT NULL DEFAULT 7,
  email_responsavel text NOT NULL DEFAULT '',
  tenant_id uuid NOT NULL DEFAULT COALESCE(public.tenant_atual(), public.tenant_padrao()) REFERENCES public.tenants(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feedback_config_escopo_valido CHECK (escopo IN ('diaria','clt')),
  CONSTRAINT feedback_config_alvo_valido CHECK (
    (escopo = 'diaria' AND empresa_id IS NOT NULL AND rs_empresa_id IS NULL)
    OR (escopo = 'clt' AND rs_empresa_id IS NOT NULL AND empresa_id IS NULL)
  ),
  CONSTRAINT feedback_config_prazo_valido CHECK (clt_prazo_dias BETWEEN 1 AND 365)
);

CREATE UNIQUE INDEX feedback_config_empresa_idx ON public.feedback_config (empresa_id) WHERE empresa_id IS NOT NULL;
CREATE UNIQUE INDEX feedback_config_rs_empresa_idx ON public.feedback_config (rs_empresa_id) WHERE rs_empresa_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback_config TO authenticated;
GRANT ALL ON public.feedback_config TO service_role;

ALTER TABLE public.feedback_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY feedback_config_isolamento_tenant ON public.feedback_config
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.acesso_tenant(tenant_id))
  WITH CHECK (public.acesso_tenant(tenant_id));

CREATE POLICY feedback_config_select ON public.feedback_config
  FOR SELECT TO authenticated
  USING (public.tem_permissao(auth.uid(), 'feedback', 'visualizar'));

CREATE POLICY feedback_config_insert ON public.feedback_config
  FOR INSERT TO authenticated
  WITH CHECK (public.tem_permissao(auth.uid(), 'feedback', 'editar'));

CREATE POLICY feedback_config_update ON public.feedback_config
  FOR UPDATE TO authenticated
  USING (public.tem_permissao(auth.uid(), 'feedback', 'editar'))
  WITH CHECK (public.tem_permissao(auth.uid(), 'feedback', 'editar'));

CREATE POLICY feedback_config_delete ON public.feedback_config
  FOR DELETE TO authenticated
  USING (public.tem_permissao(auth.uid(), 'feedback', 'administrar'));

CREATE TRIGGER feedback_config_tenant BEFORE INSERT OR UPDATE ON public.feedback_config
  FOR EACH ROW EXECUTE FUNCTION public.aplicar_tenant();

CREATE TRIGGER feedback_config_updated_at BEFORE UPDATE ON public.feedback_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_auditoria_feedback_config AFTER INSERT OR UPDATE OR DELETE ON public.feedback_config
  FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();

CREATE TABLE public.feedbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  escopo text NOT NULL,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL,
  rs_empresa_id uuid REFERENCES public.rs_empresas(id) ON DELETE SET NULL,
  empresa_nome text NOT NULL DEFAULT '',
  vaga_id uuid REFERENCES public.vagas(id) ON DELETE SET NULL,
  rs_candidato_id uuid REFERENCES public.rs_candidatos(id) ON DELETE SET NULL,
  colaborador_nome text NOT NULL DEFAULT '',
  periodo_inicio date,
  periodo_fim date,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'PENDENTE',
  enviado_em timestamptz,
  enviado_para text NOT NULL DEFAULT '',
  envio_status text NOT NULL DEFAULT '',
  respondido_em timestamptz,
  criado_por uuid REFERENCES auth.users(id),
  criado_por_nome text NOT NULL DEFAULT '',
  tenant_id uuid NOT NULL DEFAULT COALESCE(public.tenant_atual(), public.tenant_padrao()) REFERENCES public.tenants(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feedbacks_escopo_valido CHECK (escopo IN ('diaria','clt')),
  CONSTRAINT feedbacks_tipo_valido CHECK (tipo IN ('diaria_primeiro_dia','diaria_semanal','clt_entrada','clt_semanal')),
  CONSTRAINT feedbacks_status_valido CHECK (status IN ('PENDENTE','RESPONDIDO','CANCELADO'))
);

CREATE INDEX feedbacks_tenant_status_idx ON public.feedbacks (tenant_id, status, created_at DESC);
CREATE UNIQUE INDEX feedbacks_semanal_unico_idx ON public.feedbacks (tenant_id, tipo, escopo, COALESCE(empresa_id, rs_empresa_id), periodo_inicio)
  WHERE tipo IN ('diaria_semanal','clt_semanal');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedbacks TO authenticated;
GRANT ALL ON public.feedbacks TO service_role;

ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY feedbacks_isolamento_tenant ON public.feedbacks
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.acesso_tenant(tenant_id))
  WITH CHECK (public.acesso_tenant(tenant_id));

CREATE POLICY feedbacks_select ON public.feedbacks
  FOR SELECT TO authenticated
  USING (public.tem_permissao(auth.uid(), 'feedback', 'visualizar'));

CREATE POLICY feedbacks_insert ON public.feedbacks
  FOR INSERT TO authenticated
  WITH CHECK (public.tem_permissao(auth.uid(), 'feedback', 'criar'));

CREATE POLICY feedbacks_update ON public.feedbacks
  FOR UPDATE TO authenticated
  USING (public.tem_permissao(auth.uid(), 'feedback', 'criar'))
  WITH CHECK (public.tem_permissao(auth.uid(), 'feedback', 'criar'));

CREATE POLICY feedbacks_delete ON public.feedbacks
  FOR DELETE TO authenticated
  USING (public.tem_permissao(auth.uid(), 'feedback', 'administrar'));

CREATE TRIGGER feedbacks_tenant BEFORE INSERT OR UPDATE ON public.feedbacks
  FOR EACH ROW EXECUTE FUNCTION public.aplicar_tenant();

CREATE TRIGGER feedbacks_updated_at BEFORE UPDATE ON public.feedbacks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.feedback_respostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id uuid NOT NULL UNIQUE REFERENCES public.feedbacks(id) ON DELETE CASCADE,
  respostas jsonb NOT NULL DEFAULT '{}'::jsonb,
  nota integer,
  mencoes text NOT NULL DEFAULT '',
  observacao text NOT NULL DEFAULT '',
  tenant_id uuid NOT NULL DEFAULT COALESCE(public.tenant_atual(), public.tenant_padrao()) REFERENCES public.tenants(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feedback_respostas_nota_valida CHECK (nota IS NULL OR nota BETWEEN 0 AND 10)
);

CREATE INDEX feedback_respostas_tenant_idx ON public.feedback_respostas (tenant_id, created_at DESC);

GRANT SELECT ON public.feedback_respostas TO authenticated;
GRANT ALL ON public.feedback_respostas TO service_role;

ALTER TABLE public.feedback_respostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY feedback_respostas_isolamento_tenant ON public.feedback_respostas
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.acesso_tenant(tenant_id))
  WITH CHECK (public.acesso_tenant(tenant_id));

CREATE POLICY feedback_respostas_select ON public.feedback_respostas
  FOR SELECT TO authenticated
  USING (public.tem_permissao(auth.uid(), 'feedback_respostas', 'visualizar'));

ALTER TABLE public.perfil_permissoes DISABLE TRIGGER trg_auditoria_perfil_perm;

INSERT INTO public.perfil_permissoes (perfil_id, tenant_id, modulo, acao, permitido)
SELECT pa.id, pa.tenant_id, 'feedback', a.acao, pa.chave IN ('admin','coordenador')
FROM public.perfis_acesso pa
CROSS JOIN (VALUES ('visualizar'),('criar'),('editar'),('administrar')) AS a(acao)
ON CONFLICT (perfil_id, modulo, acao) DO NOTHING;

INSERT INTO public.perfil_permissoes (perfil_id, tenant_id, modulo, acao, permitido)
SELECT pa.id, pa.tenant_id, m.modulo, 'visualizar', pa.chave IN ('admin','coordenador')
FROM public.perfis_acesso pa
CROSS JOIN (VALUES ('feedback_respostas'),('feedback_dashboard')) AS m(modulo)
ON CONFLICT (perfil_id, modulo, acao) DO NOTHING;

ALTER TABLE public.perfil_permissoes ENABLE TRIGGER trg_auditoria_perfil_perm;