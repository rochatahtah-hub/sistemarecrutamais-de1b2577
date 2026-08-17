CREATE TABLE IF NOT EXISTS public.tenant_contexto (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_contexto TO authenticated;
GRANT ALL ON public.tenant_contexto TO service_role;

ALTER TABLE public.tenant_contexto ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_contexto_select ON public.tenant_contexto;
CREATE POLICY tenant_contexto_select ON public.tenant_contexto
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS tenant_contexto_escrita ON public.tenant_contexto;
CREATE POLICY tenant_contexto_escrita ON public.tenant_contexto
  FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.eh_super_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() AND public.eh_super_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.tenant_ativo()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT c.tenant_id FROM public.tenant_contexto c
      WHERE c.user_id = auth.uid() AND public.eh_super_admin(auth.uid())),
    public.tenant_do_usuario(auth.uid())
  )
$function$;

REVOKE EXECUTE ON FUNCTION public.tenant_ativo() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tenant_ativo() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.tenant_atual()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.tenant_ativo()
$function$;

CREATE OR REPLACE FUNCTION public.acesso_tenant(_tenant uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT _tenant IS NOT NULL AND _tenant = public.tenant_ativo()
$function$;

CREATE OR REPLACE FUNCTION public.tenant_do_portal()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(public.tenant_ativo(), public.tenant_padrao())
$function$;

CREATE OR REPLACE FUNCTION public.aplicar_tenant()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _meu uuid := COALESCE(public.tenant_ativo(), public.tenant_padrao());
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NULL THEN
      NEW.tenant_id := COALESCE(NEW.tenant_id, _meu);
    ELSE
      NEW.tenant_id := _meu;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    RAISE EXCEPTION 'Acesso negado: não é permitido alterar a empresa do registro.' USING ERRCODE = '42501';
  END IF;
  IF auth.uid() IS NOT NULL AND OLD.tenant_id IS DISTINCT FROM _meu THEN
    RAISE EXCEPTION 'Acesso negado: registro pertence a outra empresa.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $function$;

-- cada pessoa sempre consegue ler/atualizar o próprio cadastro
DROP POLICY IF EXISTS profiles_isolamento_tenant ON public.profiles;
CREATE POLICY profiles_isolamento_tenant ON public.profiles
  AS RESTRICTIVE FOR ALL
  USING (public.acesso_tenant(tenant_id) OR id = auth.uid())
  WITH CHECK (public.acesso_tenant(tenant_id) OR id = auth.uid());

-- auditoria da troca de empresa
CREATE OR REPLACE FUNCTION public.registrar_troca_tenant()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _nome text; _de text; _para text;
BEGIN
  SELECT COALESCE(p.nome, 'Sistema') INTO _nome FROM public.profiles p WHERE p.id = auth.uid();
  SELECT t.nome INTO _para FROM public.tenants t WHERE t.id = NEW.tenant_id;
  IF TG_OP = 'UPDATE' THEN
    SELECT t.nome INTO _de FROM public.tenants t WHERE t.id = OLD.tenant_id;
  END IF;
  INSERT INTO public.auditoria (tabela, registro_id, acao, descricao, campo, valor_anterior, valor_novo, usuario_id, usuario_nome, tenant_id)
  VALUES ('tenant_contexto', NEW.tenant_id, 'TROCA_EMPRESA', 'Troca de empresa ativa', 'tenant_id',
          COALESCE(_de, ''), COALESCE(_para, ''), auth.uid(), COALESCE(_nome, 'Sistema'), NEW.tenant_id);
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_troca_tenant ON public.tenant_contexto;
CREATE TRIGGER trg_troca_tenant AFTER INSERT OR UPDATE ON public.tenant_contexto
  FOR EACH ROW EXECUTE FUNCTION public.registrar_troca_tenant();

DROP TRIGGER IF EXISTS trg_tenant_contexto_updated ON public.tenant_contexto;
CREATE TRIGGER trg_tenant_contexto_updated BEFORE UPDATE ON public.tenant_contexto
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();