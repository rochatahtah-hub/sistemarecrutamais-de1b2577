-- ============ FASE 1 — FUNDAÇÃO MULTIEMPRESA ============

CREATE TABLE IF NOT EXISTS public.planos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  limites jsonb NOT NULL DEFAULT '{}'::jsonb,
  modulos jsonb NOT NULL DEFAULT '{}'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text NOT NULL UNIQUE,
  plano_id uuid REFERENCES public.planos(id),
  ativo boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'ativo',
  dados_comerciais jsonb NOT NULL DEFAULT '{}'::jsonb,
  configuracoes jsonb NOT NULL DEFAULT '{}'::jsonb,
  limites jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.super_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  observacao text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.planos TO authenticated;
GRANT ALL ON public.planos TO service_role;
GRANT SELECT ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
GRANT ALL ON public.super_admins TO service_role;

ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_planos_updated ON public.planos;
CREATE TRIGGER trg_planos_updated BEFORE UPDATE ON public.planos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_tenants_updated ON public.tenants;
CREATE TRIGGER trg_tenants_updated BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.planos (chave, nome, descricao)
VALUES ('essencial','Essencial','Plano inicial'),
       ('profissional','Profissional','Plano intermediário'),
       ('enterprise','Enterprise','Plano completo')
ON CONFLICT (chave) DO NOTHING;

INSERT INTO public.tenants (nome, slug, plano_id, status)
VALUES ('Recruta+ — Operação Atual','operacao-atual',
        (SELECT id FROM public.planos WHERE chave='enterprise'),'ativo')
ON CONFLICT (slug) DO NOTHING;

-- ============ COLUNA tenant_id + BACKFILL ============
DO $do$
DECLARE
  _t text;
  _tenant uuid := (SELECT id FROM public.tenants WHERE slug='operacao-atual');
  _tabelas text[] := ARRAY[
    'profiles','empresas','colaboradores','candidatos','vagas','colaboradores_bloqueados',
    'daily_workers','importacoes','quinzenas_historico','alertas_operacao','configuracoes',
    'perfis_acesso','perfil_permissoes','permissoes_usuario','rs_empresas','rs_candidatos',
    'rs_cargos','rs_historico','notificacoes','auditoria','conversas','backups','backup_agendamento'
  ];
BEGIN
  FOREACH _t IN ARRAY _tabelas LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id uuid', _t);
    EXECUTE format('UPDATE public.%I SET tenant_id = %L WHERE tenant_id IS NULL', _t, _tenant);
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)', _t, _t||'_tenant_fk');
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (tenant_id)', 'idx_'||_t||'_tenant', _t);
  END LOOP;
END
$do$;

-- ============ FUNÇÕES DE CONTEXTO ============
CREATE OR REPLACE FUNCTION public.tenant_padrao()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.tenants WHERE slug = 'operacao-atual'
$$;

CREATE OR REPLACE FUNCTION public.eh_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.super_admins s WHERE s.user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.tenant_do_usuario(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.tenant_id FROM public.profiles p WHERE p.id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.tenant_atual()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.tenant_do_usuario(auth.uid())
$$;

REVOKE EXECUTE ON FUNCTION public.tenant_padrao() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tenant_do_usuario(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tenant_atual() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.eh_super_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eh_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_atual() TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_do_usuario(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_padrao() TO authenticated, anon;

-- ============ DEFAULTS (após as funções existirem) ============
DO $do$
DECLARE
  _t text;
  _tabelas text[] := ARRAY[
    'profiles','empresas','colaboradores','candidatos','vagas','colaboradores_bloqueados',
    'daily_workers','importacoes','quinzenas_historico','alertas_operacao','configuracoes',
    'perfis_acesso','perfil_permissoes','permissoes_usuario','rs_empresas','rs_candidatos',
    'rs_cargos','rs_historico','notificacoes','auditoria','conversas','backups','backup_agendamento'
  ];
BEGIN
  FOREACH _t IN ARRAY _tabelas LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT COALESCE(public.tenant_atual(), public.tenant_padrao())', _t);
  END LOOP;
END
$do$;

-- ============ ÍNDICES ÚNICOS POR TENANT (regra 31) ============
ALTER TABLE public.candidatos DROP CONSTRAINT IF EXISTS candidatos_cpf_key;
CREATE UNIQUE INDEX IF NOT EXISTS candidatos_tenant_cpf_uidx ON public.candidatos (tenant_id, cpf);

ALTER TABLE public.colaboradores DROP CONSTRAINT IF EXISTS colaboradores_nome_key;
CREATE UNIQUE INDEX IF NOT EXISTS colaboradores_tenant_nome_uidx ON public.colaboradores (tenant_id, nome);

ALTER TABLE public.empresas DROP CONSTRAINT IF EXISTS empresas_nome_key;
CREATE UNIQUE INDEX IF NOT EXISTS empresas_tenant_nome_uidx ON public.empresas (tenant_id, nome);

ALTER TABLE public.configuracoes DROP CONSTRAINT IF EXISTS configuracoes_chave_key;
CREATE UNIQUE INDEX IF NOT EXISTS configuracoes_tenant_chave_uidx ON public.configuracoes (tenant_id, chave);

ALTER TABLE public.perfis_acesso DROP CONSTRAINT IF EXISTS perfis_acesso_chave_key;
CREATE UNIQUE INDEX IF NOT EXISTS perfis_acesso_tenant_chave_uidx ON public.perfis_acesso (tenant_id, chave);

ALTER TABLE public.quinzenas_historico DROP CONSTRAINT IF EXISTS quinzenas_historico_chave_key;
CREATE UNIQUE INDEX IF NOT EXISTS quinzenas_tenant_chave_uidx ON public.quinzenas_historico (tenant_id, chave);

ALTER TABLE public.daily_workers DROP CONSTRAINT IF EXISTS daily_workers_phone_key;
DROP INDEX IF EXISTS public.daily_workers_cpf_uidx;
DROP INDEX IF EXISTS public.daily_workers_phone_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS daily_workers_tenant_cpf_uidx ON public.daily_workers (tenant_id, cpf) WHERE cpf <> '';
CREATE UNIQUE INDEX IF NOT EXISTS daily_workers_tenant_phone_uidx ON public.daily_workers (tenant_id, phone) WHERE phone <> '';

DROP INDEX IF EXISTS public.rs_cargos_nome_unico;
CREATE UNIQUE INDEX IF NOT EXISTS rs_cargos_tenant_nome_uidx ON public.rs_cargos (tenant_id, lower(nome));
DROP INDEX IF EXISTS public.rs_empresas_nome_uniq;
CREATE UNIQUE INDEX IF NOT EXISTS rs_empresas_tenant_nome_uidx ON public.rs_empresas (tenant_id, lower(nome));

DROP INDEX IF EXISTS public.ux_bloqueio_ativo_geral;
DROP INDEX IF EXISTS public.ux_bloqueio_ativo_empresa;
CREATE UNIQUE INDEX IF NOT EXISTS ux_bloqueio_ativo_geral ON public.colaboradores_bloqueados (tenant_id, cpf) WHERE ativo AND tipo_bloqueio = 'TODAS_EMPRESAS';
CREATE UNIQUE INDEX IF NOT EXISTS ux_bloqueio_ativo_empresa ON public.colaboradores_bloqueados (tenant_id, cpf, empresa_id) WHERE ativo AND tipo_bloqueio = 'EMPRESA_ESPECIFICA';

-- ============ POLÍTICAS DAS NOVAS TABELAS ============
DROP POLICY IF EXISTS tenants_select ON public.tenants;
CREATE POLICY tenants_select ON public.tenants FOR SELECT TO authenticated
  USING (id = public.tenant_atual() OR public.eh_super_admin(auth.uid()));
DROP POLICY IF EXISTS tenants_admin ON public.tenants;
CREATE POLICY tenants_admin ON public.tenants FOR ALL TO authenticated
  USING (public.eh_super_admin(auth.uid())) WITH CHECK (public.eh_super_admin(auth.uid()));

DROP POLICY IF EXISTS planos_select ON public.planos;
CREATE POLICY planos_select ON public.planos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS planos_admin ON public.planos;
CREATE POLICY planos_admin ON public.planos FOR ALL TO authenticated
  USING (public.eh_super_admin(auth.uid())) WITH CHECK (public.eh_super_admin(auth.uid()));

-- ============ NOVOS USUÁRIOS HERDAM O TENANT ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
  INSERT INTO public.profiles (id, nome, email, tenant_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)), NEW.email, public.tenant_padrao())
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN (SELECT count(*) FROM public.user_roles WHERE role='admin') = 0 THEN 'admin'::public.app_role ELSE 'programadora'::public.app_role END)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $function$;