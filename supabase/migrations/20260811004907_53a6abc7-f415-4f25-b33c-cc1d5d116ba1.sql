CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE public.backups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  formato text NOT NULL DEFAULT 'sql',
  origem text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'processando',
  arquivo_path text NOT NULL DEFAULT '',
  arquivo_nome text NOT NULL DEFAULT '',
  tamanho_bytes bigint NOT NULL DEFAULT 0,
  total_tabelas integer NOT NULL DEFAULT 0,
  total_registros integer NOT NULL DEFAULT 0,
  erro text NOT NULL DEFAULT '',
  duracao_ms integer NOT NULL DEFAULT 0,
  criado_por uuid REFERENCES auth.users,
  criado_por_nome text NOT NULL DEFAULT 'Sistema',
  concluido_em timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.backups TO authenticated;
GRANT ALL ON public.backups TO service_role;

ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "backups_admin_select" ON public.backups FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "backups_admin_insert" ON public.backups FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "backups_admin_update" ON public.backups FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "backups_admin_delete" ON public.backups FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_backups_created_at ON public.backups (created_at DESC);

CREATE TRIGGER trg_backups_updated BEFORE UPDATE ON public.backups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.backup_agendamento (
  id boolean NOT NULL DEFAULT true PRIMARY KEY CHECK (id),
  ativo boolean NOT NULL DEFAULT false,
  frequencia text NOT NULL DEFAULT 'diaria',
  hora integer NOT NULL DEFAULT 3,
  dia_semana integer NOT NULL DEFAULT 1,
  dia_mes integer NOT NULL DEFAULT 1,
  formato text NOT NULL DEFAULT 'sql',
  retencao_dias integer NOT NULL DEFAULT 30,
  ultima_execucao timestamp with time zone,
  proxima_execucao timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.backup_agendamento TO authenticated;
GRANT ALL ON public.backup_agendamento TO service_role;

ALTER TABLE public.backup_agendamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "backup_agendamento_admin_select" ON public.backup_agendamento FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "backup_agendamento_admin_insert" ON public.backup_agendamento FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "backup_agendamento_admin_update" ON public.backup_agendamento FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_backup_agendamento_updated BEFORE UPDATE ON public.backup_agendamento
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.backup_agendamento (id) VALUES (true) ON CONFLICT (id) DO NOTHING;