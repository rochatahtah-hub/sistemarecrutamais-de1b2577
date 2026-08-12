ALTER TABLE public.daily_workers ADD COLUMN IF NOT EXISTS cpf text NOT NULL DEFAULT '';

ALTER TABLE public.daily_workers ADD COLUMN IF NOT EXISTS cpf_mascara text
  GENERATED ALWAYS AS (
    CASE WHEN length(cpf) = 11
      THEN '***.***.' || substr(cpf,7,3) || '-**'
      ELSE '' END
  ) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS daily_workers_cpf_uidx ON public.daily_workers (cpf) WHERE cpf <> '';
CREATE UNIQUE INDEX IF NOT EXISTS daily_workers_phone_uidx ON public.daily_workers (phone) WHERE phone <> '';

-- Proteção do CPF: leitura por coluna (authenticated não enxerga a coluna cpf)
REVOKE SELECT ON public.daily_workers FROM authenticated;
GRANT SELECT (id, full_name, phone, city, neighborhood, available_for_daily, available_days,
  available_periods, desired_role, status, consent_accepted, consent_date, observacao,
  created_at, updated_at, cpf_mascara) ON public.daily_workers TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.daily_workers TO authenticated;
GRANT ALL ON public.daily_workers TO service_role;

CREATE OR REPLACE FUNCTION public.cpf_colaborador_diaria(_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN public.eh_master(auth.uid()) OR public.has_role(auth.uid(), 'admin')
      THEN (SELECT d.cpf FROM public.daily_workers d WHERE d.id = _id)
    ELSE NULL
  END
$$;

REVOKE ALL ON FUNCTION public.cpf_colaborador_diaria(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.cpf_colaborador_diaria(uuid) TO authenticated;