CREATE OR REPLACE FUNCTION public.pode_operar(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','programadora'))
$$;

CREATE OR REPLACE FUNCTION public.somente_dashboard(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT NOT public.pode_operar(_user_id)
     AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('supervisor','coordenador','comercial'))
$$;

-- alertas de operacao: somente operacao
DROP POLICY IF EXISTS alertas_operacao_select ON public.alertas_operacao;
DROP POLICY IF EXISTS alertas_operacao_insert ON public.alertas_operacao;
DROP POLICY IF EXISTS alertas_operacao_update ON public.alertas_operacao;
CREATE POLICY alertas_operacao_select ON public.alertas_operacao FOR SELECT TO authenticated USING (public.pode_operar(auth.uid()));
CREATE POLICY alertas_operacao_insert ON public.alertas_operacao FOR INSERT TO authenticated WITH CHECK (public.pode_operar(auth.uid()));
CREATE POLICY alertas_operacao_update ON public.alertas_operacao FOR UPDATE TO authenticated USING (public.pode_operar(auth.uid())) WITH CHECK (public.pode_operar(auth.uid()));

-- auditoria: leitura apenas admin, escrita apenas operacao
DROP POLICY IF EXISTS auditoria_select ON public.auditoria;
DROP POLICY IF EXISTS auditoria_insert ON public.auditoria;
CREATE POLICY auditoria_select ON public.auditoria FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY auditoria_insert ON public.auditoria FOR INSERT TO authenticated WITH CHECK (public.pode_operar(auth.uid()));

-- candidatos: somente operacao
DROP POLICY IF EXISTS candidatos_select ON public.candidatos;
DROP POLICY IF EXISTS candidatos_insert ON public.candidatos;
CREATE POLICY candidatos_select ON public.candidatos FOR SELECT TO authenticated USING (public.pode_operar(auth.uid()));
CREATE POLICY candidatos_insert ON public.candidatos FOR INSERT TO authenticated WITH CHECK (public.pode_operar(auth.uid()) AND criado_por = auth.uid());

-- colaboradores: leitura para o dashboard, escrita apenas operacao
DROP POLICY IF EXISTS colaboradores_write ON public.colaboradores;
CREATE POLICY colaboradores_write ON public.colaboradores FOR ALL TO authenticated USING (public.pode_operar(auth.uid())) WITH CHECK (public.pode_operar(auth.uid()));

-- bloqueios: leitura apenas operacao
DROP POLICY IF EXISTS bloqueados_select ON public.colaboradores_bloqueados;
CREATE POLICY bloqueados_select ON public.colaboradores_bloqueados FOR SELECT TO authenticated USING (public.pode_operar(auth.uid()));

-- importacoes: somente operacao
DROP POLICY IF EXISTS importacoes_all ON public.importacoes;
CREATE POLICY importacoes_all ON public.importacoes FOR ALL TO authenticated USING (public.pode_operar(auth.uid())) WITH CHECK (public.pode_operar(auth.uid()));

-- historico de quinzenas: leitura apenas operacao
DROP POLICY IF EXISTS quinzenas_select ON public.quinzenas_historico;
CREATE POLICY quinzenas_select ON public.quinzenas_historico FOR SELECT TO authenticated USING (public.pode_operar(auth.uid()));

-- presenca do chat: somente operacao
DROP POLICY IF EXISTS "ver presenca" ON public.presenca_usuarios;
CREATE POLICY "ver presenca" ON public.presenca_usuarios FOR SELECT TO authenticated USING (public.pode_operar(auth.uid()));

-- vagas: leitura para o dashboard, escrita apenas operacao
DROP POLICY IF EXISTS vagas_insert ON public.vagas;
DROP POLICY IF EXISTS vagas_update ON public.vagas;
DROP POLICY IF EXISTS vagas_delete ON public.vagas;
CREATE POLICY vagas_insert ON public.vagas FOR INSERT TO authenticated
  WITH CHECK (public.pode_operar(auth.uid()) AND (programadora_id = auth.uid() OR programadora_id IS NULL));
CREATE POLICY vagas_update ON public.vagas FOR UPDATE TO authenticated
  USING (public.pode_operar(auth.uid()) AND (programadora_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  WITH CHECK (public.pode_operar(auth.uid()));
CREATE POLICY vagas_delete ON public.vagas FOR DELETE TO authenticated
  USING (public.pode_operar(auth.uid()) AND (programadora_id = auth.uid() OR public.has_role(auth.uid(), 'admin')));

-- notificacoes: individuais; avisos administrativos apenas para admin
DROP POLICY IF EXISTS notificacoes_select ON public.notificacoes;
DROP POLICY IF EXISTS notificacoes_insert ON public.notificacoes;
DROP POLICY IF EXISTS notificacoes_update ON public.notificacoes;
CREATE POLICY notificacoes_select ON public.notificacoes FOR SELECT TO authenticated
  USING ((user_id = auth.uid() AND para_admin = false) OR (para_admin AND public.has_role(auth.uid(), 'admin')));
CREATE POLICY notificacoes_insert ON public.notificacoes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY notificacoes_update ON public.notificacoes FOR UPDATE TO authenticated
  USING ((user_id = auth.uid() AND para_admin = false) OR (para_admin AND public.has_role(auth.uid(), 'admin')))
  WITH CHECK ((user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));