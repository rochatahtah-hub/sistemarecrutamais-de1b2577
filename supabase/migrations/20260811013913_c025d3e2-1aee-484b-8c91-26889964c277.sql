ALTER TABLE public.backups DROP CONSTRAINT IF EXISTS backups_criado_por_fkey;
ALTER TABLE public.backups
  ADD CONSTRAINT backups_criado_por_fkey
  FOREIGN KEY (criado_por) REFERENCES auth.users(id) ON DELETE SET NULL;