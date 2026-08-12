REVOKE EXECUTE ON FUNCTION public.eh_master(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.perfil_do_usuario(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.tem_permissao(uuid, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.minhas_permissoes() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.eh_master(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.perfil_do_usuario(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.tem_permissao(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.minhas_permissoes() TO authenticated, service_role;