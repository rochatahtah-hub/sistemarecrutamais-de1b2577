CREATE OR REPLACE FUNCTION public.tenant_ativo_para_captacao(_tenant uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = _tenant AND t.ativo AND t.status = 'ativo'
  )
$function$;

REVOKE EXECUTE ON FUNCTION public.tenant_ativo_para_captacao(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tenant_ativo_para_captacao(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Portal publico apenas cadastra" ON public.daily_workers;
CREATE POLICY "Portal publico apenas cadastra"
ON public.daily_workers FOR INSERT TO anon
WITH CHECK (
  consent_accepted
  AND status = 'novo'
  AND public.tenant_ativo_para_captacao(tenant_id)
);