CREATE OR REPLACE FUNCTION public.impedir_autoescalacao_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ator uuid := auth.uid();
  ator_admin boolean := false;
BEGIN
  -- Operações de sistema (service_role / jobs sem sessão) seguem livres.
  IF ator IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT public.has_role(ator, 'admin'::app_role)
      OR COALESCE((SELECT p.master FROM public.profiles p WHERE p.id = ator), false)
    INTO ator_admin;

  IF ator_admin THEN
    RETURN NEW;
  END IF;

  -- Usuário comum não pode alterar as colunas que definem privilégio.
  NEW.master := OLD.master;
  NEW.perfil_id := OLD.perfil_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_impedir_autoescalacao_profile ON public.profiles;
CREATE TRIGGER trg_impedir_autoescalacao_profile
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.impedir_autoescalacao_profile();