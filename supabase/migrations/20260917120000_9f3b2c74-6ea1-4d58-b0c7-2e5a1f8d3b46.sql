-- ============ PERMISSÕES: fazer valer o que o ADM Master concede ============
--
-- Problema: o ADM Master concedia, por exemplo, "Empresas → Criar" e a permissão
-- era gravada e computada corretamente (public.tem_permissao já retornava true),
-- mas nada no sistema consultava esse resultado: as policies de escrita ainda
-- perguntavam apenas pelo papel legado (public.has_role(uid,'admin')). Resultado:
-- a permissão existia no cadastro e não funcionava na prática.
--
-- Correção aditiva: onde havia SOMENTE o papel legado, passa a valer
-- "papel legado OU permissão concedida". Ninguém perde acesso (quem é admin
-- continua admin); quem recebeu a permissão passa a conseguir de fato executar.
-- O isolamento entre empresas continua nas policies RESTRICTIVE de tenant, que
-- não são tocadas aqui.

-- ---------------------------------------------------------------------------
-- 1) minhas_permissoes(): passa a enxergar também a exceção individual
--
-- O universo de pares (módulo, ação) vinha só de perfil_permissoes. Uma exceção
-- individual concedida para um par que ainda não existe em nenhum perfil nunca
-- aparecia para o frontend — a permissão valia no banco e ficava invisível na
-- tela. Agora o universo é a união dos dois lados.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.minhas_permissoes()
RETURNS TABLE(modulo text, acao text, permitido boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.modulo, m.acao, public.tem_permissao(auth.uid(), m.modulo, m.acao)
  FROM (
    SELECT pp.modulo, pp.acao FROM public.perfil_permissoes pp
    UNION
    SELECT u.modulo, u.acao FROM public.permissoes_usuario u WHERE u.user_id = auth.uid()
  ) m
  WHERE auth.uid() IS NOT NULL
$$;

-- ---------------------------------------------------------------------------
-- 2) EMPRESAS — o caso relatado. Uma única policy FOR ALL não consegue separar
--    criar/editar/excluir, então vira três policies granulares.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS empresas_write ON public.empresas;

CREATE POLICY empresas_insert ON public.empresas FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.tem_permissao(auth.uid(), 'empresas', 'criar')
  );

CREATE POLICY empresas_update ON public.empresas FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.tem_permissao(auth.uid(), 'empresas', 'editar')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.tem_permissao(auth.uid(), 'empresas', 'editar')
  );

CREATE POLICY empresas_delete ON public.empresas FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.tem_permissao(auth.uid(), 'empresas', 'excluir')
  );

-- ---------------------------------------------------------------------------
-- 3) Demais áreas em que o papel legado era a única porta
-- ---------------------------------------------------------------------------

-- Candidatos → Excluir
DROP POLICY IF EXISTS candidatos_delete ON public.candidatos;
CREATE POLICY candidatos_delete ON public.candidatos FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.tem_permissao(auth.uid(), 'candidatos', 'excluir')
  );

-- Configurações → Editar
DROP POLICY IF EXISTS configuracoes_write ON public.configuracoes;
CREATE POLICY configuracoes_write ON public.configuracoes FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.tem_permissao(auth.uid(), 'configuracoes', 'editar')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.tem_permissao(auth.uid(), 'configuracoes', 'editar')
  );

-- Histórico de Alterações → Visualizar (a exclusão continua exclusiva do admin)
DROP POLICY IF EXISTS auditoria_select ON public.auditoria;
CREATE POLICY auditoria_select ON public.auditoria FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.tem_permissao(auth.uid(), 'auditoria', 'visualizar')
  );

-- Histórico (quinzenas arquivadas) → Editar
DROP POLICY IF EXISTS quinzenas_write ON public.quinzenas_historico;
CREATE POLICY quinzenas_write ON public.quinzenas_historico FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.tem_permissao(auth.uid(), 'historico', 'editar')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.tem_permissao(auth.uid(), 'historico', 'editar')
  );

-- Programações da equipe → Editar (mexer em vaga de outra programadora).
-- A vaga própria continua liberada pela mesma regra de antes.
DROP POLICY IF EXISTS vagas_update ON public.vagas;
CREATE POLICY vagas_update ON public.vagas FOR UPDATE TO authenticated
  USING (
    public.pode_operar(auth.uid())
    AND (
      programadora_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.tem_permissao(auth.uid(), 'programadoras', 'editar')
    )
  )
  WITH CHECK (public.pode_operar(auth.uid()));

DROP POLICY IF EXISTS vagas_delete ON public.vagas;
CREATE POLICY vagas_delete ON public.vagas FOR DELETE TO authenticated
  USING (
    public.pode_operar(auth.uid())
    AND (
      programadora_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.tem_permissao(auth.uid(), 'programadoras', 'editar')
    )
  );

-- Backups → Visualizar / Criar / Excluir
DROP POLICY IF EXISTS backups_admin_select ON public.backups;
CREATE POLICY backups_admin_select ON public.backups FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.tem_permissao(auth.uid(), 'backups', 'visualizar')
  );

DROP POLICY IF EXISTS backups_admin_insert ON public.backups;
CREATE POLICY backups_admin_insert ON public.backups FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.tem_permissao(auth.uid(), 'backups', 'criar')
  );

DROP POLICY IF EXISTS backups_admin_update ON public.backups;
CREATE POLICY backups_admin_update ON public.backups FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.tem_permissao(auth.uid(), 'backups', 'criar')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.tem_permissao(auth.uid(), 'backups', 'criar')
  );

DROP POLICY IF EXISTS backups_admin_delete ON public.backups;
CREATE POLICY backups_admin_delete ON public.backups FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.tem_permissao(auth.uid(), 'backups', 'excluir')
  );

DROP POLICY IF EXISTS backup_agendamento_admin_select ON public.backup_agendamento;
CREATE POLICY backup_agendamento_admin_select ON public.backup_agendamento FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.tem_permissao(auth.uid(), 'backups', 'visualizar')
  );

DROP POLICY IF EXISTS backup_agendamento_admin_insert ON public.backup_agendamento;
CREATE POLICY backup_agendamento_admin_insert ON public.backup_agendamento FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.tem_permissao(auth.uid(), 'backups', 'criar')
  );

DROP POLICY IF EXISTS backup_agendamento_admin_update ON public.backup_agendamento;
CREATE POLICY backup_agendamento_admin_update ON public.backup_agendamento FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.tem_permissao(auth.uid(), 'backups', 'criar')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.tem_permissao(auth.uid(), 'backups', 'criar')
  );

-- Histórico de Acessos → Visualizar (acessos_select_proprio continua cobrindo
-- o próprio usuário e não é tocada)
DROP POLICY IF EXISTS acessos_select_admin ON public.user_access_logs;
CREATE POLICY acessos_select_admin ON public.user_access_logs FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.tem_permissao(auth.uid(), 'acessos', 'visualizar')
  );

-- Saúde do Sistema → Visualizar
DROP POLICY IF EXISTS erros_sistema_admin_select ON public.erros_sistema;
CREATE POLICY erros_sistema_admin_select ON public.erros_sistema FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.tem_permissao(auth.uid(), 'saude', 'visualizar')
  );

DROP POLICY IF EXISTS erros_sistema_admin_update ON public.erros_sistema;
CREATE POLICY erros_sistema_admin_update ON public.erros_sistema FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.tem_permissao(auth.uid(), 'saude', 'visualizar')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.tem_permissao(auth.uid(), 'saude', 'visualizar')
  );
