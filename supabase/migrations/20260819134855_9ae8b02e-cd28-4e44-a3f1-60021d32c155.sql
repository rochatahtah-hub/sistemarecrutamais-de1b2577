-- Cadastro público não depende mais de funções do banco chamáveis por visitantes.
DROP POLICY IF EXISTS "daily_workers_isolamento_publico" ON public.daily_workers;
DROP POLICY IF EXISTS "Portal publico apenas cadastra" ON public.daily_workers;

CREATE POLICY "Portal publico apenas cadastra"
ON public.daily_workers FOR INSERT TO anon
WITH CHECK (consent_accepted AND status = 'novo' AND tenant_id IS NOT NULL);

-- O gatilho validar_tenant_publico_diaria (SECURITY DEFINER, sem EXECUTE para anon)
-- continua garantindo que o cadastro só ocorre em empresa ativa.

REVOKE EXECUTE ON FUNCTION public.tenant_publico(text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tenant_ativo_para_captacao(uuid) FROM anon, PUBLIC;