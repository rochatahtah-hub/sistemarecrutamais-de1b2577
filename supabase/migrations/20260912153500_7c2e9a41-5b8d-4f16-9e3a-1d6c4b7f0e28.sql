-- ============ LEVANTAMENTO DIÁRIO — exclui vagas retroativas ============
-- Alteração incremental e aditiva. Não afeta Quinzena/Mês/Ano.
--
-- A migração anterior (20260912144143) passou a contar vagas por created_at,
-- mas ainda inclui vagas cuja data de trabalho já passou em relação à data de
-- criação (retroativas) — pedido explícito da Talita era excluir esse caso
-- ("desde que não seja retroativo"). Vaga adicionada hoje para representar um
-- trabalho que já aconteceu no passado não deve contar no Levantamento Diário.

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
    AND v.data >= _data
$$;

REVOKE ALL ON FUNCTION public.levantamento_diario_vagas_do_dia(uuid, date)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.levantamento_diario_vagas_do_dia(uuid, date)
  TO service_role;
