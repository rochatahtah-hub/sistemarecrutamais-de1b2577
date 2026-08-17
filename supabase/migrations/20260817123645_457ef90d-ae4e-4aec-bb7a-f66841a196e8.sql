ALTER TABLE public.backup_agendamento DROP CONSTRAINT IF EXISTS backup_agendamento_pkey;
ALTER TABLE public.backup_agendamento ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.backup_agendamento ALTER COLUMN id SET DEFAULT true;
CREATE UNIQUE INDEX IF NOT EXISTS backup_agendamento_tenant_uidx ON public.backup_agendamento (tenant_id);
ALTER TABLE public.backup_agendamento ADD PRIMARY KEY (tenant_id);