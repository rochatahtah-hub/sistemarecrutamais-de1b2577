CREATE TABLE public.alertas_operacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  nivel text NOT NULL DEFAULT 'amarelo',
  titulo text NOT NULL,
  detalhe text NOT NULL DEFAULT '',
  itens jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pendente',
  observacao text NOT NULL DEFAULT '',
  resolvido_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolvido_por_nome text NOT NULL DEFAULT '',
  resolvido_em timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alertas_operacao TO authenticated;
GRANT ALL ON public.alertas_operacao TO service_role;

ALTER TABLE public.alertas_operacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY alertas_operacao_select ON public.alertas_operacao
  FOR SELECT TO authenticated USING (true);
CREATE POLICY alertas_operacao_insert ON public.alertas_operacao
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY alertas_operacao_update ON public.alertas_operacao
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY alertas_operacao_delete ON public.alertas_operacao
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_alertas_operacao_updated
  BEFORE UPDATE ON public.alertas_operacao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();