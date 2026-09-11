DROP POLICY IF EXISTS bloqueios_delete ON public.colaboradores_bloqueados;
CREATE POLICY bloqueios_delete ON public.colaboradores_bloqueados
  FOR DELETE TO authenticated
  USING (
    public.acesso_tenant(tenant_id)
    AND public.tem_permissao(auth.uid(), 'bloqueios', 'excluir')
  );

DROP POLICY IF EXISTS feedback_respostas_insert ON public.feedback_respostas;
DROP POLICY IF EXISTS feedback_respostas_update ON public.feedback_respostas;
DROP POLICY IF EXISTS feedback_respostas_delete ON public.feedback_respostas;

CREATE POLICY feedback_respostas_insert ON public.feedback_respostas
  FOR INSERT TO authenticated
  WITH CHECK (
    false
    AND public.tem_permissao(auth.uid(), 'feedback_respostas', 'criar')
  );

CREATE POLICY feedback_respostas_update ON public.feedback_respostas
  FOR UPDATE TO authenticated
  USING (
    false
    AND public.tem_permissao(auth.uid(), 'feedback_respostas', 'editar')
  )
  WITH CHECK (
    false
    AND public.tem_permissao(auth.uid(), 'feedback_respostas', 'editar')
  );

CREATE POLICY feedback_respostas_delete ON public.feedback_respostas
  FOR DELETE TO authenticated
  USING (
    false
    AND public.tem_permissao(auth.uid(), 'feedback_respostas', 'excluir')
  );

DROP POLICY IF EXISTS vagas_insert ON public.vagas;
CREATE POLICY vagas_insert ON public.vagas
  FOR INSERT TO authenticated
  WITH CHECK (
    public.tem_permissao(auth.uid(), 'vagas', 'criar')
    AND (programadora_id = auth.uid() OR programadora_id IS NULL)
  );