DROP INDEX IF EXISTS public.leads_comerciais_email_ativo_unico;
DROP INDEX IF EXISTS public.leads_comerciais_cnpj_unico;

CREATE UNIQUE INDEX leads_comerciais_email_ativo_unico
ON public.leads_comerciais (lower(btrim(email)))
WHERE status IN ('checkout_iniciado', 'pagamento_pendente', 'convertido');

CREATE UNIQUE INDEX leads_comerciais_cnpj_ativo_unico
ON public.leads_comerciais (regexp_replace(cnpj, '\D', '', 'g'))
WHERE cnpj IS NOT NULL
  AND regexp_replace(cnpj, '\D', '', 'g') <> ''
  AND status IN ('checkout_iniciado', 'pagamento_pendente', 'convertido');