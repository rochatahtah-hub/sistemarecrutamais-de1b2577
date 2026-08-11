-- ============ CHAT INTERNO ============
CREATE TABLE public.conversas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL DEFAULT 'direta' CHECK (tipo IN ('direta','grupo')),
  nome text NOT NULL DEFAULT '',
  descricao text NOT NULL DEFAULT '',
  foto_url text NOT NULL DEFAULT '',
  chave_direta text UNIQUE,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.conversa_participantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id uuid NOT NULL REFERENCES public.conversas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin boolean NOT NULL DEFAULT false,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversa_id, user_id)
);
CREATE INDEX idx_cp_user ON public.conversa_participantes(user_id);
CREATE INDEX idx_cp_conversa ON public.conversa_participantes(conversa_id);

CREATE TABLE public.mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id uuid NOT NULL REFERENCES public.conversas(id) ON DELETE CASCADE,
  autor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  conteudo text NOT NULL DEFAULT '',
  responde_a uuid REFERENCES public.mensagens(id) ON DELETE SET NULL,
  excluida boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_msg_conversa ON public.mensagens(conversa_id, created_at DESC);

CREATE TABLE public.presenca_usuarios (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  online boolean NOT NULL DEFAULT false,
  ultimo_visto timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ GRANTS ============
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversas TO authenticated;
GRANT ALL ON public.conversas TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversa_participantes TO authenticated;
GRANT ALL ON public.conversa_participantes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mensagens TO authenticated;
GRANT ALL ON public.mensagens TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.presenca_usuarios TO authenticated;
GRANT ALL ON public.presenca_usuarios TO service_role;

-- ============ FUNÇÕES DE APOIO (sem recursão de RLS) ============
CREATE OR REPLACE FUNCTION public.participa_conversa(_conversa uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.conversa_participantes p
                 WHERE p.conversa_id = _conversa AND p.user_id = _user)
$$;

CREATE OR REPLACE FUNCTION public.admin_conversa(_conversa uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.conversa_participantes p
                 WHERE p.conversa_id = _conversa AND p.user_id = _user AND p.admin)
$$;

CREATE OR REPLACE FUNCTION public.criador_conversa(_conversa uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.conversas c
                 WHERE c.id = _conversa AND c.criado_por = _user)
$$;

-- ============ RLS ============
ALTER TABLE public.conversas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ver conversas que participo" ON public.conversas FOR SELECT TO authenticated
  USING (public.participa_conversa(id, auth.uid()) OR criado_por = auth.uid());
CREATE POLICY "criar conversas" ON public.conversas FOR INSERT TO authenticated
  WITH CHECK (criado_por = auth.uid());
CREATE POLICY "admin edita conversa" ON public.conversas FOR UPDATE TO authenticated
  USING (public.admin_conversa(id, auth.uid()))
  WITH CHECK (public.admin_conversa(id, auth.uid()));
CREATE POLICY "admin apaga conversa" ON public.conversas FOR DELETE TO authenticated
  USING (public.admin_conversa(id, auth.uid()) OR criado_por = auth.uid());

ALTER TABLE public.conversa_participantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ver participantes das minhas conversas" ON public.conversa_participantes FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.participa_conversa(conversa_id, auth.uid()));
CREATE POLICY "adicionar participantes" ON public.conversa_participantes FOR INSERT TO authenticated
  WITH CHECK (public.criador_conversa(conversa_id, auth.uid()) OR public.admin_conversa(conversa_id, auth.uid()));
CREATE POLICY "atualizar minha participacao" ON public.conversa_participantes FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.admin_conversa(conversa_id, auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.admin_conversa(conversa_id, auth.uid()));
CREATE POLICY "sair ou remover participante" ON public.conversa_participantes FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.admin_conversa(conversa_id, auth.uid()));

ALTER TABLE public.mensagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ver mensagens das minhas conversas" ON public.mensagens FOR SELECT TO authenticated
  USING (public.participa_conversa(conversa_id, auth.uid()));
CREATE POLICY "enviar mensagens" ON public.mensagens FOR INSERT TO authenticated
  WITH CHECK (autor_id = auth.uid() AND public.participa_conversa(conversa_id, auth.uid()));
CREATE POLICY "editar propria mensagem" ON public.mensagens FOR UPDATE TO authenticated
  USING (autor_id = auth.uid() OR public.admin_conversa(conversa_id, auth.uid()))
  WITH CHECK (autor_id = auth.uid() OR public.admin_conversa(conversa_id, auth.uid()));
CREATE POLICY "apagar propria mensagem" ON public.mensagens FOR DELETE TO authenticated
  USING (autor_id = auth.uid() OR public.admin_conversa(conversa_id, auth.uid()));

ALTER TABLE public.presenca_usuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ver presenca" ON public.presenca_usuarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "gravar minha presenca" ON public.presenca_usuarios FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "atualizar minha presenca" ON public.presenca_usuarios FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ CHAT TEMPORÁRIO: apaga conversa quando o último sai ============
CREATE OR REPLACE FUNCTION public.limpar_conversa_vazia()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.conversa_participantes WHERE conversa_id = OLD.conversa_id) THEN
    DELETE FROM public.conversas WHERE id = OLD.conversa_id;
  END IF;
  RETURN OLD;
END; $$;

CREATE TRIGGER trg_conversa_vazia
AFTER DELETE ON public.conversa_participantes
FOR EACH ROW EXECUTE FUNCTION public.limpar_conversa_vazia();

CREATE TRIGGER trg_conversas_updated BEFORE UPDATE ON public.conversas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_mensagens_updated BEFORE UPDATE ON public.mensagens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_presenca_updated BEFORE UPDATE ON public.presenca_usuarios
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ TEMPO REAL ============
ALTER TABLE public.conversas REPLICA IDENTITY FULL;
ALTER TABLE public.conversa_participantes REPLICA IDENTITY FULL;
ALTER TABLE public.mensagens REPLICA IDENTITY FULL;
ALTER TABLE public.presenca_usuarios REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversa_participantes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mensagens;
ALTER PUBLICATION supabase_realtime ADD TABLE public.presenca_usuarios;