DO $$
DECLARE
  _tenant_id uuid;
BEGIN
  SELECT id INTO _tenant_id
  FROM public.tenants
  WHERE slug = 'operacao-atual';

  IF _tenant_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.tenants
      WHERE slug = 'agizze-rh' AND id <> _tenant_id
    ) THEN
      RAISE EXCEPTION 'O identificador público agizze-rh já pertence a outra empresa.';
    END IF;

    UPDATE public.tenants
    SET slug = 'agizze-rh', updated_at = now()
    WHERE id = _tenant_id;
  END IF;
END
$$;

GRANT INSERT ON public.daily_workers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_workers TO authenticated;
GRANT ALL ON public.daily_workers TO service_role;