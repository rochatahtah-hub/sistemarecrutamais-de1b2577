DO $$
DECLARE t text; _padrao uuid := (SELECT id FROM public.tenants WHERE slug = 'operacao-atual');
BEGIN
  FOR t IN
    SELECT c.table_name FROM information_schema.columns c
    JOIN information_schema.tables tb ON tb.table_schema=c.table_schema AND tb.table_name=c.table_name AND tb.table_type='BASE TABLE'
    WHERE c.table_schema='public' AND c.column_name='tenant_id'
  LOOP
    EXECUTE format('UPDATE public.%I SET tenant_id = %L WHERE tenant_id IS NULL', t, _padrao);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET NOT NULL', t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _tenant uuid;
BEGIN
  -- Empresa vem do convite (metadados). Sem convite válido, usa a empresa padrão.
  BEGIN
    _tenant := NULLIF(NEW.raw_user_meta_data->>'tenant_id','')::uuid;
  EXCEPTION WHEN others THEN _tenant := NULL;
  END;
  IF _tenant IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = _tenant) THEN
    _tenant := NULL;
  END IF;
  _tenant := COALESCE(_tenant, public.tenant_padrao());

  INSERT INTO public.profiles (id, nome, email, tenant_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)), NEW.email, _tenant)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN (SELECT count(*) FROM public.user_roles WHERE role='admin') = 0 THEN 'admin'::public.app_role ELSE 'programadora'::public.app_role END)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $function$;