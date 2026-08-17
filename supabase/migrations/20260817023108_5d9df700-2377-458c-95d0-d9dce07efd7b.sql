CREATE OR REPLACE FUNCTION public.programadoras_da_programacao()
RETURNS TABLE(id uuid, nome text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p.id, p.nome
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.ativo
    -- precisa ser programadora (papel atribuído ou perfil de acesso "programadora")
    AND (
      EXISTS (SELECT 1 FROM public.user_roles r
               WHERE r.user_id = p.id AND r.role = 'programadora'::public.app_role)
      OR EXISTS (SELECT 1 FROM public.perfis_acesso pa
                  WHERE pa.id = p.perfil_id AND pa.chave = 'programadora')
    )
    -- permissão efetiva de "Minha Programação" (sem o atalho de master)
    AND COALESCE(
      (SELECT u.permitido FROM public.permissoes_usuario u
        WHERE u.user_id = p.id AND u.modulo = 'programacao' AND u.acao = 'visualizar'),
      (SELECT pp.permitido FROM public.perfil_permissoes pp
        WHERE pp.perfil_id = public.perfil_do_usuario(p.id)
          AND pp.modulo = 'programacao' AND pp.acao = 'visualizar'),
      false)
  ORDER BY p.nome
$function$;

REVOKE ALL ON FUNCTION public.programadoras_da_programacao() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.programadoras_da_programacao() TO authenticated, service_role;