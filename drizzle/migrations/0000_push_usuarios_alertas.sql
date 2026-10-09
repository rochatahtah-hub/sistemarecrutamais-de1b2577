CREATE TABLE public.push_usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid,
  endpoint text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','cancelada','invalida')),
  mensagens jsonb NOT NULL DEFAULT '[]'::jsonb,
  mensagens_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.push_usuarios TO authenticated;
GRANT ALL ON public.push_usuarios TO service_role;
ALTER TABLE public.push_usuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY push_usuarios_select_own ON public.push_usuarios FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY push_usuarios_delete_own ON public.push_usuarios FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX idx_push_usuarios_user ON public.push_usuarios(user_id) WHERE status = 'ativa';

CREATE TABLE public.push_alertas_log (
  user_id uuid NOT NULL,
  tipo text NOT NULL,
  dia date NOT NULL,
  enviado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tipo, dia)
);
GRANT ALL ON public.push_alertas_log TO service_role;
ALTER TABLE public.push_alertas_log ENABLE ROW LEVEL SECURITY;

INSERT INTO public.cron_secrets (nome, valor)
VALUES ('alertas-push', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (nome) DO NOTHING;

DO $$
DECLARE _s text;
BEGIN
  SELECT valor INTO _s FROM public.cron_secrets WHERE nome = 'alertas-push';
  BEGIN PERFORM cron.unschedule('alertas-push'); EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM cron.schedule('alertas-push', '0 12-22 * * 1-6',
    'SELECT net.http_post(' ||
    'url := ''https://project--25dd2353-1a07-45dd-a593-d52eec73a397.lovable.app/api/public/hooks/alertas-push'', ' ||
    'headers := ' || quote_literal(jsonb_build_object('Content-Type','application/json','x-cron-secret',_s)::text) || '::jsonb, ' ||
    'body := jsonb_build_object()) as request_id;');
END $$;