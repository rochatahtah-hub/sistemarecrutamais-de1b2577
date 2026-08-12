-- ============ PERFIS E PERMISSÕES ============
CREATE TABLE public.perfis_acesso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  sistema boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfis_acesso TO authenticated;
GRANT ALL ON public.perfis_acesso TO service_role;
ALTER TABLE public.perfis_acesso ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.perfil_permissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id uuid NOT NULL REFERENCES public.perfis_acesso(id) ON DELETE CASCADE,
  modulo text NOT NULL,
  acao text NOT NULL,
  permitido boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (perfil_id, modulo, acao)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfil_permissoes TO authenticated;
GRANT ALL ON public.perfil_permissoes TO service_role;
ALTER TABLE public.perfil_permissoes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.permissoes_usuario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  modulo text NOT NULL,
  acao text NOT NULL,
  permitido boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, modulo, acao)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.permissoes_usuario TO authenticated;
GRANT ALL ON public.permissoes_usuario TO service_role;
ALTER TABLE public.permissoes_usuario ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS master boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS perfil_id uuid REFERENCES public.perfis_acesso(id) ON DELETE SET NULL;

-- perfis padrão
INSERT INTO public.perfis_acesso (chave, nome, descricao, sistema) VALUES
  ('admin','Administrador','Acesso completo ao sistema.', true),
  ('programadora','Programadora','Operação diária de programação e vagas.', true),
  ('supervisor','Supervisor','Acompanhamento gerencial pelo Dashboard.', true),
  ('coordenador','Coordenador','Responsável pelo acompanhamento da operação e equipe.', true),
  ('comercial','Comercial','Visão comercial pelo Dashboard.', true);

-- matriz de permissões inicial
DO $seed$
DECLARE
  m record;
  p_admin uuid; p_prog uuid;
  admin_only text[] := ARRAY['programadoras','administracao','importar','metas','bloqueios','auditoria','configuracoes','saude','backups','acessos','perfis','banco_colaboradores'];
BEGIN
  SELECT id INTO p_admin FROM public.perfis_acesso WHERE chave='admin';
  SELECT id INTO p_prog FROM public.perfis_acesso WHERE chave='programadora';

  FOR m IN
    SELECT * FROM (VALUES
      ('dashboard', ARRAY['visualizar']),
      ('vagas', ARRAY['visualizar','criar','editar','excluir','exportar']),
      ('programacao', ARRAY['visualizar','criar','editar','excluir']),
      ('programadoras', ARRAY['visualizar','editar']),
      ('candidatos', ARRAY['visualizar','criar','editar','excluir']),
      ('confirmacoes', ARRAY['visualizar','editar']),
      ('equipe', ARRAY['visualizar','criar','editar','excluir']),
      ('empresas', ARRAY['visualizar','criar','editar','excluir']),
      ('metas', ARRAY['visualizar','criar','editar','excluir']),
      ('bloqueios', ARRAY['visualizar','criar','editar','excluir']),
      ('performance', ARRAY['visualizar','exportar']),
      ('analise', ARRAY['visualizar']),
      ('radar', ARRAY['visualizar']),
      ('comparar', ARRAY['visualizar']),
      ('relatorios', ARRAY['visualizar','exportar']),
      ('chat', ARRAY['utilizar']),
      ('importar', ARRAY['visualizar','criar']),
      ('historico', ARRAY['visualizar','exportar']),
      ('auditoria', ARRAY['visualizar','exportar']),
      ('acessos', ARRAY['visualizar']),
      ('backups', ARRAY['visualizar','criar','excluir']),
      ('configuracoes', ARRAY['visualizar','editar']),
      ('administracao', ARRAY['visualizar','administrar']),
      ('saude', ARRAY['visualizar','exportar']),
      ('perfis', ARRAY['visualizar','administrar']),
      ('banco_colaboradores', ARRAY['visualizar','criar','editar','excluir','exportar'])
    ) AS t(modulo, acoes)
  LOOP
    INSERT INTO public.perfil_permissoes (perfil_id, modulo, acao, permitido)
    SELECT p_admin, m.modulo, unnest(m.acoes), true;

    INSERT INTO public.perfil_permissoes (perfil_id, modulo, acao, permitido)
    SELECT p_prog, m.modulo, unnest(m.acoes), NOT (m.modulo = ANY(admin_only));

    INSERT INTO public.perfil_permissoes (perfil_id, modulo, acao, permitido)
    SELECT pa.id, m.modulo, unnest(m.acoes), (m.modulo = 'dashboard')
    FROM public.perfis_acesso pa WHERE pa.chave IN ('supervisor','coordenador','comercial');
  END LOOP;
END
$seed$;

-- todo admin existente vira master
UPDATE public.profiles p SET master = true
WHERE EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.role = 'admin');

CREATE OR REPLACE FUNCTION public.eh_master(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND master)
$$;

CREATE OR REPLACE FUNCTION public.perfil_do_usuario(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT p.perfil_id FROM public.profiles p WHERE p.id = _user_id),
    (SELECT pa.id FROM public.user_roles r
       JOIN public.perfis_acesso pa ON pa.chave = r.role::text
      WHERE r.user_id = _user_id
      ORDER BY (pa.chave = 'admin') DESC LIMIT 1)
  )
$$;

CREATE OR REPLACE FUNCTION public.tem_permissao(_user_id uuid, _modulo text, _acao text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    WHEN public.eh_master(_user_id) THEN true
    ELSE COALESCE(
      (SELECT u.permitido FROM public.permissoes_usuario u
        WHERE u.user_id = _user_id AND u.modulo = _modulo AND u.acao = _acao),
      (SELECT pp.permitido FROM public.perfil_permissoes pp
        WHERE pp.perfil_id = public.perfil_do_usuario(_user_id)
          AND pp.modulo = _modulo AND pp.acao = _acao),
      false)
  END
$$;

CREATE OR REPLACE FUNCTION public.minhas_permissoes()
RETURNS TABLE(modulo text, acao text, permitido boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.modulo, m.acao, public.tem_permissao(auth.uid(), m.modulo, m.acao)
  FROM (SELECT DISTINCT pp.modulo, pp.acao FROM public.perfil_permissoes pp) m
  WHERE auth.uid() IS NOT NULL
$$;

-- pode_operar agora respeita permissões concedidas pelo administrador
CREATE OR REPLACE FUNCTION public.pode_operar(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','programadora'))
      OR public.tem_permissao(_user_id, 'vagas', 'editar')
$$;

-- políticas
CREATE POLICY "Autenticados leem perfis" ON public.perfis_acesso FOR SELECT TO authenticated USING (true);
CREATE POLICY "Master administra perfis" ON public.perfis_acesso FOR ALL TO authenticated
  USING (public.eh_master(auth.uid())) WITH CHECK (public.eh_master(auth.uid()));

CREATE POLICY "Autenticados leem permissoes de perfil" ON public.perfil_permissoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Master administra permissoes de perfil" ON public.perfil_permissoes FOR ALL TO authenticated
  USING (public.eh_master(auth.uid())) WITH CHECK (public.eh_master(auth.uid()));

CREATE POLICY "Usuario le suas excecoes" ON public.permissoes_usuario FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.eh_master(auth.uid()));
CREATE POLICY "Master administra excecoes" ON public.permissoes_usuario FOR ALL TO authenticated
  USING (public.eh_master(auth.uid())) WITH CHECK (public.eh_master(auth.uid()));

CREATE TRIGGER trg_perfis_updated BEFORE UPDATE ON public.perfis_acesso
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_perfil_perm_updated BEFORE UPDATE ON public.perfil_permissoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_perm_usuario_updated BEFORE UPDATE ON public.permissoes_usuario
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_auditoria_perfil_perm AFTER INSERT OR UPDATE OR DELETE ON public.perfil_permissoes
  FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();
CREATE TRIGGER trg_auditoria_perm_usuario AFTER INSERT OR UPDATE OR DELETE ON public.permissoes_usuario
  FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();
CREATE TRIGGER trg_auditoria_perfis AFTER INSERT OR UPDATE OR DELETE ON public.perfis_acesso
  FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();

-- proteção: sempre existe pelo menos um administrador master ativo
CREATE OR REPLACE FUNCTION public.proteger_ultimo_master()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (OLD.master AND (NOT NEW.master OR NEW.ativo = false)) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE master AND ativo AND id <> OLD.id
    ) THEN
      RAISE EXCEPTION 'É necessário manter pelo menos um administrador master ativo.';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_proteger_master BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.proteger_ultimo_master();

-- ============ PORTAL DE DIÁRIAS ============
CREATE TABLE public.daily_workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL UNIQUE,
  city text NOT NULL,
  neighborhood text NOT NULL,
  available_for_daily boolean NOT NULL DEFAULT true,
  available_days text[] NOT NULL DEFAULT '{}',
  available_periods text[] NOT NULL DEFAULT '{}',
  desired_role text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'novo',
  consent_accepted boolean NOT NULL DEFAULT false,
  consent_date timestamptz,
  observacao text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.daily_workers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_workers TO authenticated;
GRANT ALL ON public.daily_workers TO service_role;
ALTER TABLE public.daily_workers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Portal publico apenas cadastra" ON public.daily_workers FOR INSERT TO anon
  WITH CHECK (consent_accepted AND status = 'novo');
CREATE POLICY "Autorizados leem banco de colaboradores" ON public.daily_workers FOR SELECT TO authenticated
  USING (public.tem_permissao(auth.uid(), 'banco_colaboradores', 'visualizar'));
CREATE POLICY "Autorizados cadastram" ON public.daily_workers FOR INSERT TO authenticated
  WITH CHECK (public.tem_permissao(auth.uid(), 'banco_colaboradores', 'criar'));
CREATE POLICY "Autorizados editam" ON public.daily_workers FOR UPDATE TO authenticated
  USING (public.tem_permissao(auth.uid(), 'banco_colaboradores', 'editar'))
  WITH CHECK (public.tem_permissao(auth.uid(), 'banco_colaboradores', 'editar'));
CREATE POLICY "Autorizados excluem" ON public.daily_workers FOR DELETE TO authenticated
  USING (public.tem_permissao(auth.uid(), 'banco_colaboradores', 'excluir'));

CREATE TRIGGER trg_daily_workers_updated BEFORE UPDATE ON public.daily_workers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.notificar_novo_colaborador_diaria()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notificacoes (user_id, tipo, titulo, mensagem, para_admin, chave)
  VALUES (NULL, 'banco-colaboradores', 'Novo colaborador cadastrado',
    format('%s se cadastrou para oportunidades de diária.', NEW.full_name),
    true, format('diaria-%s', NEW.id))
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notificar_diaria AFTER INSERT ON public.daily_workers
  FOR EACH ROW EXECUTE FUNCTION public.notificar_novo_colaborador_diaria();