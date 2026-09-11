CREATE UNIQUE INDEX IF NOT EXISTS leads_comerciais_email_ativo_unico
ON public.leads_comerciais (lower(btrim(email)))
WHERE status IN ('checkout_iniciado', 'pagamento_pendente', 'convertido');

CREATE OR REPLACE FUNCTION public.acesso_tenant(_tenant uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT _tenant IS NOT NULL
     AND _tenant = public.tenant_ativo()
     AND (
       public.eh_super_admin(auth.uid())
       OR EXISTS (
         SELECT 1
         FROM public.tenants t
         WHERE t.id = _tenant
           AND t.ativo
           AND t.status = 'ativo'
           AND (
             t.origem_comercial <> 'leads'
             OR t.isento_comercial
             OR t.assinatura_status = 'ativa'
           )
       )
     )
$function$;

REVOKE ALL ON FUNCTION public.acesso_tenant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acesso_tenant(uuid) TO authenticated, service_role;