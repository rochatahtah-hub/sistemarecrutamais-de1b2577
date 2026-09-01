CREATE OR REPLACE FUNCTION public.impedir_ficha_duplicada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existe boolean;
BEGIN
  IF NEW.candidato_id IS NULL OR NEW.empresa_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF COALESCE(NEW.status, '') = 'CANCELAMENTO' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.vagas v
    WHERE v.tenant_id = NEW.tenant_id
      AND v.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND v.candidato_id = NEW.candidato_id
      AND v.empresa_id = NEW.empresa_id
      AND v.data = NEW.data
      AND lower(btrim(COALESCE(v.cargo, ''))) = lower(btrim(COALESCE(NEW.cargo, '')))
      AND COALESCE(v.status, '') <> 'CANCELAMENTO'
  ) INTO _existe;

  IF _existe THEN
    RAISE EXCEPTION 'Ficha já fechada para esta vaga. Este colaborador já possui uma ficha fechada para esta mesma vaga. Verifique o histórico antes de continuar.'
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.impedir_ficha_duplicada() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_impedir_ficha_duplicada ON public.vagas;
CREATE TRIGGER trg_impedir_ficha_duplicada
BEFORE INSERT OR UPDATE OF candidato_id, empresa_id, data, cargo, status ON public.vagas
FOR EACH ROW EXECUTE FUNCTION public.impedir_ficha_duplicada();