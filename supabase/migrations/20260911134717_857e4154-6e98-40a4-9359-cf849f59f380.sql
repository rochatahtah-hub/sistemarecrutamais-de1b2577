ALTER TABLE public.planos
  ADD COLUMN IF NOT EXISTS preco_mensal_centavos integer NOT NULL DEFAULT 0 CHECK (preco_mensal_centavos >= 0),
  ADD COLUMN IF NOT EXISTS periodicidade text NOT NULL DEFAULT 'mensal' CHECK (periodicidade IN ('mensal')),
  ADD COLUMN IF NOT EXISTS recursos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ordem integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS publico boolean NOT NULL DEFAULT false;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS origem_comercial text NOT NULL DEFAULT 'existente' CHECK (origem_comercial IN ('existente', 'leads')),
  ADD COLUMN IF NOT EXISTS isento_comercial boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS assinatura_status text NOT NULL DEFAULT 'isento' CHECK (assinatura_status IN ('isento', 'pendente', 'ativa', 'inadimplente', 'cancelada'));

COMMENT ON COLUMN public.tenants.isento_comercial IS 'Empresas existentes permanecem fora da cobrança. AGIZZE é protegida também por UUID no backend.';

CREATE TABLE public.leads_comerciais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_nome text NOT NULL,
  responsavel_nome text NOT NULL,
  email text NOT NULL,
  telefone text NOT NULL DEFAULT '',
  cnpj text,
  status text NOT NULL DEFAULT 'novo' CHECK (status IN ('novo', 'checkout_iniciado', 'pagamento_pendente', 'convertido', 'perdido')),
  origem text NOT NULL DEFAULT 'pagina_publica',
  plano_interesse_id uuid REFERENCES public.planos(id),
  convertido_tenant_id uuid REFERENCES public.tenants(id),
  observacao text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.leads_comerciais TO service_role;
ALTER TABLE public.leads_comerciais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins gerenciam leads comerciais" ON public.leads_comerciais FOR ALL TO authenticated
  USING (public.eh_super_admin(auth.uid())) WITH CHECK (public.eh_super_admin(auth.uid()));
CREATE UNIQUE INDEX leads_comerciais_cnpj_unico ON public.leads_comerciais (regexp_replace(cnpj, '\D', '', 'g')) WHERE cnpj IS NOT NULL AND regexp_replace(cnpj, '\D', '', 'g') <> '' AND status <> 'perdido';

CREATE TABLE public.pedidos_comerciais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads_comerciais(id),
  plano_id uuid NOT NULL REFERENCES public.planos(id),
  referencia text NOT NULL UNIQUE,
  valor_centavos integer NOT NULL CHECK (valor_centavos > 0),
  moeda text NOT NULL DEFAULT 'BRL' CHECK (moeda = 'BRL'),
  forma_pagamento text NOT NULL CHECK (forma_pagamento IN ('pix', 'cartao')),
  status text NOT NULL DEFAULT 'criado' CHECK (status IN ('criado', 'aguardando_pagamento', 'aprovado', 'recusado', 'cancelado', 'estornado')),
  provedor text NOT NULL DEFAULT 'mercado_pago' CHECK (provedor = 'mercado_pago'),
  provedor_checkout_id text,
  checkout_url text,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.pedidos_comerciais TO service_role;
ALTER TABLE public.pedidos_comerciais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins gerenciam pedidos comerciais" ON public.pedidos_comerciais FOR ALL TO authenticated
  USING (public.eh_super_admin(auth.uid())) WITH CHECK (public.eh_super_admin(auth.uid()));

CREATE TABLE public.pagamentos_comerciais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos_comerciais(id),
  tenant_id uuid REFERENCES public.tenants(id),
  provedor text NOT NULL DEFAULT 'mercado_pago' CHECK (provedor = 'mercado_pago'),
  provedor_pagamento_id text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  valor_centavos integer NOT NULL CHECK (valor_centavos > 0),
  moeda text NOT NULL DEFAULT 'BRL' CHECK (moeda = 'BRL'),
  forma_pagamento text NOT NULL CHECK (forma_pagamento IN ('pix', 'cartao')),
  status text NOT NULL,
  pago_em timestamptz,
  dados_seguros jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provedor, provedor_pagamento_id)
);
GRANT ALL ON public.pagamentos_comerciais TO service_role;
ALTER TABLE public.pagamentos_comerciais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins gerenciam pagamentos comerciais" ON public.pagamentos_comerciais FOR ALL TO authenticated
  USING (public.eh_super_admin(auth.uid())) WITH CHECK (public.eh_super_admin(auth.uid()));

CREATE TABLE public.assinaturas_comerciais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id),
  pedido_id uuid NOT NULL UNIQUE REFERENCES public.pedidos_comerciais(id),
  plano_id uuid NOT NULL REFERENCES public.planos(id),
  provedor text NOT NULL DEFAULT 'mercado_pago' CHECK (provedor = 'mercado_pago'),
  provedor_assinatura_id text UNIQUE,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'ativa', 'inadimplente', 'pausada', 'cancelada')),
  periodo_inicio timestamptz,
  periodo_fim timestamptz,
  proxima_cobranca_em timestamptz,
  cancelada_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.assinaturas_comerciais TO service_role;
ALTER TABLE public.assinaturas_comerciais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins gerenciam assinaturas comerciais" ON public.assinaturas_comerciais FOR ALL TO authenticated
  USING (public.eh_super_admin(auth.uid())) WITH CHECK (public.eh_super_admin(auth.uid()));

CREATE TABLE public.webhook_eventos_comerciais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provedor text NOT NULL DEFAULT 'mercado_pago' CHECK (provedor = 'mercado_pago'),
  evento_chave text NOT NULL,
  tipo text NOT NULL,
  status_processamento text NOT NULL DEFAULT 'recebido' CHECK (status_processamento IN ('recebido', 'processado', 'ignorado', 'erro')),
  payload_minimo jsonb NOT NULL DEFAULT '{}'::jsonb,
  erro text NOT NULL DEFAULT '',
  recebido_em timestamptz NOT NULL DEFAULT now(),
  processado_em timestamptz,
  UNIQUE (provedor, evento_chave)
);
GRANT ALL ON public.webhook_eventos_comerciais TO service_role;
ALTER TABLE public.webhook_eventos_comerciais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins consultam eventos comerciais" ON public.webhook_eventos_comerciais FOR SELECT TO authenticated
  USING (public.eh_super_admin(auth.uid()));

CREATE TABLE public.liberacoes_cadastro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL UNIQUE REFERENCES public.pedidos_comerciais(id),
  token_hash text NOT NULL UNIQUE,
  expira_em timestamptz NOT NULL,
  usado_em timestamptz,
  tenant_id uuid UNIQUE REFERENCES public.tenants(id),
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.liberacoes_cadastro TO service_role;
ALTER TABLE public.liberacoes_cadastro ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins consultam liberacoes comerciais" ON public.liberacoes_cadastro FOR SELECT TO authenticated
  USING (public.eh_super_admin(auth.uid()));

CREATE TRIGGER atualizar_leads_comerciais BEFORE UPDATE ON public.leads_comerciais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER atualizar_pedidos_comerciais BEFORE UPDATE ON public.pedidos_comerciais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER atualizar_pagamentos_comerciais BEFORE UPDATE ON public.pagamentos_comerciais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER atualizar_assinaturas_comerciais BEFORE UPDATE ON public.assinaturas_comerciais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER atualizar_liberacoes_cadastro BEFORE UPDATE ON public.liberacoes_cadastro FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.proteger_agizze_comercial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.id = 'e060a2ca-f718-49b5-bf59-ec43c040336e'::uuid AND (
    NEW.origem_comercial <> 'existente' OR
    NEW.isento_comercial IS DISTINCT FROM true OR
    NEW.assinatura_status <> 'isento'
  ) THEN
    RAISE EXCEPTION 'A empresa operacional existente não pode entrar no fluxo comercial.';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.proteger_agizze_comercial() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.proteger_agizze_comercial() TO service_role;
CREATE TRIGGER proteger_agizze_comercial BEFORE INSERT OR UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.proteger_agizze_comercial();

CREATE OR REPLACE FUNCTION public.eh_super_admin_atual()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT public.eh_super_admin(auth.uid()) $$;
REVOKE ALL ON FUNCTION public.eh_super_admin_atual() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eh_super_admin_atual() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.bloquear_exclusao_agizze()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.id = 'e060a2ca-f718-49b5-bf59-ec43c040336e'::uuid THEN
    RAISE EXCEPTION 'A empresa operacional existente não pode ser excluída.';
  END IF;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.bloquear_exclusao_agizze() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bloquear_exclusao_agizze() TO service_role;
CREATE TRIGGER bloquear_exclusao_agizze BEFORE DELETE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.bloquear_exclusao_agizze();