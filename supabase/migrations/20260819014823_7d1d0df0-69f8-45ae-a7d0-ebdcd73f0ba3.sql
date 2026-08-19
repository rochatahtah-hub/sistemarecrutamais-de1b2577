CREATE OR REPLACE FUNCTION public.notificar_novo_colaborador_diaria()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notificacoes (
    user_id, tipo, titulo, mensagem, para_admin, chave, tenant_id
  )
  VALUES (
    NULL,
    'banco-colaboradores',
    'Novo colaborador cadastrado',
    format('%s se cadastrou para oportunidades de diária.', NEW.full_name),
    true,
    format('diaria-%s', NEW.id),
    NEW.tenant_id
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END
$function$;

REVOKE ALL ON FUNCTION public.notificar_novo_colaborador_diaria() FROM PUBLIC, anon, authenticated;