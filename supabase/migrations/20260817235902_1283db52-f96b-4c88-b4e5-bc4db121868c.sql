-- 1. Remove privilégios perigosos e desnecessários de visitantes e usuários logados.
DO $$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT c.relname FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  LOOP
    -- TRUNCATE/TRIGGER/REFERENCES/MAINTAIN ignoram RLS: ninguém além do serviço deve tê-los.
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t.relname);
    EXECUTE format('REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.%I FROM authenticated', t.relname);
  END LOOP;
END $$;

-- 2. Tabelas sem nenhuma política (uso exclusivo do servidor) ficam fechadas também para logados.
REVOKE ALL ON public.admin_pin FROM authenticated;
REVOKE ALL ON public.cron_secrets FROM authenticated;
REVOKE ALL ON public.super_admins FROM authenticated;
REVOKE ALL ON public.app_user_connections FROM authenticated;

-- 3. Único acesso público mantido: envio do cadastro pelo link de captação.
GRANT INSERT ON public.daily_workers TO anon;

-- 4. Funções de gatilho e internas deixam de ser executáveis por visitantes/logados.
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prorettype = 'trigger'::regtype
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
  END LOOP;
END $$;

-- 5. Visitante só pode usar as funções do link público de captação.
REVOKE ALL ON FUNCTION public.tenant_ativo() FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.tenant_do_portal() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.tenant_ativo() TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_do_portal() TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_publico(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_ativo_para_captacao(uuid) TO anon, authenticated;