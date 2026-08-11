ALTER TABLE public.mensagens
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'texto',
  ADD COLUMN IF NOT EXISTS anexo_path text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS anexo_nome text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS anexo_mime text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS anexo_tamanho bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duracao_ms integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.reacoes_mensagem (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mensagem_id uuid NOT NULL REFERENCES public.mensagens(id) ON DELETE CASCADE,
  conversa_id uuid NOT NULL REFERENCES public.conversas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mensagem_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reacoes_mensagem TO authenticated;
GRANT ALL ON public.reacoes_mensagem TO service_role;

ALTER TABLE public.reacoes_mensagem ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reacoes visiveis a participantes" ON public.reacoes_mensagem
  FOR SELECT TO authenticated
  USING (public.participa_conversa(conversa_id, auth.uid()));

CREATE POLICY "reagir na propria conversa" ON public.reacoes_mensagem
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.participa_conversa(conversa_id, auth.uid()));

CREATE POLICY "alterar propria reacao" ON public.reacoes_mensagem
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "remover propria reacao" ON public.reacoes_mensagem
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.reacoes_mensagem;