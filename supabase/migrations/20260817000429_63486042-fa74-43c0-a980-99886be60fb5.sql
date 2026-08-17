ALTER TABLE public.candidatos
  ADD COLUMN IF NOT EXISTS transporte_proprio boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS transporte_tipos text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS precisa_fretado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS transporte_observacao text NOT NULL DEFAULT '';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'candidatos_transporte_tipos_validos') THEN
    ALTER TABLE public.candidatos
      ADD CONSTRAINT candidatos_transporte_tipos_validos
      CHECK (transporte_tipos <@ ARRAY['bicicleta','bicicleta_eletrica','moto','carro']::text[]);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_candidatos_transporte_tipos ON public.candidatos USING gin (transporte_tipos);
CREATE INDEX IF NOT EXISTS idx_candidatos_precisa_fretado ON public.candidatos (precisa_fretado);

CREATE OR REPLACE FUNCTION public.programadoras_da_programacao()
RETURNS TABLE(id uuid, nome text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p.id, p.nome
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.ativo
    AND public.tem_permissao(p.id, 'programacao', 'visualizar')
  ORDER BY p.nome
$function$;

GRANT EXECUTE ON FUNCTION public.programadoras_da_programacao() TO authenticated;