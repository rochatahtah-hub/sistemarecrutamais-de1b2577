ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fuso_horario text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS fuso_horario text NOT NULL DEFAULT 'America/Sao_Paulo';
COMMENT ON COLUMN public.profiles.fuso_horario IS 'Fuso IANA do usuário para o dia local das notificações; nulo usa o fuso da empresa.';
COMMENT ON COLUMN public.tenants.fuso_horario IS 'Fuso IANA padrão da empresa para notificações.';