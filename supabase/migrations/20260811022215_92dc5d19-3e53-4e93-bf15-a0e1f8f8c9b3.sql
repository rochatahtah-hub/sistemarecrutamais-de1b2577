ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

CREATE TABLE IF NOT EXISTS public.user_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  usuario_nome text NOT NULL DEFAULT '',
  login_at timestamptz NOT NULL DEFAULT now(),
  navegador text NOT NULL DEFAULT '',
  sistema_operacional text NOT NULL DEFAULT '',
  user_agent text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.user_access_logs TO authenticated;
GRANT ALL ON public.user_access_logs TO service_role;

ALTER TABLE public.user_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acessos_select_proprio" ON public.user_access_logs
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "acessos_select_admin" ON public.user_access_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "acessos_insert_proprio" ON public.user_access_logs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "acessos_delete_admin" ON public.user_access_logs
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_user_access_logs_login_at ON public.user_access_logs (login_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_access_logs_user ON public.user_access_logs (user_id, login_at DESC);

CREATE OR REPLACE FUNCTION public.registrar_acesso(_navegador text DEFAULT '', _sistema_operacional text DEFAULT '', _user_agent text DEFAULT '')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _nome text;
  _id uuid;
  _ultimo timestamptz;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'nao autenticado';
  END IF;

  SELECT coalesce(p.nome, 'Usuário'), p.last_login_at INTO _nome, _ultimo
  FROM public.profiles p WHERE p.id = _uid;
  _nome := coalesce(_nome, 'Usuário');

  INSERT INTO public.user_access_logs (user_id, usuario_nome, navegador, sistema_operacional, user_agent)
  VALUES (_uid, left(_nome, 160), left(coalesce(_navegador,''), 160), left(coalesce(_sistema_operacional,''), 160), left(coalesce(_user_agent,''), 1000))
  RETURNING id INTO _id;

  UPDATE public.profiles
     SET last_login_at = now(), ultimo_acesso = now()
   WHERE id = _uid;

  -- Notifica administradores no máximo uma vez a cada 15 minutos por usuário
  IF _ultimo IS NULL OR _ultimo < now() - interval '15 minutes' THEN
    INSERT INTO public.notificacoes (user_id, tipo, titulo, mensagem, para_admin, chave)
    VALUES (
      _uid, 'acesso', 'Novo acesso',
      format('Novo acesso: %s entrou no Recruta+ às %s.', _nome,
             to_char(timezone('America/Sao_Paulo', now()), 'HH24:MI')),
      true,
      format('acesso-%s-%s', _uid, to_char(timezone('America/Sao_Paulo', now()), 'YYYYMMDDHH24MI'))
    ) ON CONFLICT DO NOTHING;
  END IF;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_acesso(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_acesso(text, text, text) TO authenticated;