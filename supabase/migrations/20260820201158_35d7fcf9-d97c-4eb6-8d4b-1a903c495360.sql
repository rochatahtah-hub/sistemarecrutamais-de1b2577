-- 1. Dados do colaborador na programação: função, Pix e documento de identidade
ALTER TABLE public.candidatos
  ADD COLUMN IF NOT EXISTS funcao text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pix_chave text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS documento_path text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS documento_nome text NOT NULL DEFAULT '';

-- 2. Cadastro de funções/cargos administrável (por empresa/tenant)
CREATE TABLE IF NOT EXISTS public.funcoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  tenant_id uuid NOT NULL DEFAULT COALESCE(public.tenant_atual(), public.tenant_padrao()) REFERENCES public.tenants(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS funcoes_tenant_nome_uk ON public.funcoes (tenant_id, upper(nome));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.funcoes TO authenticated;
GRANT ALL ON public.funcoes TO service_role;

ALTER TABLE public.funcoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS funcoes_select ON public.funcoes;
CREATE POLICY funcoes_select ON public.funcoes FOR SELECT TO authenticated
  USING (public.pode_operar(auth.uid()));

DROP POLICY IF EXISTS funcoes_write ON public.funcoes;
CREATE POLICY funcoes_write ON public.funcoes FOR ALL TO authenticated
  USING (public.tem_permissao(auth.uid(), 'administracao', 'administrar') OR public.tem_permissao(auth.uid(), 'configuracoes', 'editar'))
  WITH CHECK (public.tem_permissao(auth.uid(), 'administracao', 'administrar') OR public.tem_permissao(auth.uid(), 'configuracoes', 'editar'));

DROP POLICY IF EXISTS funcoes_isolamento_tenant ON public.funcoes;
CREATE POLICY funcoes_isolamento_tenant ON public.funcoes AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.acesso_tenant(tenant_id)) WITH CHECK (public.acesso_tenant(tenant_id));

DROP TRIGGER IF EXISTS trg_tenant_funcoes ON public.funcoes;
CREATE TRIGGER trg_tenant_funcoes BEFORE INSERT OR UPDATE ON public.funcoes
  FOR EACH ROW EXECUTE FUNCTION public.aplicar_tenant();

DROP TRIGGER IF EXISTS trg_funcoes_updated ON public.funcoes;
CREATE TRIGGER trg_funcoes_updated BEFORE UPDATE ON public.funcoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Funções iniciais para cada empresa existente
INSERT INTO public.funcoes (nome, tenant_id)
SELECT f.nome, t.id
FROM public.tenants t
CROSS JOIN (VALUES ('ATENDIMENTO'), ('FINANCEIRO'), ('FATURAMENTO'), ('AUXILIAR DE PRODUCAO'), ('AJUDANTE GERAL'), ('OPERADOR DE EMPILHADEIRA'), ('CONFERENTE'), ('SEPARADOR')) AS f(nome)
ON CONFLICT DO NOTHING;

-- 4. Documentos de identidade também acessíveis pelo fluxo da Minha Programação
DROP POLICY IF EXISTS "docs colaboradores leitura" ON storage.objects;
DROP POLICY IF EXISTS "docs colaboradores envio" ON storage.objects;
DROP POLICY IF EXISTS "docs colaboradores atualizacao" ON storage.objects;
DROP POLICY IF EXISTS "docs colaboradores remocao" ON storage.objects;

CREATE POLICY "docs colaboradores leitura" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documentos-colaboradores'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND public.acesso_tenant(((storage.foldername(name))[1])::uuid)
  AND (
    public.tem_permissao(auth.uid(), 'banco_colaboradores', 'visualizar')
    OR public.tem_permissao(auth.uid(), 'programacao', 'visualizar')
  )
);

CREATE POLICY "docs colaboradores envio" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documentos-colaboradores'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND public.acesso_tenant(((storage.foldername(name))[1])::uuid)
  AND (
    public.tem_permissao(auth.uid(), 'banco_colaboradores', 'editar')
    OR public.tem_permissao(auth.uid(), 'programacao', 'criar')
    OR public.tem_permissao(auth.uid(), 'programacao', 'editar')
  )
);

CREATE POLICY "docs colaboradores atualizacao" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'documentos-colaboradores'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND public.acesso_tenant(((storage.foldername(name))[1])::uuid)
  AND (
    public.tem_permissao(auth.uid(), 'banco_colaboradores', 'editar')
    OR public.tem_permissao(auth.uid(), 'programacao', 'editar')
  )
)
WITH CHECK (
  bucket_id = 'documentos-colaboradores'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND public.acesso_tenant(((storage.foldername(name))[1])::uuid)
  AND (
    public.tem_permissao(auth.uid(), 'banco_colaboradores', 'editar')
    OR public.tem_permissao(auth.uid(), 'programacao', 'editar')
  )
);

CREATE POLICY "docs colaboradores remocao" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documentos-colaboradores'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND public.acesso_tenant(((storage.foldername(name))[1])::uuid)
  AND (
    public.tem_permissao(auth.uid(), 'banco_colaboradores', 'editar')
    OR public.tem_permissao(auth.uid(), 'programacao', 'excluir')
  )
);