ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS funcao_id uuid REFERENCES public.funcoes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_funcao_id ON public.profiles(funcao_id);

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
  IF NEW.funcao_id IS DISTINCT FROM OLD.funcao_id THEN
    RAISE EXCEPTION 'Sem permissão para alterar a função da equipe.' USING ERRCODE = '42501';
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

REVOKE ALL ON FUNCTION public.proteger_campos_privilegiados() FROM PUBLIC, anon, authenticated;