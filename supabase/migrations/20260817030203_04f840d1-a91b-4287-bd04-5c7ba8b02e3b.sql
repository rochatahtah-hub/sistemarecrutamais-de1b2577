-- 1. CEO / SUPER ADMIN GLOBAL
INSERT INTO public.super_admins (user_id, observacao)
SELECT u.id, 'CEO / SUPER ADMIN DO RECRUTA+ (acesso global)'
FROM auth.users u WHERE u.email = 'rochatahtah@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET observacao = EXCLUDED.observacao;

-- 2. eh_master permanece estritamente por tenant: nunca concede acesso global
CREATE OR REPLACE FUNCTION public.eh_master(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  -- master é sempre limitado ao próprio tenant; acesso global só via eh_super_admin()
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND master AND ativo)
$$;

-- 3. Correção de segurança: leitura de perfis restrita a si, mesmo tenant ou super admin
DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR public.eh_super_admin(auth.uid())
  OR tenant_id IS NOT DISTINCT FROM public.tenant_do_usuario(auth.uid())
);

-- 4. Auditoria da alteração
INSERT INTO public.auditoria (tabela, registro_id, acao, descricao, campo, valor_anterior, valor_novo, usuario_id, usuario_nome, tenant_id)
SELECT 'super_admins', u.id, 'UPDATE', 'Registro de CEO / Super Admin global do Recruta+', 'super_admin', 'false', 'true', u.id, COALESCE(p.nome,'CEO'), p.tenant_id
FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'rochatahtah@gmail.com';