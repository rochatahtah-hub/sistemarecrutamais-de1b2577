CREATE OR REPLACE FUNCTION public.tenant_do_portal()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(public.tenant_do_usuario(auth.uid()), public.tenant_padrao())
$function$;

REVOKE EXECUTE ON FUNCTION public.tenant_do_portal() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tenant_do_portal() TO anon, authenticated, service_role;

ALTER TABLE public.daily_workers ALTER COLUMN tenant_id SET DEFAULT public.tenant_do_portal();