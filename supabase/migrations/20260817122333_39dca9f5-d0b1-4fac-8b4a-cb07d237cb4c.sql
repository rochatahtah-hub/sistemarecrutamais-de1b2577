DROP INDEX IF EXISTS public.rs_candidatos_cpf_uniq;
CREATE UNIQUE INDEX rs_candidatos_tenant_cpf_uidx ON public.rs_candidatos (tenant_id, cpf) WHERE cpf <> '';

ALTER TABLE public.alertas_operacao DROP CONSTRAINT IF EXISTS alertas_operacao_chave_key;
DROP INDEX IF EXISTS public.alertas_operacao_chave_key;
CREATE UNIQUE INDEX alertas_operacao_tenant_chave_uidx ON public.alertas_operacao (tenant_id, chave);

ALTER TABLE public.notificacoes DROP CONSTRAINT IF EXISTS notificacoes_user_id_chave_key;
DROP INDEX IF EXISTS public.notificacoes_user_id_chave_key;
CREATE UNIQUE INDEX notificacoes_tenant_user_chave_uidx ON public.notificacoes (tenant_id, user_id, chave);