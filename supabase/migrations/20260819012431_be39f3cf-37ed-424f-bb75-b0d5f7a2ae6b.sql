CREATE OR REPLACE FUNCTION public.aplicar_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _meu uuid := COALESCE(public.tenant_ativo(), public.tenant_padrao());
  _prov uuid;
BEGIN
  BEGIN
    _prov := NULLIF(current_setting('app.provisionando_tenant', true), '')::uuid;
  EXCEPTION WHEN others THEN _prov := NULL;
  END;
  IF _prov IS NOT NULL AND public.eh_super_admin(auth.uid()) THEN
    IF TG_OP = 'INSERT' THEN
      NEW.tenant_id := COALESCE(NEW.tenant_id, _prov);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NULL THEN
      NEW.tenant_id := COALESCE(NEW.tenant_id, _meu);
    ELSE
      NEW.tenant_id := _meu;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    RAISE EXCEPTION 'Acesso negado: não é permitido alterar a empresa do registro.' USING ERRCODE = '42501';
  END IF;

  -- O próprio perfil do usuário continua editável mesmo com outra empresa ativa.
  IF TG_TABLE_NAME = 'profiles' AND auth.uid() IS NOT NULL THEN
    IF to_jsonb(OLD)->>'id' = auth.uid()::text THEN
      RETURN NEW;
    END IF;
  END IF;

  IF auth.uid() IS NOT NULL AND OLD.tenant_id IS DISTINCT FROM _meu THEN
    RAISE EXCEPTION 'Acesso negado: registro pertence a outra empresa.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END
$fn$;