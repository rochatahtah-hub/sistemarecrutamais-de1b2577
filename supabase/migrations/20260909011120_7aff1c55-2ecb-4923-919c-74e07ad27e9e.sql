CREATE OR REPLACE FUNCTION public.registrar_falha_pin()
RETURNS TABLE(falhas integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.admin_pin
     SET falhas = admin_pin.falhas + 1, updated_at = now()
   WHERE id = true
  RETURNING admin_pin.falhas;
$$;

REVOKE ALL ON FUNCTION public.registrar_falha_pin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_falha_pin() TO service_role;