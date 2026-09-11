ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS troca_senha_obrigatoria boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.troca_senha_obrigatoria IS 'Exige que o usuário defina uma senha pessoal antes de acessar a plataforma.';