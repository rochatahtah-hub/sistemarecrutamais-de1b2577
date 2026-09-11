DROP POLICY IF EXISTS feedback_respostas_insert ON public.feedback_respostas;
DROP POLICY IF EXISTS feedback_respostas_update ON public.feedback_respostas;
DROP POLICY IF EXISTS feedback_respostas_delete ON public.feedback_respostas;

CREATE POLICY feedback_respostas_insert ON public.feedback_respostas
  FOR INSERT TO authenticated
  WITH CHECK (
    public.acesso_tenant(tenant_id)
    AND public.tem_permissao(auth.uid(), 'feedback_respostas', 'criar')
  );

CREATE POLICY feedback_respostas_update ON public.feedback_respostas
  FOR UPDATE TO authenticated
  USING (
    public.acesso_tenant(tenant_id)
    AND public.tem_permissao(auth.uid(), 'feedback_respostas', 'editar')
  )
  WITH CHECK (
    public.acesso_tenant(tenant_id)
    AND public.tem_permissao(auth.uid(), 'feedback_respostas', 'editar')
  );

CREATE POLICY feedback_respostas_delete ON public.feedback_respostas
  FOR DELETE TO authenticated
  USING (
    public.acesso_tenant(tenant_id)
    AND public.tem_permissao(auth.uid(), 'feedback_respostas', 'excluir')
  );