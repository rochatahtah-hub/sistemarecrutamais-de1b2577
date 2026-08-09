CREATE TABLE public.erros_sistema (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  pagina text NOT NULL DEFAULT '',
  componente text NOT NULL DEFAULT '',
  operacao text NOT NULL DEFAULT '',
  endpoint text NOT NULL DEFAULT '',
  codigo_http integer,
  categoria text NOT NULL DEFAULT 'frontend' CHECK (categoria IN ('frontend','autenticacao','banco','api')),
  mensagem text NOT NULL,
  stack text,
  navegador text NOT NULL DEFAULT '',
  sistema_operacional text NOT NULL DEFAULT '',
  user_agent text NOT NULL DEFAULT '',
  ocorrencias integer NOT NULL DEFAULT 1 CHECK (ocorrencias > 0),
  primeira_ocorrencia timestamptz NOT NULL DEFAULT now(),
  ultima_ocorrencia timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fingerprint, user_id)
);
GRANT INSERT ON public.erros_sistema TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.erros_sistema TO authenticated;
GRANT ALL ON public.erros_sistema TO service_role;
ALTER TABLE public.erros_sistema ENABLE ROW LEVEL SECURITY;
CREATE POLICY "erros_sistema_insert_authenticated" ON public.erros_sistema FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "erros_sistema_admin_select" ON public.erros_sistema FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "erros_sistema_admin_update" ON public.erros_sistema FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "erros_sistema_admin_delete" ON public.erros_sistema FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX erros_sistema_ultima_idx ON public.erros_sistema (ultima_ocorrencia DESC);
CREATE INDEX erros_sistema_status_idx ON public.erros_sistema (codigo_http, ultima_ocorrencia DESC);
CREATE INDEX erros_sistema_componente_idx ON public.erros_sistema (componente, ultima_ocorrencia DESC);
CREATE TRIGGER trg_erros_sistema_updated BEFORE UPDATE ON public.erros_sistema FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.registrar_erro_sistema(
  _fingerprint text,
  _pagina text,
  _componente text,
  _operacao text,
  _endpoint text,
  _codigo_http integer,
  _categoria text,
  _mensagem text,
  _stack text,
  _navegador text,
  _sistema_operacional text,
  _user_agent text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _id uuid;
  _ocorrencias integer;
BEGIN
  INSERT INTO public.erros_sistema (
    fingerprint, user_id, pagina, componente, operacao, endpoint, codigo_http,
    categoria, mensagem, stack, navegador, sistema_operacional, user_agent
  ) VALUES (
    left(_fingerprint, 160), auth.uid(), left(coalesce(_pagina,''), 500),
    left(coalesce(_componente,''), 160), left(coalesce(_operacao,''), 160),
    left(coalesce(_endpoint,''), 500), _codigo_http,
    CASE WHEN _categoria IN ('frontend','autenticacao','banco','api') THEN _categoria ELSE 'frontend' END,
    left(coalesce(_mensagem,'Erro desconhecido'), 2000), left(coalesce(_stack,''), 8000),
    left(coalesce(_navegador,''), 160), left(coalesce(_sistema_operacional,''), 160),
    left(coalesce(_user_agent,''), 1000)
  )
  ON CONFLICT (fingerprint, user_id) DO UPDATE SET
    ocorrencias = public.erros_sistema.ocorrencias + 1,
    ultima_ocorrencia = now(),
    pagina = EXCLUDED.pagina,
    componente = EXCLUDED.componente,
    operacao = EXCLUDED.operacao,
    endpoint = EXCLUDED.endpoint,
    codigo_http = EXCLUDED.codigo_http,
    categoria = EXCLUDED.categoria,
    mensagem = EXCLUDED.mensagem,
    stack = EXCLUDED.stack,
    navegador = EXCLUDED.navegador,
    sistema_operacional = EXCLUDED.sistema_operacional,
    user_agent = EXCLUDED.user_agent
  RETURNING id, ocorrencias INTO _id, _ocorrencias;

  IF _ocorrencias IN (5, 10, 25, 50, 100) THEN
    INSERT INTO public.notificacoes (user_id, tipo, titulo, mensagem, para_admin, chave)
    VALUES (
      auth.uid(), 'saude-sistema', 'Aumento de erros no sistema',
      format('A falha em %s atingiu %s ocorrências: %s', coalesce(nullif(_componente,''), _pagina), _ocorrencias, left(_mensagem, 180)),
      true, format('saude-%s-%s', left(_fingerprint, 80), _ocorrencias)
    ) ON CONFLICT DO NOTHING;
  END IF;
  RETURN _id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.registrar_erro_sistema(text,text,text,text,text,integer,text,text,text,text,text,text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.registrar_erro_sistema(text,text,text,text,text,integer,text,text,text,text,text,text) FROM anon;

CREATE OR REPLACE FUNCTION public.resumo_saude_sistema()
RETURNS TABLE(categoria text, codigo_http integer, componente text, endpoint text, ocorrencias bigint, ultima_ocorrencia timestamptz)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT e.categoria, e.codigo_http, e.componente, e.endpoint,
         sum(e.ocorrencias)::bigint, max(e.ultima_ocorrencia)
  FROM public.erros_sistema e
  WHERE public.has_role(auth.uid(), 'admin')
  GROUP BY e.categoria, e.codigo_http, e.componente, e.endpoint
  ORDER BY sum(e.ocorrencias) DESC, max(e.ultima_ocorrencia) DESC;
$$;
GRANT EXECUTE ON FUNCTION public.resumo_saude_sistema() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.resumo_saude_sistema() FROM anon;