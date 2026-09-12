ALTER TABLE public.levantamentos_diarios
  ADD COLUMN IF NOT EXISTS pendentes integer NOT NULL DEFAULT 0;

ALTER TABLE public.levantamento_diario_programadores
  ADD COLUMN IF NOT EXISTS pendentes integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS vagas_created_at_tenant_idx
  ON public.vagas (tenant_id, created_at);

CREATE OR REPLACE FUNCTION public.levantamento_diario_vagas_do_dia(_tenant uuid, _data date)
RETURNS TABLE (
  id uuid,
  data date,
  quantidade integer,
  status text,
  programadora_id uuid,
  colaborador text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    v.id,
    v.data,
    v.quantidade,
    v.status,
    v.programadora_id,
    coalesce(c.nome, '') AS colaborador
  FROM public.vagas v
  LEFT JOIN public.colaboradores c ON c.id = v.colaborador_id
  WHERE v.tenant_id = _tenant
    AND (v.created_at AT TIME ZONE 'America/Sao_Paulo')::date = _data
$$;

REVOKE ALL ON FUNCTION public.levantamento_diario_vagas_do_dia(uuid, date)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.levantamento_diario_vagas_do_dia(uuid, date)
  TO service_role;