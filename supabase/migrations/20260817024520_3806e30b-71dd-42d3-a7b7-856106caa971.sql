CREATE OR REPLACE FUNCTION public.aplicar_tenant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE _meu uuid := COALESCE(public.tenant_do_usuario(auth.uid()), public.tenant_padrao());
BEGIN
  IF auth.uid() IS NULL OR public.eh_super_admin(auth.uid()) THEN
    IF TG_OP = 'INSERT' AND NEW.tenant_id IS NULL THEN NEW.tenant_id := _meu; END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.tenant_id := _meu;
  ELSE
    IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
      RAISE EXCEPTION 'Acesso negado: não é permitido alterar a empresa do registro.' USING ERRCODE = '42501';
    END IF;
    IF OLD.tenant_id IS DISTINCT FROM _meu THEN
      RAISE EXCEPTION 'Acesso negado: registro pertence a outra empresa.' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $fn$;