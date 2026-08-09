-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin','programadora');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY user_roles_select_self ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- PROFILES (programadoras)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT 'Programadora',
  email text,
  ativo boolean NOT NULL DEFAULT true,
  meta_quinzena integer NOT NULL DEFAULT 0,
  ultimo_acesso timestamptz,
  ultimo_preenchimento timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY profiles_insert_self ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN (SELECT count(*) FROM public.user_roles WHERE role='admin') = 0 THEN 'admin'::public.app_role ELSE 'programadora'::public.app_role END)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CANDIDATOS
CREATE TABLE public.candidatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cpf text NOT NULL UNIQUE,
  telefone text,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidatos TO authenticated;
GRANT ALL ON public.candidatos TO service_role;
ALTER TABLE public.candidatos ENABLE ROW LEVEL SECURITY;
CREATE POLICY candidatos_select ON public.candidatos FOR SELECT TO authenticated USING (true);
CREATE POLICY candidatos_insert ON public.candidatos FOR INSERT TO authenticated WITH CHECK (criado_por = auth.uid());
CREATE POLICY candidatos_update ON public.candidatos FOR UPDATE TO authenticated
  USING (criado_por = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (true);
CREATE POLICY candidatos_delete ON public.candidatos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_candidatos_updated BEFORE UPDATE ON public.candidatos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- VAGAS: passa a ser a base central tambem para lancamentos manuais
ALTER TABLE public.vagas
  ADD COLUMN IF NOT EXISTS candidato_id uuid REFERENCES public.candidatos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS programadora_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'manual';

-- NOTIFICACOES
CREATE TABLE public.notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  titulo text NOT NULL,
  mensagem text NOT NULL,
  lida boolean NOT NULL DEFAULT false,
  para_admin boolean NOT NULL DEFAULT false,
  chave text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, chave)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notificacoes TO authenticated;
GRANT ALL ON public.notificacoes TO service_role;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY notificacoes_select ON public.notificacoes FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (para_admin AND public.has_role(auth.uid(),'admin')));
CREATE POLICY notificacoes_insert ON public.notificacoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY notificacoes_update ON public.notificacoes FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (true);
CREATE POLICY notificacoes_delete ON public.notificacoes FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- HISTORICO DE QUINZENAS
CREATE TABLE public.quinzenas_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  inicio date NOT NULL,
  fim date NOT NULL,
  resumo jsonb NOT NULL DEFAULT '{}'::jsonb,
  fechada_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quinzenas_historico TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.quinzenas_historico TO authenticated;
GRANT ALL ON public.quinzenas_historico TO service_role;
ALTER TABLE public.quinzenas_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY quinzenas_select ON public.quinzenas_historico FOR SELECT TO authenticated USING (true);
CREATE POLICY quinzenas_write ON public.quinzenas_historico FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- FECHA O ACESSO PUBLICO DAS TABELAS EXISTENTES
DROP POLICY IF EXISTS vagas_public_all ON public.vagas;
DROP POLICY IF EXISTS colaboradores_public_all ON public.colaboradores;
DROP POLICY IF EXISTS empresas_public_all ON public.empresas;
DROP POLICY IF EXISTS importacoes_public_all ON public.importacoes;
DROP POLICY IF EXISTS configuracoes_public_all ON public.configuracoes;
REVOKE ALL ON public.vagas, public.colaboradores, public.empresas, public.importacoes, public.configuracoes FROM anon;

CREATE POLICY vagas_select ON public.vagas FOR SELECT TO authenticated USING (true);
CREATE POLICY vagas_insert ON public.vagas FOR INSERT TO authenticated WITH CHECK (programadora_id = auth.uid() OR programadora_id IS NULL);
CREATE POLICY vagas_update ON public.vagas FOR UPDATE TO authenticated
  USING (programadora_id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (true);
CREATE POLICY vagas_delete ON public.vagas FOR DELETE TO authenticated
  USING (programadora_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY colaboradores_select ON public.colaboradores FOR SELECT TO authenticated USING (true);
CREATE POLICY colaboradores_write ON public.colaboradores FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY empresas_select ON public.empresas FOR SELECT TO authenticated USING (true);
CREATE POLICY empresas_write ON public.empresas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY importacoes_all ON public.importacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY configuracoes_select ON public.configuracoes FOR SELECT TO authenticated USING (true);
CREATE POLICY configuracoes_write ON public.configuracoes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));