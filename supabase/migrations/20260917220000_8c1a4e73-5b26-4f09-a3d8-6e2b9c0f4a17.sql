-- ============ MENSAGEM DO DIA (abaixo da saudação do Dashboard) ============
--
-- Tabela própria em vez de reaproveitar o que já existe: `mensagens` é o chat
-- (conversa_id/autor_id) e `configuracoes` é chave/valor em JSON — guardar uma
-- lista ali tiraria status por linha, tipo, data e o controle de permissão por
-- registro, que é justamente o que esta funcionalidade precisa.
--
-- tenant_id NULO = mensagem global, vale para todas as empresas. Preenchido =
-- mensagem daquela empresa. Assim o acervo comum não é duplicado por tenant e
-- quem quiser pode ter as suas próprias.

CREATE TABLE IF NOT EXISTS public.mensagens_diarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  texto text NOT NULL CHECK (length(btrim(texto)) BETWEEN 3 AND 280),
  tipo text NOT NULL DEFAULT 'motivacional'
    CHECK (tipo IN ('motivacional','versiculo','reflexao','gratidao','forca','fe','profissional')),
  referencia text,
  ativa boolean NOT NULL DEFAULT true,
  data_especifica date,
  criado_por uuid,
  criado_por_nome text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mensagens_diarias_ativas_idx
  ON public.mensagens_diarias (ativa, tenant_id);

ALTER TABLE public.mensagens_diarias ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mensagens_diarias TO authenticated;
GRANT ALL ON public.mensagens_diarias TO service_role;

-- Leitura: qualquer pessoa logada vê as globais e as da própria empresa.
DROP POLICY IF EXISTS mensagens_diarias_select ON public.mensagens_diarias;
CREATE POLICY mensagens_diarias_select ON public.mensagens_diarias FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR public.acesso_tenant(tenant_id));

-- Escrita: só com a permissão da ação, e só em mensagem da própria empresa.
-- Mensagem global (tenant_id NULO) fica reservada ao Admin Master — uma empresa
-- não edita o que aparece para as outras.
DROP POLICY IF EXISTS mensagens_diarias_insert ON public.mensagens_diarias;
CREATE POLICY mensagens_diarias_insert ON public.mensagens_diarias FOR INSERT TO authenticated
  WITH CHECK (
    public.tem_permissao(auth.uid(), 'mensagens_diarias', 'criar')
    AND (
      (tenant_id IS NOT NULL AND public.acesso_tenant(tenant_id))
      OR (tenant_id IS NULL AND public.eh_super_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS mensagens_diarias_update ON public.mensagens_diarias;
CREATE POLICY mensagens_diarias_update ON public.mensagens_diarias FOR UPDATE TO authenticated
  USING (
    public.tem_permissao(auth.uid(), 'mensagens_diarias', 'editar')
    AND (
      (tenant_id IS NOT NULL AND public.acesso_tenant(tenant_id))
      OR (tenant_id IS NULL AND public.eh_super_admin(auth.uid()))
    )
  )
  WITH CHECK (
    public.tem_permissao(auth.uid(), 'mensagens_diarias', 'editar')
    AND (
      (tenant_id IS NOT NULL AND public.acesso_tenant(tenant_id))
      OR (tenant_id IS NULL AND public.eh_super_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS mensagens_diarias_delete ON public.mensagens_diarias;
CREATE POLICY mensagens_diarias_delete ON public.mensagens_diarias FOR DELETE TO authenticated
  USING (
    public.tem_permissao(auth.uid(), 'mensagens_diarias', 'excluir')
    AND (
      (tenant_id IS NOT NULL AND public.acesso_tenant(tenant_id))
      OR (tenant_id IS NULL AND public.eh_super_admin(auth.uid()))
    )
  );

DROP TRIGGER IF EXISTS trg_mensagens_diarias_updated ON public.mensagens_diarias;
CREATE TRIGGER trg_mensagens_diarias_updated
  BEFORE UPDATE ON public.mensagens_diarias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auditoria: quem mexeu no que aparece para a equipe fica registrado.
--
-- Um gatilho por operação, com WHEN: a função de auditoria tira o tenant da
-- própria linha e `auditoria.tenant_id` é NOT NULL — numa mensagem global
-- (tenant nulo) a gravação do histórico derrubaria o INSERT inteiro. Mensagem
-- global só o Admin Master altera, então não se perde rastro que importe.
DROP TRIGGER IF EXISTS trg_auditoria_mensagens_diarias ON public.mensagens_diarias;

DROP TRIGGER IF EXISTS trg_auditoria_mensagens_diarias_ins ON public.mensagens_diarias;
CREATE TRIGGER trg_auditoria_mensagens_diarias_ins
  AFTER INSERT ON public.mensagens_diarias
  FOR EACH ROW WHEN (NEW.tenant_id IS NOT NULL)
  EXECUTE FUNCTION public.registrar_auditoria();

DROP TRIGGER IF EXISTS trg_auditoria_mensagens_diarias_upd ON public.mensagens_diarias;
CREATE TRIGGER trg_auditoria_mensagens_diarias_upd
  AFTER UPDATE ON public.mensagens_diarias
  FOR EACH ROW WHEN (NEW.tenant_id IS NOT NULL)
  EXECUTE FUNCTION public.registrar_auditoria();

DROP TRIGGER IF EXISTS trg_auditoria_mensagens_diarias_del ON public.mensagens_diarias;
CREATE TRIGGER trg_auditoria_mensagens_diarias_del
  AFTER DELETE ON public.mensagens_diarias
  FOR EACH ROW WHEN (OLD.tenant_id IS NOT NULL)
  EXECUTE FUNCTION public.registrar_auditoria();

-- ---------------------------------------------------------------------------
-- Permissões do módulo: NÃO são semeadas por SQL de propósito.
--
-- perfil_permissoes tem um gatilho BEFORE (aplicar_tenant) que resolve o tenant
-- pela sessão. Rodando daqui não existe sessão, o tenant sai nulo e a auditoria
-- (NOT NULL) derruba o INSERT. Em vez de desligar gatilho na tabela de
-- permissões em produção, o módulo é liberado pelo caminho normal: Perfis e
-- Permissões → Mensagem do Dia. O módulo já aparece lá porque o catálogo do
-- frontend (MODULOS em permissoes.ts) é quem monta a lista.

-- ---------------------------------------------------------------------------
-- Acervo inicial: mensagens globais (tenant_id NULO), disponíveis para todas as
-- empresas. Mistura de frases motivacionais, reflexões e versículos.
-- ---------------------------------------------------------------------------
INSERT INTO public.mensagens_diarias (tenant_id, texto, tipo, referencia, criado_por_nome)
VALUES
  (NULL, 'Você é forte e corajosa. Acredite no seu potencial.', 'forca', NULL, 'Sistema'),
  (NULL, 'Que seu dia seja leve, produtivo e cheio de boas oportunidades.', 'motivacional', NULL, 'Sistema'),
  (NULL, 'Um passo de cada vez. Você está construindo algo importante.', 'reflexao', NULL, 'Sistema'),
  (NULL, 'Você não precisa ser perfeita, apenas dar o seu melhor.', 'reflexao', NULL, 'Sistema'),
  (NULL, 'Que hoje não faltem paz no coração e motivos para sorrir.', 'gratidao', NULL, 'Sistema'),
  (NULL, 'Tudo tem seu tempo. Continue com fé e dedicação.', 'fe', NULL, 'Sistema'),
  (NULL, 'Você é capaz de realizar coisas incríveis. Acredite em você.', 'motivacional', NULL, 'Sistema'),
  (NULL, 'Comece o dia com fé, siga com coragem e termine com gratidão.', 'fe', NULL, 'Sistema'),
  (NULL, 'Organização hoje é tranquilidade amanhã. Siga no seu ritmo.', 'profissional', NULL, 'Sistema'),
  (NULL, 'Cada pessoa que você atende confia no seu cuidado. Isso tem valor.', 'profissional', NULL, 'Sistema'),
  (NULL, 'Respire fundo. O que precisa ser feito cabe no seu dia.', 'reflexao', NULL, 'Sistema'),
  (NULL, 'Agradeça pelo caminho já percorrido. Ele te trouxe até aqui.', 'gratidao', NULL, 'Sistema'),
  (NULL, 'Seja forte e corajoso. Não tenha medo, nem desanime.', 'versiculo', 'Josué 1:9', 'Sistema'),
  (NULL, 'Tudo posso naquele que me fortalece.', 'versiculo', 'Filipenses 4:13', 'Sistema'),
  (NULL, 'Entrega o teu caminho ao Senhor; confia nele, e ele tudo fará.', 'versiculo', 'Salmos 37:5', 'Sistema'),
  (NULL, 'O Senhor é o meu pastor; nada me faltará.', 'versiculo', 'Salmos 23:1', 'Sistema'),
  (NULL, 'Tudo tem o seu tempo determinado debaixo do céu.', 'versiculo', 'Eclesiastes 3:1', 'Sistema')
ON CONFLICT DO NOTHING;
