ALTER TABLE public.backups
  ADD COLUMN IF NOT EXISTS drive_status text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS drive_file_id text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS drive_link text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS drive_em timestamp with time zone,
  ADD COLUMN IF NOT EXISTS drive_erro text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.app_user_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  connector_id text NOT NULL,
  connection_key_ciphertext text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, connector_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_user_connections TO service_role;
ALTER TABLE public.app_user_connections ENABLE ROW LEVEL SECURITY;