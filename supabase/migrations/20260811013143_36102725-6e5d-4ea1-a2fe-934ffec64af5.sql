ALTER TABLE public.backup_agendamento
  ADD COLUMN IF NOT EXISTS email_destino text NOT NULL DEFAULT 'rochatahtah@gmail.com',
  ADD COLUMN IF NOT EXISTS ultimo_envio_em timestamptz,
  ADD COLUMN IF NOT EXISTS ultimo_envio_status text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ultimo_envio_erro text NOT NULL DEFAULT '';

ALTER TABLE public.backups
  ADD COLUMN IF NOT EXISTS envio_status text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS envio_email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS envio_em timestamptz;