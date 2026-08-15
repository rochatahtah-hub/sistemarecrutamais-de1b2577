-- 1. Estrutura
ALTER TABLE public.colaboradores_bloqueados
  ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS tipo_bloqueio text NOT NULL DEFAULT 'TODAS_EMPRESAS',
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS telefone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS candidato_id uuid REFERENCES public.candidatos(id) ON DELETE SET NULL;

ALTER TABLE public.colaboradores_bloqueados
  DROP CONSTRAINT IF EXISTS colaboradores_bloqueados_cpf_key;

ALTER TABLE public.colaboradores_bloqueados
  DROP CONSTRAINT IF EXISTS colaboradores_bloqueados_tipo_chk;
ALTER TABLE public.colaboradores_bloqueados
  ADD CONSTRAINT colaboradores_bloqueados_tipo_chk
  CHECK (tipo_bloqueio IN ('TODAS_EMPRESAS','EMPRESA_ESPECIFICA'));

ALTER TABLE public.colaboradores_bloqueados
  DROP CONSTRAINT IF EXISTS colaboradores_bloqueados_coerencia_chk;
ALTER TABLE public.colaboradores_bloqueados
  ADD CONSTRAINT colaboradores_bloqueados_coerencia_chk
  CHECK (
    (tipo_bloqueio = 'TODAS_EMPRESAS' AND empresa_id IS NULL)
    OR (tipo_bloqueio = 'EMPRESA_ESPECIFICA' AND empresa_id IS NOT NULL)
  );

CREATE UNIQUE INDEX IF NOT EXISTS ux_bloqueio_ativo_geral
  ON public.colaboradores_bloqueados (cpf)
  WHERE ativo AND tipo_bloqueio = 'TODAS_EMPRESAS';

CREATE UNIQUE INDEX IF NOT EXISTS ux_bloqueio_ativo_empresa
  ON public.colaboradores_bloqueados (cpf, empresa_id)
  WHERE ativo AND tipo_bloqueio = 'EMPRESA_ESPECIFICA';

CREATE INDEX IF NOT EXISTS ix_bloqueio_cpf_ativo
  ON public.colaboradores_bloqueados (cpf) WHERE ativo;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.colaboradores_bloqueados TO authenticated;
GRANT ALL ON public.colaboradores_bloqueados TO service_role;

-- 2. Politicas por permissao
DROP POLICY IF EXISTS bloqueados_select ON public.colaboradores_bloqueados;
DROP POLICY IF EXISTS bloqueados_write ON public.colaboradores_bloqueados;

CREATE POLICY bloqueios_select ON public.colaboradores_bloqueados
  FOR SELECT TO authenticated
  USING (public.tem_permissao(auth.uid(), 'bloqueios', 'visualizar'));

CREATE POLICY bloqueios_insert ON public.colaboradores_bloqueados
  FOR INSERT TO authenticated
  WITH CHECK (public.tem_permissao(auth.uid(), 'bloqueios', 'criar'));

CREATE POLICY bloqueios_update ON public.colaboradores_bloqueados
  FOR UPDATE TO authenticated
  USING (public.tem_permissao(auth.uid(), 'bloqueios', 'editar'))
  WITH CHECK (public.tem_permissao(auth.uid(), 'bloqueios', 'editar'));

CREATE POLICY bloqueios_delete ON public.colaboradores_bloqueados
  FOR DELETE TO authenticated
  USING (public.tem_permissao(auth.uid(), 'bloqueios', 'excluir'));

-- 3. Verificacao central de bloqueio
CREATE OR REPLACE FUNCTION public.verificar_bloqueio(_cpf text, _empresa_id uuid DEFAULT NULL)
RETURNS TABLE(bloqueado boolean, motivo text, tipo_bloqueio text, empresa_id uuid, empresa_nome text, created_at timestamptz, bloqueado_por_nome text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT true, b.motivo, b.tipo_bloqueio, b.empresa_id, COALESCE(e.nome, ''), b.created_at, b.bloqueado_por_nome
  FROM public.colaboradores_bloqueados b
  LEFT JOIN public.empresas e ON e.id = b.empresa_id
  WHERE b.ativo
    AND b.cpf = regexp_replace(COALESCE(_cpf,''), '\D', '', 'g')
    AND (b.tipo_bloqueio = 'TODAS_EMPRESAS'
         OR (_empresa_id IS NOT NULL AND b.empresa_id = _empresa_id))
    AND auth.uid() IS NOT NULL
  ORDER BY (b.tipo_bloqueio = 'TODAS_EMPRESAS') DESC, b.created_at DESC
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.verificar_bloqueio(text, uuid) TO authenticated;

-- 4. Bloqueio real no fechamento/programacao de vagas
CREATE OR REPLACE FUNCTION public.impedir_vaga_bloqueada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cpf text;
  _b record;
BEGIN
  IF NEW.candidato_id IS NULL THEN RETURN NEW; END IF;

  SELECT c.cpf INTO _cpf FROM public.candidatos c WHERE c.id = NEW.candidato_id;
  IF _cpf IS NULL THEN RETURN NEW; END IF;

  SELECT b.tipo_bloqueio, b.motivo INTO _b
  FROM public.colaboradores_bloqueados b
  WHERE b.ativo
    AND b.cpf = _cpf
    AND (b.tipo_bloqueio = 'TODAS_EMPRESAS'
         OR (NEW.empresa_id IS NOT NULL AND b.empresa_id = NEW.empresa_id))
  ORDER BY (b.tipo_bloqueio = 'TODAS_EMPRESAS') DESC
  LIMIT 1;

  IF FOUND THEN
    IF _b.tipo_bloqueio = 'TODAS_EMPRESAS' THEN
      RAISE EXCEPTION 'COLABORADOR BLOQUEADO: este colaborador está bloqueado para todas as empresas. Motivo: %', COALESCE(NULLIF(_b.motivo,''), 'não informado')
        USING ERRCODE = '42501';
    ELSE
      RAISE EXCEPTION 'COLABORADOR BLOQUEADO: este colaborador está bloqueado para esta empresa. Motivo: %', COALESCE(NULLIF(_b.motivo,''), 'não informado')
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_impedir_vaga_bloqueada ON public.vagas;
CREATE TRIGGER trg_impedir_vaga_bloqueada
  BEFORE INSERT OR UPDATE OF candidato_id, empresa_id, status ON public.vagas
  FOR EACH ROW EXECUTE FUNCTION public.impedir_vaga_bloqueada();