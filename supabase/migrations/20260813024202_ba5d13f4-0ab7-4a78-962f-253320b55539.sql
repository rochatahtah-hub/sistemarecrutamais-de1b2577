CREATE OR REPLACE FUNCTION public.proteger_campos_privilegiados()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _autorizado boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  _autorizado := public.eh_master(auth.uid()) OR public.has_role(auth.uid(), 'admin');
  IF _autorizado THEN
    RETURN NEW;
  END IF;

  IF NEW.master IS DISTINCT FROM OLD.master THEN
    RAISE EXCEPTION 'Sem permissão para alterar o nível master.' USING ERRCODE = '42501';
  END IF;
  IF NEW.perfil_id IS DISTINCT FROM OLD.perfil_id THEN
    RAISE EXCEPTION 'Sem permissão para alterar o perfil de acesso.' USING ERRCODE = '42501';
  END IF;
  IF NEW.ativo IS DISTINCT FROM OLD.ativo THEN
    RAISE EXCEPTION 'Sem permissão para alterar o status de acesso.' USING ERRCODE = '42501';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Sem permissão para alterar o identificador.' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_campos_privilegiados ON public.profiles;
CREATE TRIGGER trg_proteger_campos_privilegiados
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.proteger_campos_privilegiados();

REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.profiles FROM authenticated;